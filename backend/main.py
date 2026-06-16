import os
import logging
import json
import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import FastAPI, HTTPException, status, Header, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import custom schemas and service
from schemas.advice import (
    FinancialInput,
    AdviceResponse,
    ChatRequest,
    UserRegister,
    UserLogin,
    TokenResponse
)
from services.gemini import get_financial_advice, get_chat_response
from services.auth import (
    hash_password, verify_password, create_jwt_token, verify_jwt_token,
    get_user_by_username, register_new_user, authenticate_user
)
from services.document_parser import parse_document
from services.db import init_db, get_db
from services.rag import init_rag_system

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ai-banking-backend")

# Load environment variables
load_dotenv()

# Initialize FastAPI App
app = FastAPI(
    title="AI Banking Personalized Financial Advice API",
    description="A generative AI service using Google Gemini to construct custom, data-backed budgeting and investment advice with JWT authentication.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Initializing relational SQLite database...")
    init_db()
    logger.info("Initializing vector database and RAG system...")
    try:
        init_rag_system()
    except Exception as e:
        logger.error(f"Failed to initialize RAG collection at startup: {e}")

    logger.info("Listing all registered API routes:")
    for route in app.routes:
        methods = getattr(route, "methods", None)
        methods_str = f"[{', '.join(methods)}]" if methods else ""
        logger.info(f"  Route: {methods_str} {route.path} -> {route.name}")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Shutting down backend and releasing database locks...")
    try:
        from services.rag import get_qdrant_client
        get_qdrant_client().close()
        logger.info("Successfully released Qdrant vector database lock.")
    except Exception as e:
        logger.error(f"Error closing Qdrant connection: {e}")

# Helper to verify authenticated user
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in."
        )
    token = authorization.split(" ")[1]
    user = verify_jwt_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please sign in again."
        )
    return user

# Helper to save user advice logs to audit history
def save_to_history(db: Session, username: str, payload: FinancialInput, advice: AdviceResponse):
    from services.db import Report, Document
    user_db = get_user_by_username(db, username)
    if not user_db: return

    latest_doc = db.query(Document).filter(Document.user_id == user_db.id).order_by(Document.uploaded_at.desc()).first()
    doc_id = latest_doc.id if latest_doc else None

    recommendations = {
        "budgeting": advice.budgeting_advice,
        "savings": advice.savings_recommendation,
        "investment": advice.investment_suggestion,
        "emergency_fund": advice.emergency_fund_recommendation
    }

    report = Report(
        user_id=user_db.id,
        document_id=doc_id,
        summary=advice.personalized_summary,
        reasoning=advice.spending_analysis,
        recommendations=json.dumps(recommendations),
        risk_score=75.0,
        confidence_score=90.0,
        timeline=json.dumps([{"event": "Analyzed Finances", "date": datetime.datetime.now().isoformat()}])
    )
    db.add(report)
    db.commit()

# ==================== HEALTH ====================

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """Simple endpoint to verify backend status and environment configuration."""
    api_key_configured = bool(os.getenv("OPENROUTER_API_KEY"))
    return {
        "status": "healthy",
        "gemini_api_configured": api_key_configured,
        "primary_model": os.getenv("PRIMARY_MODEL") or os.getenv("OPENROUTER_MODEL") or "Qwen3-30B-A3B"
    }

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user, hashes password, and saves credentials to SQLite database."""
    user = get_user_by_username(db, payload.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another or sign in."
        )
    try:
        new_user = register_new_user(db, payload.username, payload.name, payload.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}"
        )
    token = create_jwt_token(new_user.username, new_user.name)
    return {
        "access_token": token,
        "name": new_user.name,
        "username": new_user.username
    }

@app.post("/auth/login", response_model=TokenResponse, status_code=status.HTTP_200_OK, tags=["Auth"])
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials against SQLite and returns a session JWT token."""
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please try again."
        )
    token = create_jwt_token(user.username, user.name)
    return {
        "access_token": token,
        "name": user.name,
        "username": user.username
    }

# ==================== PERSONAL FINANCIAL ADVICE ====================

@app.post(
    "/generate-advice",
    response_model=AdviceResponse,
    status_code=status.HTTP_200_OK,
    tags=["Financial Advice"]
)
def generate_advice(payload: FinancialInput, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Accepts user spending habits, runs calculations,
    and calls Google Gemini to return a structured JSON report.
    """
    user = get_current_user(authorization)
    logger.info(f"Received request for personalized financial advice from user: {user['sub']}")

    total_expenses = (
        payload.rent_expense +
        payload.food_expense +
        payload.shopping_expense +
        payload.travel_expense +
        payload.entertainment_expense
    )
    if total_expenses > payload.monthly_income * 2:
        logger.warning(f"User {user['sub']} monthly expenses are extremely high compared to income.")

    try:
        advice = get_financial_advice(payload)
        logger.info("Successfully generated personalized financial advice.")
        save_to_history(db, user["sub"], payload, advice)
        return advice
    except ValueError as ve:
        logger.error(f"Configuration error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Unexpected server error during advice generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate advice: {str(e)}"
        )

@app.get("/history", tags=["Financial Advice"])
def get_advice_history(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Reads and returns all historical advice reports matching the authenticated user's session."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        return []

    from services.db import Report
    reports = db.query(Report).filter(Report.user_id == user_db.id).order_by(Report.generated_at.desc()).all()

    res = []
    for r in reports:
        res.append({
            "id": r.id,
            "filename": r.document.filename if r.document else "Manual Input",
            "upload_date": r.document.uploaded_at.isoformat() if r.document else r.generated_at.isoformat(),
            "generated_at": r.generated_at.isoformat(),
            "risk_score": r.risk_score,
            "confidence_score": r.confidence_score,
            "summary": r.summary,
            "timeline": json.loads(r.timeline) if r.timeline else []
        })
    return res

@app.delete("/history/{report_id}", tags=["Financial Advice"])
def delete_advice_report(report_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Deletes a historical advice report matching the user's account."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import Report
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == user_db.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    db.delete(report)
    db.commit()
    return {"status": "success", "message": "Report deleted successfully"}

@app.post("/history/populate-samples", tags=["Financial Advice"])
def populate_sample_history(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Populates database with realistic sample reports, stress simulations, and courtroom debates."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import Report, Simulation, AgentDeliberation
    import datetime
    
    # 1. Add a sample advice report
    sample_report = Report(
        user_id=user_db.id,
        summary="Sample Wealth Report: High liquidity profile with 28% savings ratio. The model recommends allocating 40% to equity index mutual funds and establishing a 6-month capital buffer.",
        reasoning="Categorical expenditures are moderate with housing at 27% and dining at 11%. Major risk is cash drag due to high capital in low-yield deposit accounts.",
        confidence_score=95.0,
        risk_score=42.0,
        recommendations=json.dumps({
            "budgeting": "Adopt the 50-30-20 framework. Limit shopping outflows to 10% of monthly net income.",
            "savings": "Establish a target emergency savings allocation of ₹1,50,000.",
            "investment": "Transition ₹25,000 monthly into diversified index funds and low-cost exchange-traded funds (ETFs)."
        }),
        timeline=json.dumps([
            {"event": "Statement Uploaded", "date": (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()},
            {"event": "Categorization Audit", "date": (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()},
            {"event": "Advisory Generated", "date": (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()}
        ]),
        generated_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    db.add(sample_report)
    
    # 2. Add a sample stress simulation run
    sample_sim = Simulation(
        user_id=user_db.id,
        name="Stress Test: Market Crash Simulation",
        parameters=json.dumps({
            "monthly_income": 65000.0,
            "necessities_expense": 25000.0,
            "discretionary_expense": 15000.0,
            "current_savings": 100000.0,
            "target_goal": 250000.0,
            "timeline_months": 12,
            "discretionary_reduction_pct": 20.0,
            "sip_addition": 5000.0,
            "market_return_type": "balanced",
            "inflation_rate_annual": 6.5,
            "shock_event": "market_crash"
        }),
        results=json.dumps({
            "labels": [f"Month {m}" for m in range(13)],
            "pessimistic": [100000, 95000, 92000, 90000, 93000, 97000, 102000, 108000, 115000, 122000, 130000, 138000, 145000],
            "median": [100000, 101000, 104000, 107000, 112000, 118000, 126000, 135000, 146000, 158000, 172000, 188000, 205000],
            "optimistic": [100000, 108000, 115000, 124000, 135000, 148000, 163000, 180000, 200000, 222000, 248000, 278000, 312000],
            "metrics": {
                "goal_achieved_month": -1,
                "ending_balance": 205000.0,
                "total_invested": 360000.0,
                "estimated_returns": 45000.0,
                "resilience_status": "Medium Resilience"
            },
            "advisory_summary": "Under a market crash shock event, your final balance (₹2,05,000) falls short of the ₹2,50,000 target. Consider extending the timeline by 3 months or increasing your SIP contribution by ₹3,500/month."
        }),
        simulated_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
    )
    db.add(sample_sim)
    
    primary_model = os.getenv("PRIMARY_MODEL") or os.getenv("OPENROUTER_MODEL") or "Qwen3-30B-A3B"
    # 3. Add a boardroom debate session (5 deliberations)
    analysis_session_id = "session_sample_3f8a9e"
    agents_delibs = [
        AgentDeliberation(
            analysis_session_id=analysis_session_id,
            user_id=user_db.id,
            agent_name="Document Analyst",
            role="OCR, document parsing, and transaction structure validator",
            message="Parsed 20 bank statement entries. Found steady cash inflows of ₹65,000/month. Noticeable spikes in discretionary dining expenditures during weekends.",
            model_name="local_stats",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            execution_time_ms=150,
            status="completed",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
        ),
        AgentDeliberation(
            analysis_session_id=analysis_session_id,
            user_id=user_db.id,
            agent_name="Risk & Fraud Agent",
            role="Detects spending spikes, cash anomalies, and micro-probing transfers",
            message="No active fraudulent transactions detected. Discretionary spending velocity is high (average ticket size: ₹1,850). Recommend setting a daily debit cap.",
            model_name=primary_model,
            prompt_tokens=1024,
            completion_tokens=85,
            total_tokens=1109,
            execution_time_ms=780,
            status="completed",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
        ),
        AgentDeliberation(
            analysis_session_id=analysis_session_id,
            user_id=user_db.id,
            agent_name="Compliance Agent",
            role="Cross-references activity against regulatory RBI and SEBI limits",
            message="All ledger transfers conform to SEBI/RBI circular guidelines. Tax deducted at source (TDS) entries are verified. No compliance flags raised.",
            model_name=primary_model,
            prompt_tokens=1250,
            completion_tokens=70,
            total_tokens=1320,
            execution_time_ms=920,
            status="completed",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
        ),
        AgentDeliberation(
            analysis_session_id=analysis_session_id,
            user_id=user_db.id,
            agent_name="Simulation & Strategy",
            role="Runs stress tests, Monte Carlo paths, and asset allocation advice",
            message="Allocating 60% of surplus to index equity funds will accelerate goal achievement. Recommending a baseline emergency fund buffer of ₹1.2 Lakhs.",
            model_name=primary_model,
            prompt_tokens=1480,
            completion_tokens=95,
            total_tokens=1575,
            execution_time_ms=1150,
            status="completed",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
        ),
        AgentDeliberation(
            analysis_session_id=analysis_session_id,
            user_id=user_db.id,
            agent_name="Judge Agent",
            role="Aggregates findings, resolves disputes, calculates confidence, and writes final case file",
            message="Final Verdict: Portfolio is stable. Raise monthly savings allocations. Compliance status: CLEAR. Confidence rating: 96%. File closed.",
            model_name=primary_model,
            prompt_tokens=1650,
            completion_tokens=120,
            total_tokens=1770,
            execution_time_ms=1320,
            status="completed",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
        )
    ]
    for ad in agents_delibs:
        db.add(ad)
        
    db.commit()
    return {"status": "success", "message": "Loaded sample historical reports, simulations, and courtroom debates."}

@app.post("/chat", tags=["Financial Chatbot"])
def chat_followup(payload: ChatRequest, authorization: Optional[str] = Header(None)):
    """Accepts follow-up financial chat questions within the scope of the authenticated user's advice context."""
    user = get_current_user(authorization)
    logger.info(f"Received follow-up chat request from user: {user['sub']}")
    try:
        response_text = get_chat_response(
            payload.financial_data,
            payload.advice,
            payload.history,
            payload.message
        )
        return {"response": response_text}
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ==================== DOCUMENT UPLOAD & PARSING ENDPOINTS ====================

@app.post("/upload-statement", tags=["Document Parsing"])
async def upload_statement(file: UploadFile = File(...), authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Universal document upload endpoint.
    Accepts PDF, CSV, Excel (.xlsx/.xls), image scans, or plain text (.txt).
    Extracts transactions with AI-powered categorization and confidence scoring.
    """
    user = get_current_user(authorization)
    logger.info(f"Document upload from user {user['sub']}: {file.filename} ({file.content_type})")

    allowed_extensions = {".pdf", ".csv", ".xlsx", ".xls", ".txt", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Supported: PDF, CSV, XLSX, XLS, TXT, PNG, JPG, JPEG, TIFF, BMP"
        )

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 20 MB."
        )

    try:
        result = parse_document(file_bytes, file.filename or "upload", file.content_type or "")
        logger.info(f"Parsed {result['total_count']} transactions from {result['source_type']} (confidence: {result['avg_confidence']}%)")

        import uuid
        from services.db import Document
        from services.graph_rag import build_transaction_graph_edges

        os.makedirs("data/uploads", exist_ok=True)
        unique_name = f"{uuid.uuid4()}_{file.filename}"
        storage_path = os.path.join("data/uploads", unique_name)
        with open(storage_path, "wb") as f:
            f.write(file_bytes)

        user_db = get_user_by_username(db, user["sub"])
        if not user_db:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found. Please sign in again."
            )

        doc = Document(
            user_id=user_db.id,
            filename=file.filename,
            file_type=file.content_type or "unknown",
            storage_path=storage_path,
            transactions=json.dumps(result.get("transactions", []))
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        if result.get("transactions"):
            build_transaction_graph_edges(result.get("transactions"), user_db.id, db)

        result["document_id"] = doc.id
        return result
    except Exception as e:
        logger.error(f"Document parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse document: {str(e)}"
        )

@app.get("/transactions", tags=["Document Parsing"])
async def get_user_transactions(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Returns persisted transactions or demo data if none exists."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        return await get_synthetic_data()

    from services.db import Document

    latest_doc = db.query(Document).filter(Document.user_id == user_db.id).filter(Document.transactions != None).order_by(Document.uploaded_at.desc()).first()

    if latest_doc and latest_doc.transactions:
        txns = json.loads(latest_doc.transactions)
        return {
            "transactions": txns,
            "total_count": len(txns),
            "source_type": "Persisted User Data",
            "document_id": latest_doc.id
        }
    else:
        return await get_synthetic_data()

@app.post("/parse-transactions", tags=["Document Parsing"])
async def parse_raw_transactions(payload: dict, authorization: Optional[str] = Header(None)):
    """
    Accept a raw JSON list of transactions and enrich them with AI categorization.
    Useful for manual text input.
    """
    user = get_current_user(authorization)
    transactions = payload.get("transactions", [])
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions provided")

    from services.document_parser import classify_category, is_recurring, detect_recurring_payments

    enriched = []
    for tx in transactions:
        desc = tx.get("description", "")
        cat = tx.get("category", "")
        if not cat or cat.lower() in ["", "uncategorized"]:
            cat, confidence = classify_category(desc)
        else:
            confidence = 95
        enriched.append({
            **tx,
            "category": cat,
            "confidence": confidence,
            "recurring": is_recurring(desc),
        })

    recurring = detect_recurring_payments(enriched)
    total_debits = sum(t["amount"] for t in enriched if t.get("type") == "Debit")
    total_credits = sum(t["amount"] for t in enriched if t.get("type") == "Credit")

    return {
        "transactions": enriched,
        "total_count": len(enriched),
        "total_debits": round(total_debits, 2),
        "total_credits": round(total_credits, 2),
        "net_savings": round(total_credits - total_debits, 2),
        "recurring_payments": recurring,
        "avg_confidence": round(sum(t.get("confidence", 80) for t in enriched) / max(len(enriched), 1), 1),
        "source_type": "manual",
    }

@app.get("/synthetic-data", tags=["Document Parsing"])
async def get_synthetic_data():
    """Return pre-defined 6-month synthetic Indian demo transactions for testing."""
    import random
    from datetime import date, timedelta
    from services.document_parser import classify_category, is_recurring

    demo_txns_raw = [
        {"desc": "Salary Credit - TCS Ltd", "amount": 65000, "type": "Credit"},
        {"desc": "Rent Payment", "amount": 18000, "type": "Debit"},
        {"desc": "HDFC Mutual Fund SIP", "amount": 5000, "type": "Debit"},
        {"desc": "Swiggy Order", "amount": 350, "type": "Debit"},
        {"desc": "Netflix Subscription", "amount": 649, "type": "Debit"},
        {"desc": "Amazon Shopping", "amount": 2100, "type": "Debit"},
        {"desc": "BESCOM Electricity Bill", "amount": 1200, "type": "Debit"},
        {"desc": "Uber Cab", "amount": 280, "type": "Debit"},
        {"desc": "Zomato Order", "amount": 420, "type": "Debit"},
        {"desc": "Indian Oil Fuel", "amount": 2000, "type": "Debit"},
        {"desc": "Airtel Postpaid", "amount": 599, "type": "Debit"},
        {"desc": "Flipkart Purchase", "amount": 1800, "type": "Debit"},
        {"desc": "Spotify Premium", "amount": 119, "type": "Debit"},
        {"desc": "Ola Cab", "amount": 180, "type": "Debit"},
        {"desc": "BookMyShow Ticket", "amount": 700, "type": "Debit"},
        {"desc": "Apollo Pharmacy", "amount": 450, "type": "Debit"},
        {"desc": "Groww Investment", "amount": 3000, "type": "Debit"},
        {"desc": "Jio Recharge", "amount": 299, "type": "Debit"},
        {"desc": "Zerodha Equity", "amount": 5000, "type": "Debit"},
        {"desc": "SBI MF SIP", "amount": 2000, "type": "Debit"},
    ]

    transactions = []
    today = date.today()
    for m in range(5, -1, -1):
        month_start = today.replace(day=1) - timedelta(days=m * 30)
        for tmpl in demo_txns_raw:
            jitter_days = random.randint(0, 5)
            txn_date = month_start + timedelta(days=jitter_days)
            amount_var = tmpl["amount"] * (1 + random.uniform(-0.1, 0.1))
            cat, conf = classify_category(tmpl["desc"])
            transactions.append({
                "date": txn_date.strftime("%Y-%m-%d"),
                "description": tmpl["desc"],
                "category": cat,
                "amount": round(amount_var, 2),
                "type": tmpl["type"],
                "confidence": conf,
                "recurring": is_recurring(tmpl["desc"]),
                "source": "synthetic",
            })

    transactions.sort(key=lambda x: x["date"], reverse=True)
    return {"transactions": transactions, "total_count": len(transactions), "source_type": "Synthetic Demo"}


# ==================== ADVANCED FINANCIAL COPILOT ENDPOINTS ====================

from pydantic import BaseModel
from services.simulation import run_financial_stress_simulation
from services.graph_rag import get_graph_elements_payload, build_transaction_graph_edges
from services.agents import run_boardroom_debate_stream

class StressSimulationRequest(BaseModel):
    monthly_income: float
    necessities_expense: float
    discretionary_expense: float
    current_savings: float
    target_goal: float
    timeline_months: int
    discretionary_reduction_pct: float
    sip_addition: float
    market_return_type: str
    inflation_rate_annual: float
    shock_event: str

@app.post("/simulation/run", tags=["Stress Simulation"])
def run_simulation(payload: StressSimulationRequest, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Runs a Monte Carlo projection stress-tested against inflation, crash, or income shocks."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        results = run_financial_stress_simulation(
            monthly_income=payload.monthly_income,
            necessities_expense=payload.necessities_expense,
            discretionary_expense=payload.discretionary_expense,
            current_savings=payload.current_savings,
            target_goal=payload.target_goal,
            timeline_months=payload.timeline_months,
            discretionary_reduction_pct=payload.discretionary_reduction_pct,
            sip_addition=payload.sip_addition,
            market_return_type=payload.market_return_type,
            inflation_rate_annual=payload.inflation_rate_annual,
            shock_event=payload.shock_event
        )

        from services.db import Simulation
        sim_record = Simulation(
            user_id=user_db.id,
            name=f"Stress Test: {payload.shock_event.title()}",
            parameters=json.dumps(payload.dict()),
            results=json.dumps(results)
        )
        db.add(sim_record)
        db.commit()

        return results
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@app.get("/simulation/history", tags=["Stress Simulation"])
def get_simulation_history(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Reads and returns all historical simulation runs matching the authenticated user's session."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        return []

    from services.db import Simulation
    simulations = db.query(Simulation).filter(Simulation.user_id == user_db.id).order_by(Simulation.simulated_at.desc()).all()

    res = []
    for s in simulations:
        res.append({
            "id": s.id,
            "name": s.name,
            "parameters": json.loads(s.parameters) if s.parameters else {},
            "results": json.loads(s.results) if s.results else {},
            "simulated_at": s.simulated_at.isoformat()
        })
    return res

@app.delete("/simulation/{simulation_id}", tags=["Stress Simulation"])
def delete_simulation(simulation_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Deletes a historical simulation run matching the user's account."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import Simulation
    sim = db.query(Simulation).filter(Simulation.id == simulation_id, Simulation.user_id == user_db.id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
        
    db.delete(sim)
    db.commit()
    return {"status": "success", "message": "Simulation log deleted successfully"}

@app.get("/graph/elements", tags=["Knowledge Graph"])
def get_knowledge_graph(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieves Cytoscape node-link relations for the user's transactions."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    return get_graph_elements_payload(user_db.id, db)

# ==================== HARDWARE & OBSERVATORY TELEMETRY ====================

from services.amd_optim import get_gpu_telemetry_metrics

@app.get("/hardware/metrics", tags=["Health"])
def get_hardware_metrics():
    """Exposes real/simulated AMD ROCm hardware accelerator telemetry."""
    return get_gpu_telemetry_metrics()

@app.get("/agent-observatory/sessions", tags=["Agent Observatory"])
def list_observatory_sessions(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Lists all available agent boardroom courtroom debate sessions for the user."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import AgentDeliberation
    from sqlalchemy import func
    
    sessions_db = db.query(
        AgentDeliberation.analysis_session_id,
        func.max(AgentDeliberation.timestamp).label("session_date"),
        func.sum(AgentDeliberation.total_tokens).label("total_tokens"),
        func.sum(AgentDeliberation.execution_time_ms).label("total_duration_ms")
    ).filter(
        AgentDeliberation.user_id == user_db.id
    ).group_by(
        AgentDeliberation.analysis_session_id
    ).order_by(
        func.max(AgentDeliberation.timestamp).desc()
    ).all()
    
    return [
        {
            "analysis_session_id": s.analysis_session_id,
            "session_date": s.session_date.isoformat() if s.session_date else None,
            "total_tokens": int(s.total_tokens or 0),
            "total_duration_ms": int(s.total_duration_ms or 0)
        }
        for s in sessions_db
    ]

@app.get("/agent-history/{user_id}", tags=["Agent Observatory"])
def get_agent_history_by_user_id(user_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieves all courtroom debate session summaries for a specific user ID."""
    # Verify authentication
    get_current_user(authorization)
    
    from services.db import User, AgentDeliberation
    from sqlalchemy import func
    
    user_db = db.query(User).filter(User.id == user_id).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    sessions_db = db.query(
        AgentDeliberation.analysis_session_id,
        func.max(AgentDeliberation.timestamp).label("session_date"),
        func.sum(AgentDeliberation.total_tokens).label("total_tokens"),
        func.sum(AgentDeliberation.execution_time_ms).label("total_duration_ms")
    ).filter(
        AgentDeliberation.user_id == user_id
    ).group_by(
        AgentDeliberation.analysis_session_id
    ).order_by(
        func.max(AgentDeliberation.timestamp).desc()
    ).all()
    
    return [
        {
            "analysis_session_id": s.analysis_session_id,
            "session_date": s.session_date.isoformat() if s.session_date else None,
            "total_tokens": int(s.total_tokens or 0),
            "total_duration_ms": int(s.total_duration_ms or 0)
        }
        for s in sessions_db
    ]

@app.get("/agent-observatory/{session_id}", tags=["Agent Observatory"])
def get_observatory_session_telemetry(session_id: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieves detailed agent dialogue logs and token/latency metrics for a session."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import AgentDeliberation
    deliberations = db.query(AgentDeliberation).filter(
        AgentDeliberation.analysis_session_id == session_id,
        AgentDeliberation.user_id == user_db.id
    ).order_by(AgentDeliberation.timestamp.asc()).all()
    
    if not deliberations:
        raise HTTPException(status_code=404, detail="Session telemetry not found")
        
    total_tokens = sum(d.total_tokens or 0 for d in deliberations)
    prompt_tokens = sum(d.prompt_tokens or 0 for d in deliberations)
    completion_tokens = sum(d.completion_tokens or 0 for d in deliberations)
    total_duration_ms = sum(d.execution_time_ms or 0 for d in deliberations)
    
    agent_logs = []
    for d in deliberations:
        raw_out = None
        if d.raw_output_json:
            try:
                raw_out = json.loads(d.raw_output_json)
            except Exception:
                raw_out = d.raw_output_json
                
        agent_logs.append({
            "agent_name": d.agent_name,
            "role": d.role,
            "message": d.message,
            "model_name": d.model_name,
            "prompt_tokens": d.prompt_tokens,
            "completion_tokens": d.completion_tokens,
            "total_tokens": d.total_tokens,
            "execution_time_ms": d.execution_time_ms,
            "status": d.status,
            "timestamp": d.timestamp.isoformat(),
            "raw_output_json": raw_out
        })
        
    return {
        "analysis_session_id": session_id,
        "total_tokens": total_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    }

@app.delete("/agent-observatory/{session_id}", tags=["Agent Observatory"])
def delete_observatory_session(session_id: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Deletes an entire boardroom courtroom debate session trace matching the user's account."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    from services.db import AgentDeliberation
    delibs = db.query(AgentDeliberation).filter(
        AgentDeliberation.analysis_session_id == session_id,
        AgentDeliberation.user_id == user_db.id
    ).all()
    
    if not delibs:
        raise HTTPException(status_code=404, detail="Session trace not found")
        
    for d in delibs:
        db.delete(d)
    db.commit()
    return {"status": "success", "message": "Session trace deleted successfully"}

@app.websocket("/ws/boardroom")
async def websocket_boardroom(websocket: WebSocket, db: Session = Depends(get_db)):
    """Asynchronous WebSocket channel streaming live Agent Boardroom dialogue logs."""
    await websocket.accept()
    logger.info("New Boardroom WebSocket connection established.")
    try:
        data = await websocket.receive_text()
        params = json.loads(data)

        token = params.get("token")
        transactions = params.get("transactions", [])

        if not token:
            await websocket.send_json({"event": "error", "message": "Auth token required"})
            await websocket.close()
            return

        user = verify_jwt_token(token)
        if not user:
            await websocket.send_json({"event": "error", "message": "Session expired or invalid token"})
            await websocket.close()
            return

        user_db = get_user_by_username(db, user["sub"])
        if not user_db:
            await websocket.send_json({"event": "error", "message": "User profile not found"})
            await websocket.close()
            return

        import uuid
        analysis_session_id = f"session_{uuid.uuid4().hex[:12]}"

        # Yield session ID initialization immediately to frontend
        await websocket.send_json({
            "event": "session_init",
            "analysis_session_id": analysis_session_id
        })

        # Find document id to associate
        from services.db import Document
        latest_doc = db.query(Document).filter(Document.user_id == user_db.id).order_by(Document.uploaded_at.desc()).first()
        doc_id = latest_doc.id if latest_doc else None

        if transactions:
            build_transaction_graph_edges(transactions, user_db.id, db)

        async for agent_log in run_boardroom_debate_stream(
            transactions, 
            user_db.id, 
            db, 
            analysis_session_id=analysis_session_id, 
            document_id=doc_id
        ):
            await websocket.send_json(agent_log)

    except WebSocketDisconnect:
        logger.info("Boardroom WebSocket connection disconnected.")
    except Exception as e:
        logger.error(f"WebSocket courtroom error: {e}")
        try:
            await websocket.send_json({"event": "error", "message": str(e)})
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        reload_excludes=["data/*", "**/data/*", "*.db", "*.db-wal", "*.db-shm", "uploads/*"]
    )
