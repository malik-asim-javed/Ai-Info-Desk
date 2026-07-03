from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.admin import Admin
from app.schemas import AdminOut, AddAdminToUniversity, AdminUpdate
from app.utils import hash_password
from app.dependencies import get_current_admin, get_current_superadmin

router = APIRouter()

@router.get("/", response_model=List[AdminOut])
def get_all_admins(
    db: Session = Depends(get_db),
    _superadmin: str = Depends(get_current_superadmin)
):
    return db.query(Admin).all()

@router.post("/", response_model=AdminOut)
def add_admin(
    data: AddAdminToUniversity,
    db: Session = Depends(get_db),
    _superadmin: str = Depends(get_current_superadmin)
):

    existing = db.query(Admin).filter(Admin.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An admin with this email already exists"
        )

    admin = Admin(
        university_id=data.university_id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin

@router.patch("/me", response_model=AdminOut)
def update_my_profile(
    data: AdminUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Lets a logged-in admin update their own name, email, and/or password.
    Identity comes from the bearer token, not from a client-supplied ID —
    an admin can only ever edit their own account this way.
    """
    if data.email and data.email != current_admin.email:
        existing = db.query(Admin).filter(Admin.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An admin with this email already exists"
            )
        current_admin.email = data.email

    if data.name:
        current_admin.name = data.name

    if data.password:
        current_admin.password_hash = hash_password(data.password)

    db.commit()
    db.refresh(current_admin)
    return current_admin

@router.patch("/{admin_id}/deactivate", response_model=AdminOut)
def deactivate_admin(
    admin_id: str,
    db: Session = Depends(get_db),
    _superadmin: str = Depends(get_current_superadmin)
):

    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    active_count = db.query(Admin).filter(
        Admin.university_id == admin.university_id,
        Admin.is_active == True
    ).count()

    if active_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate — university must have at least one active admin"
        )

    admin.is_active = False
    db.commit()
    db.refresh(admin)
    return admin