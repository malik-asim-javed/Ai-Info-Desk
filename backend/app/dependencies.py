from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.utils import decode_access_token

bearer_scheme = HTTPBearer()

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Admin:
    """
    Decodes the bearer token and returns the Admin row it belongs to.
    Rejects superadmin tokens (no Admin row exists for those), any
    expired/invalid/tampered token, and deactivated admin accounts —
    so a deactivated admin is locked out immediately, not just once
    their existing token happens to expire.
    """
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin = db.query(Admin).filter(Admin.email == payload.get("sub")).first()
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account not found or inactive"
        )

    return admin

def get_current_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    """
    Decodes the bearer token and confirms it belongs to the superadmin.
    Returns the superadmin's email (the token's "sub" claim). There's no
    Admin row to look up — the superadmin is a single hardcoded credential
    checked in auth.py, not a database record.
    """
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload.get("sub")