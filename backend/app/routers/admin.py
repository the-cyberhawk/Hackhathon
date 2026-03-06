
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import json
import boto3
from botocore.exceptions import ClientError

from app.database import get_database
from app.models.kyc import KYCStatus
from app.services.boto import get_s3_client
from app.config import settings

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
    
    # Get all verified users (merchants)
    users = await db.users.find(
        {"is_verified": True},
        {"_id": 0, "password_hash": 0, "otp": 0, "otp_expiry": 0}
    ).to_list(100)
    
    merchants = []
    for user in users:
        # Get KYC data if exists
        kyc = await db.kyc_data.find_one({"user_id": user["user_id"]}, {"_id": 0})
        
        # If no KYC data, create a minimal record
        if not kyc:
            kyc = {
                "user_id": user["user_id"],
                "status": "not_started",
                "basic_details": None,
                "identity_details": None,
                "business_details": None,
                "bank_details": None,
            }
        
        merchant_data = {
            "user_id": user["user_id"],
            "mid": user.get("mid") or kyc.get("mid"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "is_verified": user.get("is_verified"),
            "created_at": user.get("created_at"),
            "kyc_status": kyc.get("status", "not_started"),
            "basic_details": kyc.get("basic_details"),
            "identity_details": kyc.get("identity_details"),
            "business_details": kyc.get("business_details"),
            "bank_details": kyc.get("bank_details"),
            "documents": _get_document_urls(kyc) if kyc.get("status") != "not_started" else {},
            "admin_notes": kyc.get("admin_notes", ""),
            "ai_score": kyc.get("ai_score") or _generate_ai_score(kyc) if kyc.get("status") != "not_started" else 0,
            "risk_level": kyc.get("risk_level") or _calculate_risk_level(kyc) if kyc.get("status") != "not_started" else "N/A",
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
    
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0, "otp": 0, "otp_expiry": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    kyc = await db.kyc_data.find_one({"user_id": user_id}, {"_id": 0})
    
    # If no KYC data exists, create a minimal structure
    if not kyc:
        kyc = {
            "user_id": user_id,
            "status": "not_started",
            "basic_details": None,
            "identity_details": None,
            "business_details": None,
            "bank_details": None,
        }
    
    # Get stored AI report or use default structure pending generation
    ai_report = kyc.get("ai_report") if kyc.get("status") != "not_started" and kyc.get("ai_report") else {
        "recommendation": "Pending",
        "confidence": "0%",
        "risk_factors": [],
        "document_verification": {},
        "business_verification": {}
    }
    
    return {
        "user_id": user_id,
        "mid": user.get("mid") or kyc.get("mid"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "is_verified": user.get("is_verified"),
        "created_at": user.get("created_at"),
        "kyc_status": kyc.get("status", "not_started"),
        "basic_details": kyc.get("basic_details"),
        "identity_details": kyc.get("identity_details"),
        "business_details": kyc.get("business_details"),
        "bank_details": kyc.get("bank_details"),
        "documents": _get_document_urls(kyc) if kyc.get("status") != "not_started" else {},
        "admin_notes": kyc.get("admin_notes", ""),
        "ai_score": kyc.get("ai_score") or _generate_ai_score(kyc) if kyc.get("status") != "not_started" else 0,
        "risk_level": kyc.get("risk_level") or _calculate_risk_level(kyc) if kyc.get("status") != "not_started" else "N/A",
        "ai_report": ai_report,
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


# ── Generate AI Report ────────────────────────────────────────────────────


@router.post("/ai-report/{user_id}")
async def generate_ai_report(user_id: str):
    """
    Generate an AI risk report for a merchant using Amazon Bedrock.
    Sends KYC data to Claude with a simple prompt and returns structured JSON.
    Falls back to deterministic mock if Bedrock is not configured/reachable.
    """
    logger.info(f"[AI REPORT] Generating for user_id={user_id}")

    db = get_database()
    kyc = await db.kyc_data.find_one({"user_id": user_id}, {"_id": 0})
    if not kyc:
        raise HTTPException(status_code=404, detail="Merchant not found")

    # Build a concise merchant summary for the prompt
    bd = kyc.get("basic_details") or {}
    biz = kyc.get("business_details") or {}
    bank = kyc.get("bank_details") or {}
    identity = kyc.get("identity_details") or {}

    merchant_summary = f"""
Merchant KYC Summary:
- Name: {bd.get('full_name', 'N/A')}
- Business: {biz.get('business_name', 'N/A')} ({biz.get('business_type', 'N/A')})
- GST: {biz.get('gst_number', 'Not provided')}
- PAN: {identity.get('pan_number', 'Not provided')}
- Aadhaar: {'Provided' if identity.get('aadhaar_number') else 'Not provided'}
- Bank: {bank.get('bank_name', 'N/A')}, IFSC: {bank.get('ifsc_code', 'N/A')}
- Documents uploaded: Aadhaar={'Yes' if kyc.get('aadhaar_front') else 'No'}, PAN={'Yes' if kyc.get('pan_card') else 'No'}, Cheque={'Yes' if kyc.get('cancelled_cheque') else 'No'}, Selfie={'Yes' if kyc.get('selfie') else 'No'}
- City: {biz.get('business_city', 'N/A')}, State: {biz.get('business_state', 'N/A')}
""".strip()

    # ── AWS Rekognition Face Comparison ────────────────────────────────────
    # Compare selfie against Aadhaar and PAN card using the same IAM credentials
    from app.config import settings as _cfg
    from urllib.parse import urlparse

    def _s3_obj_from_url(url: str) -> dict | None:
        """Extract {'Bucket': ..., 'Name': ...} from an S3 public URL."""
        if not url:
            return None
        try:
            parsed = urlparse(url)
            # https://<bucket>.s3.<region>.amazonaws.com/<key>
            bucket = parsed.netloc.split(".")[0]
            key = parsed.path.lstrip("/")
            return {"Bucket": bucket, "Name": key}
        except Exception:
            return None

    def _rekognition_compare(rek_client, source_url: str, target_url: str) -> dict:
        """
        Compare faces between source (ID doc) and target (selfie).
        Returns {'similarity': float|None, 'status': str}
        """
        src = _s3_obj_from_url(source_url)
        tgt = _s3_obj_from_url(target_url)
        if not src or not tgt:
            return {"similarity": None, "status": "image_unavailable"}
        try:
            resp = rek_client.compare_faces(
                SourceImage={"S3Object": src},
                TargetImage={"S3Object": tgt},
                SimilarityThreshold=70,
            )
            matches = resp.get("FaceMatches", [])
            if matches:
                sim = round(matches[0]["Similarity"], 1)
                return {"similarity": sim, "status": "match" if sim >= 80 else "low_match"}
            return {"similarity": 0.0, "status": "no_match"}
        except Exception as rek_err:
            err_msg = str(rek_err)
            if "InvalidParameterException" in err_msg or "no faces" in err_msg.lower():
                return {"similarity": None, "status": "no_face_detected"}
            if "AccessDenied" in err_msg or "not authorized" in err_msg:
                return {"similarity": None, "status": "access_denied"}
            return {"similarity": None, "status": f"error: {type(rek_err).__name__}"}

    face_match = {
        "selfie_vs_aadhaar": {"similarity": None, "status": "skipped"},
        "selfie_vs_pan": {"similarity": None, "status": "skipped"},
    }

    try:
        import boto3 as _boto3
        rek = _boto3.client(
            "rekognition",
            region_name="us-east-1",
            aws_access_key_id=_cfg.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=_cfg.AWS_SECRET_ACCESS_KEY,
        )
        selfie_url = kyc.get("selfie")
        if selfie_url:
            if kyc.get("aadhaar_front"):
                face_match["selfie_vs_aadhaar"] = _rekognition_compare(
                    rek, kyc["aadhaar_front"], selfie_url
                )
            if kyc.get("pan_card"):
                face_match["selfie_vs_pan"] = _rekognition_compare(
                    rek, kyc["pan_card"], selfie_url
                )
        logger.info(
            f"[AI REPORT] Rekognition — aadhaar: {face_match['selfie_vs_aadhaar']['status']} "
            f"| pan: {face_match['selfie_vs_pan']['status']}"
        )
    except Exception as rek_err:
        logger.warning(f"[AI REPORT] Rekognition setup failed: {rek_err}")

    # Summarise face match for the Bedrock prompt
    def _face_summary(result: dict) -> str:
        s = result["status"]
        sim = result.get("similarity")
        if s == "match":       return f"MATCH ({sim}% similarity)"
        if s == "low_match":   return f"LOW MATCH ({sim}% similarity — below 80% threshold)"
        if s == "no_match":    return "NO MATCH (faces detected but do not match)"
        if s == "no_face_detected": return "NO FACE detected in image"
        if s == "image_unavailable": return "Image not uploaded"
        return s

    face_match_context = (
        f"- Selfie vs Aadhaar: {_face_summary(face_match['selfie_vs_aadhaar'])}\n"
        f"- Selfie vs PAN: {_face_summary(face_match['selfie_vs_pan'])}"
    )

    # Pull the selfie-vs-aadhaar similarity for the prompt and document section
    rek_selfie_sim = face_match.get("selfie_vs_aadhaar", {}).get("similarity")
    rek_selfie_status = face_match.get("selfie_vs_aadhaar", {}).get("status", "skipped")

    prompt = f"""You are a payment gateway risk analyst. Analyze this merchant's KYC data and return a comprehensive JSON risk report.

{merchant_summary}

AWS Rekognition Face Verification Results:
{face_match_context}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "risk_score": <0-100, higher = more risk>,
  "risk_level": "<Low|Medium|High>",
  "recommendation": "<APPROVE|MANUAL REVIEW|REJECT>",
  "confidence": "<High|Medium|Low>",
  "summary": "<2-3 sentence plain English assessment>",
  "flags": [<list of specific risk flag strings, or empty list>],
  "risk_factors": [
    {{"factor": "Document Authenticity", "score": <0-100>, "status": "<Good|Warning|Critical>"}},
    {{"factor": "Identity Match", "score": <0-100>, "status": "<Good|Warning|Critical>"}},
    {{"factor": "Business Legitimacy", "score": <0-100>, "status": "<Good|Warning|Critical>"}},
    {{"factor": "Website Trust", "score": <0-100>, "status": "<Good|Warning|Critical>"}},
    {{"factor": "Financial Profile", "score": <0-100>, "status": "<Good|Warning|Critical>"}},
    {{"factor": "Social Media Presence", "score": <0-100>, "status": "<Good|Warning|Critical>"}}
  ],
  "document_verification": {{
    "aadhaar_card": {{"status": "<Valid|Invalid|Not Uploaded>", "confidence": <0-100>}},
    "pan_card": {{"status": "<Valid|Invalid|Not Uploaded>", "confidence": <0-100>}},
    "selfie_match": {{"match_percentage": {round(rek_selfie_sim, 1) if rek_selfie_sim else "N/A"}, "status": "<Strong Match|Low Match|No Match|No Face Detected|Not Uploaded>"}}
  }},
  "business_verification": {{
    "gst_status": "<Active|Not Provided|Invalid>",
    "pan_status": "<Valid|Not Provided>",
    "address_verified": <true|false>,
    "business_age": "<e.g. 3 years 2 months or Unknown>",
    "founder_info": "<one line about founder credibility based on available data>"
  }},
  "social_media": {{
    "overall_score": <0-100>,
    "platforms": {{
      "linkedin": {{"status": "<Active|Not Found>", "followers": <estimated number>, "engagement": "<High|Medium|Low>"}},
      "facebook": {{"status": "<Active|Not Found>", "followers": <estimated number>, "engagement": "<High|Medium|Low>"}},
      "instagram": {{"status": "<Active|Not Found>", "followers": <estimated number>, "engagement": "<High|Medium|Low>"}},
      "twitter": {{"status": "<Active|Not Found>", "followers": <estimated number>, "engagement": "<High|Medium|Low>"}}
    }},
    "summary": "<one sentence summary of social media credibility>"
  }},
  "financial_profile": {{
    "score": <0-100>,
    "business_age": "<e.g. 3 years 2 months>",
    "estimated_revenue": "<e.g. ₹5-10 Cr annually>",
    "founder_credibility": "<High|Medium|Low> - <brief reason>",
    "registration_status": "<status string>",
    "financial_stability": "<brief assessment>"
  }}
}}"""

    bedrock_used = False
    report_data = None

    # ── Try Bedrock ────────────────────────────────────────────────────────
    try:
        from app.config import settings
        import json as _json

        MODEL_ID = settings.AWS_BEDROCK_MODEL_ID
        is_llama = "llama" in MODEL_ID.lower()

        # Payload structure depends on model family
        if is_llama:
            payload = {
                "prompt": f"<s>[INST] {prompt} [/INST]",
                "max_gen_len": 2048,
                "temperature": 0.7,
                "top_p": 0.9
            }
        else:
            # Anthropic style (default)
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}],
                    }
                ],
            }

        if settings.AWS_ACCESS_KEY_ID:
            # ── Primary: IAM credential (boto3) ─────────────────────────────
            import boto3

            client = boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_BEDROCK_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            response = client.invoke_model(
                modelId=MODEL_ID,
                body=_json.dumps(payload),
            )
            resp_body = _json.loads(response["body"].read())
            raw_text = resp_body.get("generation") if is_llama else resp_body["content"][0]["text"]
            logger.info(f"[AI REPORT] Bedrock IAM call success for {user_id} using {MODEL_ID}")

        elif settings.AWS_BEDROCK_API_KEY:
            # ── Fallback: Bedrock API Key (Bearer token) ─────────────────────
            import requests as _req

            endpoint = (
                f"https://bedrock-runtime.{settings.AWS_BEDROCK_REGION}.amazonaws.com"
                f"/model/{MODEL_ID}/invoke"
            )
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.AWS_BEDROCK_API_KEY}",
            }
            resp = _req.post(endpoint, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            resp_json = resp.json()
            raw_text = resp_json.get("generation") if is_llama else resp_json["content"][0]["text"]
            logger.info(f"[AI REPORT] Bedrock API key call success for {user_id} using {MODEL_ID}")

        else:
            raise ValueError("No Bedrock credentials configured")

        # Strip markdown code fences Claude sometimes adds
        text = raw_text.strip()
        if "```" in text:
            start = text.find("{")
            end = text.rfind("}") + 1
            text = text[start:end]

        report_data = _json.loads(text)
        bedrock_used = True
        logger.info(
            f"[AI REPORT] score={report_data.get('risk_score')} "
            f"level={report_data.get('risk_level')} rec={report_data.get('recommendation')}"
        )

    except Exception as e:
        logger.warning(f"[AI REPORT] Bedrock call failed ({type(e).__name__}): {e} — using deterministic mock")


    # ── Deterministic mock (same rich schema as the Bedrock response) ─────────
    if not report_data:
        score = _generate_ai_score(kyc)
        risk_level = _calculate_risk_level(kyc)
        has_docs = all([kyc.get("aadhaar_front"), kyc.get("pan_card")])
        has_selfie = bool(kyc.get("selfie"))
        has_bank = bool(bank.get("ifsc_code") and bank.get("bank_name"))
        has_gst = bool(biz.get("gst_number"))
        has_pan = bool(identity.get("pan_number"))
        has_aadhaar = bool(identity.get("aadhaar_number"))

        flags = []
        if not has_docs:  flags.append("Missing mandatory KYC documents")
        if not has_gst:   flags.append("GST number not provided")
        if not has_bank:  flags.append("Incomplete bank details")
        if not has_selfie: flags.append("Selfie not uploaded – face verification skipped")
        if score < 50:    flags.append("Low overall risk score – manual review required")

        recommendation = "APPROVE" if score >= 70 else ("MANUAL REVIEW" if score >= 45 else "REJECT")

        # Document score based on what's uploaded + Rekognition result
        id_score = 90 if has_docs else 40
        selfie_score = 0
        selfie_status_label = "Not Uploaded"
        if rek_selfie_sim:
            selfie_score = rek_selfie_sim
            selfie_status_label = "Strong Match" if rek_selfie_sim >= 80 else "Low Match"
        elif rek_selfie_status == "no_face_detected":
            selfie_status_label = "No Face Detected"
        elif rek_selfie_status == "no_match":
            selfie_status_label = "No Match"
            flags.append("Selfie does not match Aadhaar – identity mismatch risk")

        biz_name = biz.get("business_name", "the business")
        full_name = bd.get("full_name", "The applicant")

        report_data = {
            "risk_score": score,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "confidence": "High" if has_docs and has_gst else "Medium",
            "summary": (
                f"{full_name} operates {biz_name} "
                f"({'GST registered' if has_gst else 'no GST number provided'}) with a computed risk score of {score}/100. "
                f"{'All key KYC documents are present.' if has_docs else 'Some mandatory documents are missing.'} "
                f"Recommendation: {recommendation}."
            ),
            "flags": flags if flags else ["No major risk flags detected"],
            "risk_factors": [
                {"factor": "Document Authenticity", "score": 90 if has_docs else 40, "status": "Good" if has_docs else "Critical"},
                {"factor": "Identity Match",         "score": int(rek_selfie_sim or 0) if rek_selfie_sim else (70 if has_aadhaar else 30), "status": "Good" if (rek_selfie_sim or 0) >= 80 else ("Warning" if has_aadhaar else "Critical")},
                {"factor": "Business Legitimacy",    "score": 80 if has_gst else 50, "status": "Good" if has_gst else "Warning"},
                {"factor": "Website Trust",          "score": 75, "status": "Good"},
                {"factor": "Financial Profile",      "score": 80 if has_bank else 50, "status": "Good" if has_bank else "Warning"},
                {"factor": "Social Media Presence",  "score": 70, "status": "Good"},
            ],
            "document_verification": {
                "aadhaar_card": {
                    "status": "Valid" if kyc.get("aadhaar_front") else "Not Uploaded",
                    "confidence": 96 if kyc.get("aadhaar_front") else 0,
                },
                "pan_card": {
                    "status": "Valid" if kyc.get("pan_card") else "Not Uploaded",
                    "confidence": 94 if kyc.get("pan_card") else 0,
                },
                "selfie_match": {
                    "match_percentage": round(rek_selfie_sim, 1) if rek_selfie_sim else "N/A",
                    "status": selfie_status_label,
                },
            },
            "business_verification": {
                "gst_status": "Active" if has_gst else "Not Provided",
                "pan_status": "Valid" if has_pan else "Not Provided",
                "address_verified": bool(biz.get("business_city") or biz.get("business_state")),
                "business_age": "Unknown",
                "founder_info": f"{full_name} – KYC verified applicant",
            },
            "social_media": {
                "overall_score": 70,
                "platforms": {
                    "linkedin":  {"status": "Active", "followers": 1200, "engagement": "Medium"},
                    "facebook":  {"status": "Active", "followers": 800,  "engagement": "Medium"},
                    "instagram": {"status": "Active", "followers": 500,  "engagement": "Low"},
                    "twitter":   {"status": "Not Found", "followers": 0, "engagement": "Low"},
                },
                "summary": "Moderate social media presence; LinkedIn profile adds credibility.",
            },
            "financial_profile": {
                "score": 75 if has_bank else 50,
                "business_age": "Unknown",
                "estimated_revenue": "To be assessed",
                "founder_credibility": f"{'High' if has_gst else 'Medium'} – {'GST registered business owner' if has_gst else 'No GST, limited verification'}",
                "registration_status": "Registered" if has_gst or has_pan else "Partially registered",
                "financial_stability": "Stable" if has_bank else "Pending bank verification",
            },
        }

    # Also update merchant's ai_score and risk_level in DB
    await db.kyc_data.update_one(
        {"user_id": user_id},
        {"$set": {
            "ai_score": report_data["risk_score"],
            "risk_level": report_data["risk_level"],
            "ai_report": report_data,
            "ai_report_generated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {
        "user_id": user_id,
        "source": "bedrock" if bedrock_used else "mock",
        "model": settings.AWS_BEDROCK_MODEL_ID if bedrock_used else "deterministic-mock",
        "face_match": face_match,
        **report_data,
    }


# ── Helper Functions ──────────────────────────────────────────────────────


def _extract_s3_key_from_url(s3_url: str, bucket_name: str, region: str) -> str:
    """
    Extract S3 key from full S3 URL.
    
    Example: https://bucket.s3.region.amazonaws.com/folder/file.jpg -> folder/file.jpg
    """
    if not s3_url:
        return None
        
    # Check if it's already just a key (doesn't start with http)
    if not s3_url.startswith("http"):
        return s3_url
    
    # Extract key from URL pattern: https://bucket.s3.region.amazonaws.com/KEY
    try:
        url_prefix = f"https://{bucket_name}.s3.{region}.amazonaws.com/"
        if s3_url.startswith(url_prefix):
            return s3_url[len(url_prefix):]
        
        # Alternative format: https://s3.region.amazonaws.com/bucket/KEY
        alt_prefix = f"https://s3.{region}.amazonaws.com/{bucket_name}/"
        if s3_url.startswith(alt_prefix):
            return s3_url[len(alt_prefix):]
            
        # If we can't parse it, return as-is
        logger.warning(f"[ADMIN] Could not extract S3 key from URL: {s3_url}")
        return s3_url
    except Exception as e:
        logger.warning(f"[ADMIN] Error extracting S3 key: {e}")
        return s3_url


def _get_document_urls(kyc: dict) -> dict:
    """Convert S3 document URLs/keys to presigned URLs."""
    documents = {}
    doc_fields = ["aadhaar_front", "aadhaar_back", "pan_card", "cancelled_cheque", "selfie"]
    
    try:
        s3_client = get_s3_client()
        bucket_name = s3_client.bucket_name
        region = s3_client.region
        
        logger.info(f"[ADMIN] S3 Config - Bucket: {bucket_name}, Region: {region}")
        
        for field in doc_fields:
            stored_value = kyc.get(field)
            if stored_value:
                try:
                    logger.info(f"[ADMIN] Processing {field}: {stored_value}")
                    # Extract just the S3 key from the full URL if needed
                    s3_key = _extract_s3_key_from_url(stored_value, bucket_name, region)
                    logger.info(f"[ADMIN] Extracted key for {field}: {s3_key}")
                    
                    if s3_key:
                        # Generate presigned URL valid for 1 hour
                        presigned_url = s3_client.generate_presigned_url(s3_key, expiration=3600)
                        documents[field] = presigned_url if presigned_url else stored_value
                    else:
                        documents[field] = stored_value
                except Exception as field_error:
                    logger.warning(f"[ADMIN] Error processing {field}: {field_error}")
                    documents[field] = stored_value
            else:
                documents[field] = None
    except Exception as e:
        logger.warning(f"[ADMIN] Error generating presigned URLs: {e}")
        # Fallback to original values
        for field in doc_fields:
            documents[field] = kyc.get(field)
    
    return documents


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
