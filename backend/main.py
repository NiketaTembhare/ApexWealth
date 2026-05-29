import os
import logging
import json
import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, status, Header, UploadFile, File, Form
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
from services.auth import hash_password, verify_password, create_jwt_token, verify_jwt_token
from services.document_parser import parse_document

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

# CORS Configuration - Enable all origins for fast robust local MVP testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def save_to_history(username: str, payload: FinancialInput, advice: AdviceResponse):
    os.makedirs("data", exist_ok=True)
    history_file = "data/history.json"
    
    entry = {
        "username": username,
        "timestamp": datetime.datetime.now().isoformat(),
        "input": payload.dict(),
        "advice": advice.dict()
    }
    
    data = []
    if os.path.exists(history_file):
        try:
            with open(history_file, "r") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = []
        except Exception:
            data = []
            
    data.append(entry)
    
    try:
        with open(history_file, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save history: {str(e)}")

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
def register_user(payload: UserRegister):
    """Registers a new user, hashes password, and saves credentials to local users.json."""
    os.makedirs("data", exist_ok=True)
    users_file = "data/users.json"
    
    users = {}
    if os.path.exists(users_file):
        try:
            with open(users_file, "r") as f:
                users = json.load(f)
        except Exception:
            users = {}
            
    if payload.username in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another or sign in."
        )
        
    # Store credentials securely
    users[payload.username] = {
        "username": payload.username,
        "name": payload.name,
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    try:
        with open(users_file, "w") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save user database: {str(e)}"
        )
        
    # Create session JWT
    token = create_jwt_token(payload.username, payload.name)
    return {
        "access_token": token,
        "name": payload.name,
        "username": payload.username
    }

@app.post("/auth/login", response_model=TokenResponse, status_code=status.HTTP_200_OK, tags=["Auth"])
def login_user(payload: UserLogin):
    """Authenticates credentials against stored users.json and returns a session JWT token."""
    users_file = "data/users.json"
    if not os.path.exists(users_file):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please register first."
        )
        
    try:
        with open(users_file, "r") as f:
            users = json.load(f)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read user database."
        )
        
    if payload.username not in users or not verify_password(payload.password, users[payload.username]["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please try again."
        )
        
    user_info = users[payload.username]
    token = create_jwt_token(payload.username, user_info["name"])
    return {
        "access_token": token,
        "name": user_info["name"],
        "username": user_info["username"]
    }

# ==================== PERSONAL FINANCIAL ADVICE ====================

@app.post(
    "/generate-advice", 
    response_model=AdviceResponse, 
    status_code=status.HTTP_200_OK, 
    tags=["Financial Advice"]
)
def generate_advice(payload: FinancialInput, authorization: Optional[str] = Header(None)):
    """
    Accepts user spending habits, runs calculations,
    and calls Google Gemini to return a structured JSON report. Tethers to authenticated session.
    """
    user = get_current_user(authorization)
    logger.info(f"Received request forpersonalized financial advice from user: {user['sub']}")
    
    # Simple sanity check
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
        # Request advice from Gemini
        advice = get_financial_advice(payload)
        logger.info("Successfully generated personalized financial advice.")
        
        # Save request and response history to JSON tied to specific authenticated username
        save_to_history(user["sub"], payload, advice)
        
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
def get_advice_history(authorization: Optional[str] = Header(None)):
    """Reads and returns all historical advice reports matching the authenticated user's session."""
    user = get_current_user(authorization)
    history_file = "data/history.json"
    if not os.path.exists(history_file):
        return []
    try:
        with open(history_file, "r") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            # Filter history entries matching the current user's username
            user_history = [entry for entry in data if entry.get("username") == user["sub"]]
            return user_history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read advice history: {str(e)}"
        )

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
async def upload_statement(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """
    Universal document upload endpoint.
    Accepts PDF, CSV, Excel (.xlsx/.xls), or plain text (.txt).
    Extracts transactions with AI-powered categorization and confidence scoring.
    """
    user = get_current_user(authorization)
    logger.info(f"Document upload from user {user['sub']}: {file.filename} ({file.content_type})")

    # Validate file type
    allowed_extensions = {".pdf", ".csv", ".xlsx", ".xls", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Supported: PDF, CSV, XLSX, XLS, TXT"
        )

    # Size limit: 20 MB
    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 20 MB."
        )

    try:
        result = parse_document(file_bytes, file.filename or "upload", file.content_type or "")
        logger.info(f"Parsed {result['total_count']} transactions from {result['source_type']} (confidence: {result['avg_confidence']}%)")
        return result
    except Exception as e:
        logger.error(f"Document parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse document: {str(e)}"
        )


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
