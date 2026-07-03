from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.university import University
from app.models.admin import Admin
from app.schemas import UniversityCreate, UniversityOut
from app.utils import hash_password
from app.dependencies import get_current_superadmin

router = APIRouter()

# Listing/reading is intentionally public — the landing page needs to show
# all universities to anonymous visitors before they've logged in anywhere.
@router.get("/", response_model=List[UniversityOut])
def get_universities(db: Session = Depends(get_db)):
    return db.query(University).all()

@router.get("/{university_id}", response_model=UniversityOut)
def get_university(university_id: str, db: Session = Depends(get_db)):
    university = db.query(University).filter(University.id == university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university

@router.post("/", response_model=UniversityOut)
def create_university(
    data: UniversityCreate,
    db: Session = Depends(get_db),
    _superadmin: str = Depends(get_current_superadmin)
):
    existing = db.query(University).filter(University.name == data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="University with this name already exists"
        )

    university = University(
        name=data.name,
        city=data.city,
        province=data.province
    )
    db.add(university)
    db.flush()

    admin = Admin(
        university_id=university.id,
        name=data.admin.name,
        email=data.admin.email,
        password_hash=hash_password(data.admin.password)
    )
    db.add(admin)
    db.commit()
    db.refresh(university)

    return university