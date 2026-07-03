from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base

class University(Base):
    __tablename__ = "universities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    city = Column(String(100), nullable=False)
    province = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    admins = relationship("Admin", back_populates="university")
    faqs = relationship("FAQ", back_populates="university")
    policies = relationship("Policy", back_populates="university")