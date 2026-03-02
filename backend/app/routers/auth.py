"""
Authentication routes — signup, OTP, login, password reset.

All routes are prefixed with /api/auth via main.py router registration.
"""
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

from app.database import get_database
from app.models.user import (
    UserCreate,
    LoginRequest,
    OTPRequest,
    OTPVerify,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Demo OTP — replace with a real SMS provider in production
# ---------------------------------------------------------------------------
DEMO_OTP = "123456"
OTP_TTL_MINUTES = 10


@router.post("/signup")
async def signup(user_data: UserCreate):
    """Register a new merchant account and send phone OTP."""
    db = get_database()
    existing = await db.users.find_one(
        {"$or": [{"email": user_data.email}, {"phone": user_data.phone}]},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email or phone already registered")

    user_id = str(uuid.uuid4())
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)

    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "phone": user_data.phone,
        "password_hash": hash_password(user_data.password),
        "is_verified": False,
        "otp": DEMO_OTP,
        "otp_expiry": otp_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    # TODO: integrate real SMS gateway here
    return {"message": "User created. OTP sent to phone.", "otp": DEMO_OTP, "user_id": user_id}


@router.post("/send-otp")
async def send_otp(request: OTPRequest):
    """Re-send OTP to a registered phone number."""
    db = get_database()
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered")

    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    await db.users.update_one(
        {"phone": request.phone},
        {"$set": {"otp": DEMO_OTP, "otp_expiry": otp_expiry.isoformat()}},
    )
    return {"message": "OTP sent", "otp": DEMO_OTP}


@router.post("/verify-otp")
async def verify_otp(request: OTPVerify):
    """Verify phone OTP and issue a JWT access token."""
    db = get_database()
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    otp_expiry = datetime.fromisoformat(user["otp_expiry"])
    if datetime.now(timezone.utc) > otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired")

    await db.users.update_one(
        {"phone": request.phone},
        {"$set": {"is_verified": True, "otp": None}},
    )

    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    token = create_access_token({"sub": user["user_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "phone": user["phone"],
            "is_verified": user["is_verified"],
        },
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate with email or phone + password and receive a JWT."""
    db = get_database()
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0},
    )
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Please verify your phone number first")

    token = create_access_token({"sub": user["user_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "phone": user["phone"],
            "is_verified": user["is_verified"],
        },
    }


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Initiate a password reset — sends OTP to registered email/phone."""
    db = get_database()
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"otp": DEMO_OTP, "otp_expiry": otp_expiry.isoformat()}},
    )
    return {"message": "OTP sent", "otp": DEMO_OTP}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password after OTP validation."""
    db = get_database()
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    otp_expiry = datetime.fromisoformat(user["otp_expiry"])
    if datetime.now(timezone.utc) > otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(request.new_password), "otp": None}},
    )
    return {"message": "Password reset successful"}
