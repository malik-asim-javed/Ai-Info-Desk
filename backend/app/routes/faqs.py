from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.faq import FAQ
from app.models.admin import Admin
from app.schemas import FAQCreate, FAQUpdate, FAQOut
from app.dependencies import get_current_admin

router = APIRouter()

# Listing is intentionally public/unauthenticated — the anonymous student
# chat page needs to read FAQs for any university without logging in.
@router.get("/", response_model=List[FAQOut])
def get_faqs(university_id: str, db: Session = Depends(get_db)):
    return db.query(FAQ).filter(FAQ.university_id == university_id).all()

@router.post("/", response_model=FAQOut)
def create_faq(
    data: FAQCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    if str(data.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage FAQs for your own university")

    faq = FAQ(
        university_id=data.university_id,
        question=data.question,
        answer=data.answer
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.put("/{faq_id}", response_model=FAQOut)
def update_faq(
    faq_id: str,
    data: FAQUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    if str(faq.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage FAQs for your own university")

    if data.question is not None:
        faq.question = data.question
    if data.answer is not None:
        faq.answer = data.answer

    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/{faq_id}")
def delete_faq(
    faq_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    if str(faq.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage FAQs for your own university")

    db.delete(faq)
    db.commit()
    return {"success": True}