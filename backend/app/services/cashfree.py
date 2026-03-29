"""
Cashfree Verification API client.

Handles RSA signature generation and all KYC verification calls:
  - GST (GSTIN lookup)
  - PAN (identity check)
  - Bank Account (penny-drop sync)
  - Aadhaar (Bharat OCR — requires the image as bytes from S3)
"""

import time
import base64
import logging
import requests
from pathlib import Path

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding as asym_padding

from app.config import settings

logger = logging.getLogger(__name__)

# ── Internal helpers ──────────────────────────────────────────────────────────

def _load_public_key():
    """Load the Cashfree RSA public key from the path configured in settings."""
    key_path = Path(settings.CASHFREE_PUBLIC_KEY_PATH)
    # If relative, resolve from the backend/ root (two levels up from this file)
    if not key_path.is_absolute():
        key_path = Path(__file__).parent.parent.parent / key_path
    with open(key_path, "rb") as f:
        return serialization.load_pem_public_key(f.read())


def _generate_signature() -> tuple[str, str]:
    """
    Generate a Cashfree request signature.

    Returns:
        (signature_b64, unix_timestamp_str)
    """
    timestamp = str(int(time.time()))
    message = f"{settings.CASHFREE_CLIENT_ID}.{timestamp}".encode()

    public_key = _load_public_key()
    encrypted = public_key.encrypt(
        message,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None,
        ),
    )
    signature = base64.b64encode(encrypted).decode()
    return signature, timestamp


def _headers(signature: str, timestamp: str, extra: dict | None = None) -> dict:
    h = {
        "Content-Type": "application/json",
        "x-client-id": settings.CASHFREE_CLIENT_ID,
        "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
        "x-cf-signature": signature,
        "x-cf-timestamp": timestamp,
    }
    if extra:
        h.update(extra)
    return h


# ── Public API functions ──────────────────────────────────────────────────────

def verify_gst(gstin: str) -> dict:
    """Verify a GSTIN via Cashfree Verification API."""
    try:
        sig, ts = _generate_signature()
        resp = requests.post(
            f"{settings.CASHFREE_BASE_URL}/verification/gstin",
            headers=_headers(sig, ts),
            json={"GSTIN": gstin},
            timeout=15,
        )
        data = resp.json()
        logger.info(f"[CASHFREE] GST {gstin} → status={data.get('gst_in_status')}")
        return data
    except Exception as e:
        logger.warning(f"[CASHFREE] GST verification failed: {e}")
        return {"error": str(e)}


def verify_pan(pan: str) -> dict:
    """Verify a PAN number via Cashfree Verification API."""
    try:
        sig, ts = _generate_signature()
        resp = requests.post(
            f"{settings.CASHFREE_BASE_URL}/verification/pan",
            headers=_headers(sig, ts),
            json={"pan": pan},
            timeout=15,
        )
        data = resp.json()
        logger.info(f"[CASHFREE] PAN {pan} → valid={data.get('valid')}")
        return data
    except Exception as e:
        logger.warning(f"[CASHFREE] PAN verification failed: {e}")
        return {"error": str(e)}


def verify_bank_account(account_number: str, ifsc: str) -> dict:
    """Verify a bank account via Cashfree sync penny-drop API."""
    try:
        sig, ts = _generate_signature()
        resp = requests.post(
            f"{settings.CASHFREE_BASE_URL}/verification/bank-account/sync",
            headers=_headers(sig, ts),
            json={"bank_account": account_number, "ifsc": ifsc},
            timeout=20,
        )
        data = resp.json()
        logger.info(f"[CASHFREE] Bank {account_number}/{ifsc} → status={data.get('account_status')}")
        return data
    except Exception as e:
        logger.warning(f"[CASHFREE] Bank verification failed: {e}")
        return {"error": str(e)}


def verify_aadhaar_bytes(image_bytes: bytes, verification_id: str | None = None) -> dict:
    """
    Verify Aadhaar document via Cashfree Bharat OCR API.
    Accepts raw image bytes (fetched from S3 before calling this).
    """
    try:
        sig, ts = _generate_signature()
        vid = verification_id or f"aadhaar_{int(time.time())}"
        headers = {
            "x-client-id": settings.CASHFREE_CLIENT_ID,
            "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
            "x-cf-signature": sig,
            "x-cf-timestamp": ts,
            "x-api-version": "2024-12-01",
        }
        resp = requests.post(
            f"{settings.CASHFREE_BASE_URL}/verification/bharat-ocr",
            headers=headers,
            files={"file": ("aadhaar.jpg", image_bytes, "image/jpeg")},
            data={"verification_id": vid, "document_type": "AADHAAR"},
            timeout=30,
        )
        data = resp.json()
        logger.info(f"[CASHFREE] Aadhaar OCR → status={data.get('status')}")
        return data
    except Exception as e:
        logger.warning(f"[CASHFREE] Aadhaar verification failed: {e}")
        return {"error": str(e)}
