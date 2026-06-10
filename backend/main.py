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
        "gemini_api_configured": api_key_configured
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

@app.get("/graph/elements", tags=["Knowledge Graph"])
def get_knowledge_graph(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieves Cytoscape node-link relations for the user's transactions."""
    user = get_current_user(authorization)
    user_db = get_user_by_username(db, user["sub"])
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    return get_graph_elements_payload(user_db.id, db)

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

        if transactions:
            build_transaction_graph_edges(transactions, user_db.id, db)

        async for agent_log in run_boardroom_debate_stream(transactions, user_db.id, db):
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
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
