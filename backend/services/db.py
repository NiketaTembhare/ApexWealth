import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Ensure database directory exists
os.makedirs("data", exist_ok=True)

DATABASE_URL = "sqlite:///data/copilot.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Enable SQLite WAL mode and foreign keys enforcement dynamically
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
    except Exception:
        pass
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="user", cascade="all, delete-orphan")

class AgentDeliberation(Base):
    __tablename__ = "agent_deliberations"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_session_id = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    agent_name = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Observatory Telemetry Fields
    model_name = Column(String, nullable=True)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    execution_time_ms = Column(Integer, default=0)
    status = Column(String, default="completed")  # "running" | "completed" | "failed"
    raw_output_json = Column(Text, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    user = relationship("User")
    document = relationship("Document")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    storage_path = Column(String, nullable=True)
    transactions = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="documents")
    report = relationship("Report", uselist=False, back_populates="document", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    summary = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    confidence_score = Column(Float, default=100.0)
    recommendations = Column(Text, nullable=True)
    risk_score = Column(Float, nullable=True)
    timeline = Column(Text, nullable=True)  # JSON String of Chronological Detective timeline
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="reports")
    document = relationship("Document", back_populates="report")

class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    parameters = Column(Text, nullable=False)  # JSON String of input parameters
    results = Column(Text, nullable=False)     # JSON String of projection arrays/metrics
    simulated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="simulations")

class GraphEdge(Base):
    __tablename__ = "graph_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String, index=True, nullable=False)
    source_type = Column(String, nullable=False)
    target_id = Column(String, index=True, nullable=False)
    target_type = Column(String, nullable=False)
    relation_type = Column(String, nullable=False)  # e.g., "paid_to", "violates", "references"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Safe schema evolution for existing databases
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE documents ADD COLUMN transactions TEXT"))
    except Exception:
        pass
        
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE reports ADD COLUMN recommendations TEXT"))
    except Exception:
        pass
        
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE reports ADD COLUMN risk_score FLOAT"))
    except Exception:
        pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE agent_deliberations ADD COLUMN analysis_session_id TEXT"))
    except Exception:
        pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE agent_deliberations ADD COLUMN raw_output_json TEXT"))
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
