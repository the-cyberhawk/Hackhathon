
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_database
from app.models.kyc import KYCStatus

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Hardcoded admin credentials (for demo purposes)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


class AdminLogin(BaseModel):
    username: str
    password: str


class StatusUpdate(BaseModel):
    user_id: str
    status: str
    notes: Optional[str] = None


class NotesUpdate(BaseModel):
    user_id: str
    notes: str

@router.post("/login")
async def admin_login(credentials: AdminLogin):
    """Authenticate admin with hardcoded credentials."""
    logger.info(f"[ADMIN LOGIN] Attempt: {credentials.username}")
    
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        logger.warning(f"[ADMIN LOGIN] Failed for: {credentials.username}")
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    logger.info("[ADMIN LOGIN] Success")
    return {"message": "Admin login successful", "admin": True}


# ── Get All Merchants with KYC ────────────────────────────────────────────


@router.get("/merchants")
async def get_all_merchants():
    """Get all merchants with their KYC data for admin review."""
    logger.info("[ADMIN] Fetching all merchants")
    
    db = get_database()
    
    # Get all KYC submissions
    kyc_records = await db.kyc_data.find({}, {"_id": 0}).to_list(100)
    
    # Get corresponding user data
    merchants = []
    for kyc in kyc_records:
        user = await db.users.find_one(
            {"user_id": kyc["user_id"]},
            {"_id": 0, "password_hash": 0, "otp": 0, "otp_expiry": 0}
        )
        if user:
            merchant_data = {
                "user_id": kyc["user_id"],
                "email": user.get("email"),
                "phone": user.get("phone"),
                "is_verified": user.get("is_verified"),
                "created_at": user.get("created_at"),
                "kyc_status": kyc.get("status", "draft"),
                "basic_details": kyc.get("basic_details"),
                "identity_details": kyc.get("identity_details"),
                "business_details": kyc.get("business_details"),
                "bank_details": kyc.get("bank_details"),
                "documents": {
                    "aadhaar_front": kyc.get("aadhaar_front"),
                    "aadhaar_back": kyc.get("aadhaar_back"),
                    "pan_card": kyc.get("pan_card"),
                    "cancelled_cheque": kyc.get("cancelled_cheque"),
                    "selfie": kyc.get("selfie"),
                },
                "admin_notes": kyc.get("admin_notes", ""),
                "ai_score": kyc.get("ai_score", _generate_ai_score(kyc)),
                "risk_level": kyc.get("risk_level", _calculate_risk_level(kyc)),
                "submitted_at": kyc.get("submitted_at"),
                "updated_at": kyc.get("updated_at"),
            }
            merchants.append(merchant_data)
    
    logger.info(f"[ADMIN] Found {len(merchants)} merchants")
    return {"merchants": merchants, "count": len(merchants)}


# ── Get Single Merchant Detail ────────────────────────────────────────────


@router.get("/merchants/{user_id}")
async def get_merchant_detail(user_id: str):
    """Get detailed merchant information for admin review."""
    logger.info(f"[ADMIN] Fetching merchant: {user_id}")
    
    db = get_database()
    
    kyc = await db.kyc_data.find_one({"user_id": user_id}, {"_id": 0})
    if not kyc:
        raise HTTPException(status_code=404, detail="Merchant KYC not found")
    
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0, "otp": 0, "otp_expiry": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "email": user.get("email"),
        "phone": user.get("phone"),
        "is_verified": user.get("is_verified"),
        "created_at": user.get("created_at"),
        "kyc_status": kyc.get("status", "draft"),
        "basic_details": kyc.get("basic_details"),
        "identity_details": kyc.get("identity_details"),
        "business_details": kyc.get("business_details"),
        "bank_details": kyc.get("bank_details"),
        "documents": {
            "aadhaar_front": kyc.get("aadhaar_front"),
            "aadhaar_back": kyc.get("aadhaar_back"),
            "pan_card": kyc.get("pan_card"),
            "cancelled_cheque": kyc.get("cancelled_cheque"),
            "selfie": kyc.get("selfie"),
        },
        "admin_notes": kyc.get("admin_notes", ""),
        "ai_score": kyc.get("ai_score", _generate_ai_score(kyc)),
        "risk_level": kyc.get("risk_level", _calculate_risk_level(kyc)),
        "ai_report": _generate_ai_report(kyc, user),
        "submitted_at": kyc.get("submitted_at"),
        "updated_at": kyc.get("updated_at"),
    }


# ── Update Merchant Status ────────────────────────────────────────────────


@router.post("/update-status")
async def update_merchant_status(update: StatusUpdate):
    """Update merchant KYC status (Approve/Reject/Manual Review)."""
    logger.info(f"[ADMIN] Updating status for {update.user_id} to {update.status}")
    
    db = get_database()
    
    # Validate status
    valid_statuses = ["approved", "rejected", "pending", "manual_review"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": update.status,
        "status_updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if update.notes:
        update_data["admin_notes"] = update.notes
    
    result = await db.kyc_data.update_one(
        {"user_id": update.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    logger.info(f"[ADMIN] Status updated successfully for {update.user_id}")
    return {"message": f"Status updated to {update.status}", "status": update.status}


# ── Save Admin Notes ──────────────────────────────────────────────────────


@router.post("/save-notes")
async def save_admin_notes(notes_update: NotesUpdate):
    """Save admin notes for a merchant."""
    logger.info(f"[ADMIN] Saving notes for {notes_update.user_id}")
    
    db = get_database()
    
    result = await db.kyc_data.update_one(
        {"user_id": notes_update.user_id},
        {"$set": {
            "admin_notes": notes_update.notes,
            "notes_updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    logger.info(f"[ADMIN] Notes saved for {notes_update.user_id}")
    return {"message": "Notes saved successfully"}


# ── Helper Functions ──────────────────────────────────────────────────────


def _generate_ai_score(kyc: dict) -> int:
    """Generate a mock AI score based on KYC completeness."""
    score = 50  # Base score
    
    if kyc.get("basic_details"):
        score += 10
    if kyc.get("identity_details"):
        score += 15
    if kyc.get("business_details"):
        score += 10
    if kyc.get("bank_details"):
        score += 10
    if kyc.get("selfie"):
        score += 5
    
    # Add some randomness for demo purposes
    import random
    score += random.randint(-5, 10)
    
    return min(100, max(0, score))


def _calculate_risk_level(kyc: dict) -> str:
    """Calculate risk level based on AI score."""
    score = _generate_ai_score(kyc)
    
    if score >= 75:
        return "Low"
    elif score >= 50:
        return "Medium"
    else:
        return "High"


def _generate_ai_report(kyc: dict, user: dict) -> dict:
    """Generate a mock AI verification report."""
    score = _generate_ai_score(kyc)
    
    return {
        "recommendation": "Approve" if score >= 75 else ("Manual Review" if score >= 50 else "Reject"),
        "confidence": f"{min(95, score + 5)}%",
        "risk_factors": [
            {
                "factor": "Identity Verification",
                "score": 85 if kyc.get("identity_details") else 30,
                "status": "Verified" if kyc.get("identity_details") else "Missing",
            },
            {
                "factor": "Document Quality",
                "score": 78 if kyc.get("aadhaar_front") and kyc.get("pan_card") else 40,
                "status": "Good" if kyc.get("aadhaar_front") else "Poor",
            },
            {
                "factor": "Business Legitimacy",
                "score": 82 if kyc.get("business_details") else 35,
                "status": "Verified" if kyc.get("business_details", {}).get("gst_number") else "Unverified",
            },
            {
                "factor": "Bank Account Verification",
                "score": 90 if kyc.get("bank_details") else 20,
                "status": "Active" if kyc.get("bank_details") else "Not Provided",
            },
            {
                "factor": "Selfie Match",
                "score": 88 if kyc.get("selfie") else 0,
                "status": "Match" if kyc.get("selfie") else "Not Provided",
            },
        ],
        "document_verification": {
            "aadhaar": {
                "status": "Valid" if kyc.get("aadhaar_front") else "Not Uploaded",
                "number": kyc.get("identity_details", {}).get("aadhaar_number", "N/A"),
            },
            "pan": {
                "status": "Valid" if kyc.get("pan_card") else "Not Uploaded",
                "number": kyc.get("identity_details", {}).get("pan_number", "N/A"),
            },
            "selfie_match": "95% Match" if kyc.get("selfie") else "N/A",
        },
        "business_verification": {
            "gst_status": "Active" if kyc.get("business_details", {}).get("gst_number") else "Not Provided",
            "pan_status": "Valid",
            "address_verified": bool(kyc.get("business_details")),
        },
    }
