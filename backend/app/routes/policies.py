from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.policy import Policy
from app.models.admin import Admin
from app.schemas import PolicyCreate, PolicyUpdate, PolicyOut
from app.dependencies import get_current_admin

router = APIRouter()

# Listing is intentionally public/unauthenticated — the anonymous student
# chat page needs to read policies for any university without logging in.
@router.get("/", response_model=List[PolicyOut])
def get_policies(university_id: str, db: Session = Depends(get_db)):
    return db.query(Policy).filter(Policy.university_id == university_id).all()

@router.post("/", response_model=PolicyOut)
def create_policy(
    data: PolicyCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    if str(data.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage policies for your own university")

    policy = Policy(
        university_id=data.university_id,
        title=data.title,
        content=data.content
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy

@router.put("/{policy_id}", response_model=PolicyOut)
def update_policy(
    policy_id: str,
    data: PolicyUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if str(policy.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage policies for your own university")

    if data.title is not None:
        policy.title = data.title
    if data.content is not None:
        policy.content = data.content

    db.commit()
    db.refresh(policy)
    return policy

@router.delete("/{policy_id}")
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if str(policy.university_id) != str(current_admin.university_id):
        raise HTTPException(status_code=403, detail="You can only manage policies for your own university")

    db.delete(policy)
    db.commit()
    return {"success": True}