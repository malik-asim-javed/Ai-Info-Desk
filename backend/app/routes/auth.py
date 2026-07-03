from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.schemas import LoginRequest, TokenOut
from app.utils import verify_password, create_access_token
from app.config import settings

router = APIRouter()

SUPER_ADMIN_EMAIL = "superadmin@infodesk.com"
SUPER_ADMIN_PASSWORD = "superadmin123"

@router.post("/login", response_model=TokenOut)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    # Check if super admin
    if request.email == SUPER_ADMIN_EMAIL:
        if request.password != SUPER_ADMIN_PASSWORD:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        token = create_access_token(data={
            "sub": SUPER_ADMIN_EMAIL,
            "role": "superadmin"
        })
        return {"access_token": token, "token_type": "bearer", "role": "superadmin"}

    # Check if university admin
    admin = db.query(Admin).filter(Admin.email == request.email).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated"
        )

    if not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token(data={
        "sub": admin.email,
        "role": "admin",
        "university_id": str(admin.university_id)
    })

    return {"access_token": token, "token_type": "bearer", "role": "admin"}