from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.models.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Expert(Base):
    __tablename__ = "experts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    department = Column(String, nullable=True)
    role = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    expertise = Column(String, nullable=True) # Stored as comma-separated or JSON
    projects = Column(Text, nullable=True) # Stored as JSON string
    experience_details = Column(Text, nullable=True) # Stored as JSON string
    resume_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sessions = relationship("KnowledgeSession", back_populates="expert", cascade="all, delete-orphan")

class KnowledgeSession(Base):
    __tablename__ = "knowledge_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    expert_id = Column(String, ForeignKey("experts.id"), nullable=False)
    domain = Column(String, nullable=False)
    coverage = Column(Float, default=0.0)
    status = Column(String, default="active") # active, completed
    parent_session_id = Column(String, ForeignKey("knowledge_sessions.id"), nullable=True)
    topic_checklist = Column(Text, nullable=True) # Stored as JSON list of strings
    topic_turn_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    expert = relationship("Expert", back_populates="sessions")
    messages = relationship("TranscriptMessage", back_populates="session", cascade="all, delete-orphan")
    insights = relationship("KnowledgeInsight", back_populates="session", cascade="all, delete-orphan")

class TranscriptMessage(Base):
    __tablename__ = "transcript_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("knowledge_sessions.id"))
    role = Column(String, nullable=False) # expert, ai
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("KnowledgeSession", back_populates="messages")

class KnowledgeInsight(Base):
    __tablename__ = "knowledge_insights"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("knowledge_sessions.id"))
    insight_type = Column(String, nullable=False) # process, tacit, gap
    category = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    # Set when a gap is assigned to a follow-up session, then stamped once that session completes
    resolved_by_session_id = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("KnowledgeSession", back_populates="insights")

class KnowledgeAsset(Base):
    __tablename__ = "knowledge_assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("knowledge_sessions.id"))
    asset_type = Column(String, nullable=False) # SOP, FAQ, Troubleshooting, Article
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default="DRAFT") # DRAFT, PUBLISHED, REJECTED, ARCHIVED
    supersedes_asset_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("KnowledgeSession")
