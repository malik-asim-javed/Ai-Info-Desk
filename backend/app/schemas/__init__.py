from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# UNIVERSITY SCHEMAS
class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UniversityCreate(BaseModel):
    name: str
    city: str
    province: str
    admin: AdminCreate

class UniversityOut(BaseModel):
    id: UUID
    name: str
    city: str
    province: str
    created_at: datetime

    class Config:
        from_attributes = True

# ADMIN SCHEMAS
class AdminOut(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    university_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class AddAdminToUniversity(BaseModel):
    university_id: UUID
    name: str
    email: EmailStr
    password: str

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

# AUTH SCHEMAS
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str
    role: str

# FAQ SCHEMAS
class FAQCreate(BaseModel):
    university_id: UUID
    question: str
    answer: str

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None

class FAQOut(BaseModel):
    id: UUID
    university_id: UUID
    question: str
    answer: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# POLICY SCHEMAS
class PolicyCreate(BaseModel):
    university_id: UUID
    title: str
    content: str

class PolicyUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class PolicyOut(BaseModel):
    id: UUID
    university_id: UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# CHAT SCHEMAS
class ChatMessage(BaseModel):
    role: str  # "user" or "bot"
    text: str

class ChatRequest(BaseModel):
    query: str
    university_id: UUID
    session_id: Optional[UUID] = None
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    session_id: UUID

# ANALYTICS SCHEMAS
class RecentQuery(BaseModel):
    question: str
    created_at: datetime

class AnalyticsOut(BaseModel):
    queries_today: int
    queries_this_week: int
    total_queries: int
    recent_questions: List[RecentQuery]
