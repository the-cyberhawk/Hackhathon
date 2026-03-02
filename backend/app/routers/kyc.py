"""
KYC workflow routes — multi-step document collection and submission.

All routes are prefixed with /api/kyc via main.py router registration.
"""
import uuid
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import settings
from app.core.dependencies import get_current_user
from app.database import get_database
from app.models.kyc import (
    BasicDetails,
    BankDetails,
    BusinessDetails,
    KYCDataResponse,
    KYCStatus,
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kyc", tags=["KYC"])


def _save_upload(upload: UploadFile) -> str:
    """Persist an uploaded file and return its path as a string."""
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = settings.UPLOAD_DIR / f"{uuid.uuid4()}_{upload.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    logger.info(f"[UPLOAD] Saved file: {upload.filename} -> {dest}")
    return str(dest)


# ── Status ────────────────────────────────────────────────────────────────


@router.get("/status")
async def get_kyc_status(current_user: dict = Depends(get_current_user)):
    """Return the current KYC processing status for the authenticated user."""
    db = get_database()
    kyc_data = await db.kyc_data.find_one(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    )

    if not kyc_data:
        return {"status": "not_started", "message": "KYC not started"}

    return {
        "status": kyc_data.get("status", "draft"),
        "has_data": True,
        "updated_at": kyc_data.get("updated_at"),
    }


# ── Step 1 — Basic Details ────────────────────────────────────────────────


@router.post("/step1")
async def save_step1(
    data: BasicDetails, current_user: dict = Depends(get_current_user)
):
    """Save personal / address information."""
    logger.info(f"[STEP 1] User: {current_user['user_id']}")
    logger.info(f"[STEP 1] Received data: {data.model_dump()}")
    
    db = get_database()
    update_data = {
        "user_id": current_user["user_id"],
        "basic_details": data.model_dump(),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = await db.kyc_data.find_one(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    )
    if existing:
        await db.kyc_data.update_one(
            {"user_id": current_user["user_id"]}, {"$set": update_data}
        )
        logger.info(f"[STEP 1] Updated existing record for user: {current_user['user_id']}")
    else:
        await db.kyc_data.insert_one(update_data)
        logger.info(f"[STEP 1] Created new KYC record for user: {current_user['user_id']}")

    return {"message": "Step 1 saved", "status": "success"}


# ── Step 2 — Identity Documents ───────────────────────────────────────────


@router.post("/step2")
async def save_step2(
    aadhaar_number: str = Form(...),
    pan_number: str = Form(...),
    aadhaar_front: UploadFile = File(...),
    aadhaar_back: UploadFile = File(...),
    pan_card: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload Aadhaar & PAN images along with their numbers."""
    logger.info(f"[STEP 2] User: {current_user['user_id']}")
    logger.info(f"[STEP 2] Aadhaar: {aadhaar_number}, PAN: {pan_number}")
    logger.info(f"[STEP 2] Files: aadhaar_front={aadhaar_front.filename}, aadhaar_back={aadhaar_back.filename}, pan_card={pan_card.filename}")
    
    db = get_database()
    update_data = {
        "identity_details": {
            "aadhaar_number": aadhaar_number,
            "pan_number": pan_number,
        },
        "aadhaar_front": _save_upload(aadhaar_front),
        "aadhaar_back": _save_upload(aadhaar_back),
        "pan_card": _save_upload(pan_card),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]}, {"$set": update_data}, upsert=True
    )
    logger.info(f"[STEP 2] Saved identity documents for user: {current_user['user_id']}")
    return {"message": "Step 2 saved", "status": "success"}


# ── Step 3 — Business Details ─────────────────────────────────────────────


@router.post("/step3")
async def save_step3(
    data: BusinessDetails, current_user: dict = Depends(get_current_user)
):
    """Save business / GST information."""
    logger.info(f"[STEP 3] User: {current_user['user_id']}")
    logger.info(f"[STEP 3] Business data: {data.model_dump()}")
    
    db = get_database()
    update_data = {
        "business_details": data.model_dump(),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]}, {"$set": update_data}, upsert=True
    )
    logger.info(f"[STEP 3] Saved business details for user: {current_user['user_id']}")
    return {"message": "Step 3 saved", "status": "success"}


# ── Step 4 — Bank Details ─────────────────────────────────────────────────


@router.post("/step4")
async def save_step4(
    account_holder_name: str = Form(...),
    bank_name: str = Form(...),
    account_number: str = Form(...),
    ifsc_code: str = Form(...),
    cancelled_cheque: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Save bank account details and optional cancelled cheque."""
    logger.info(f"[STEP 4] User: {current_user['user_id']}")
    logger.info(f"[STEP 4] Bank: {bank_name}, Account: {account_number}, IFSC: {ifsc_code}")
    logger.info(f"[STEP 4] Cancelled cheque: {cancelled_cheque.filename if cancelled_cheque else 'None'}")
    
    db = get_database()
    update_data = {
        "bank_details": {
            "account_holder_name": account_holder_name,
            "bank_name": bank_name,
            "account_number": account_number,
            "ifsc_code": ifsc_code,
        },
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if cancelled_cheque:
        update_data["cancelled_cheque"] = _save_upload(cancelled_cheque)

    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]}, {"$set": update_data}, upsert=True
    )
    logger.info(f"[STEP 4] Saved bank details for user: {current_user['user_id']}")
    return {"message": "Step 4 saved", "status": "success"}


# ── Step 5 — Selfie ──────────────────────────────────────────────────────


@router.post("/step5")
async def save_step5(
    selfie: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a selfie for facial verification."""
    logger.info(f"[STEP 5] User: {current_user['user_id']}")
    logger.info(f"[STEP 5] Selfie file: {selfie.filename}")
    
    db = get_database()
    update_data = {
        "selfie": _save_upload(selfie),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]}, {"$set": update_data}, upsert=True
    )
    logger.info(f"[STEP 5] Saved selfie for user: {current_user['user_id']}")
    return {"message": "Step 5 saved", "status": "success"}


# ── Submit ────────────────────────────────────────────────────────────────


@router.post("/submit")
async def submit_kyc(current_user: dict = Depends(get_current_user)):
    """Validate completeness and mark KYC as pending review."""
    db = get_database()
    kyc_data = await db.kyc_data.find_one(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    )

    if not kyc_data:
        raise HTTPException(status_code=400, detail="No KYC data found")

    required = ["basic_details", "identity_details", "business_details", "bank_details", "selfie"]
    missing = [f for f in required if not kyc_data.get(f)]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Missing data: {', '.join(missing)}"
        )

    now = datetime.now(timezone.utc).isoformat()
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"status": KYCStatus.PENDING, "submitted_at": now, "updated_at": now}},
    )
    return {"message": "KYC submitted successfully", "status": "pending"}


# ── Retrieve data ─────────────────────────────────────────────────────────


@router.get("/data", response_model=KYCDataResponse)
async def get_kyc_data(current_user: dict = Depends(get_current_user)):
    """Return the full KYC record for the authenticated user."""
    db = get_database()
    kyc_data = await db.kyc_data.find_one(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    )

    if not kyc_data:
        raise HTTPException(status_code=404, detail="No KYC data found")

    return kyc_data
