"""
User profile routes.

All routes are prefixed with /api/user via main.py router registration.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's public profile."""
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "is_verified": current_user["is_verified"],
    }
