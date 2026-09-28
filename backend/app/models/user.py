from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
import uuid
from app.models.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="USER", nullable=False) # ADMIN, EXPERT, USER
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
