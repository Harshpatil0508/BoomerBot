from pydantic import BaseModel
from typing import List
from datetime import datetime

class TranscriptMessageBase(BaseModel):
    role: str
    content: str

class TranscriptMessageCreate(TranscriptMessageBase):
    pass

class TranscriptMessageOut(TranscriptMessageBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class KnowledgeInsightBase(BaseModel):
    insight_type: str
    category: str
    content: str

class KnowledgeInsightOut(KnowledgeInsightBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class KnowledgeSessionBase(BaseModel):
    expert_name: str
    domain: str

class KnowledgeSessionCreate(KnowledgeSessionBase):
    pass

class KnowledgeSessionOut(KnowledgeSessionBase):
    id: str
    coverage: float
    status: str
    created_at: datetime
    messages: List[TranscriptMessageOut] = []
    insights: List[KnowledgeInsightOut] = []

    class Config:
        from_attributes = True
