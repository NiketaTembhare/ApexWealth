import os
import hashlib
import jwt
import datetime
from typing import Optional, Dict
from sqlalchemy.orm import Session
from services.db import User

JWT_SECRET = os.getenv("JWT_SECRET", "apexwealth_super_secure_secret_key_tcs_ai_friday")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Securely hash a password using standard hashlib SHA256 PBKDF2."""
    salt = b"apexwealth_salt_123"
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hashed.hex()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored hashed password."""
    return hash_password(password) == hashed_password

def create_jwt_token(username: str, name: str) -> str:
    """Creates a JWT access token for authentication expiring in 24 hours."""
    payload = {
        "sub": username,
        "name": name,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[Dict]:
    """Verifies a JWT token and returns the payload if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

# ==================== SQLITE DATABASE OPERATIONS ====================

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Retrieves a user by username from the SQLite database."""
    return db.query(User).filter(User.username == username).first()

def register_new_user(db: Session, username: str, name: str, password_plain: str) -> User:
    """Creates a new user record in the database."""
    hashed_pw = hash_password(password_plain)
    new_user = User(
        username=username,
        name=name,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(db: Session, username: str, password_plain: str) -> Optional[User]:
    """Verifies username and password against the SQLite database."""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password_plain, user.hashed_password):
        return None
    return user
