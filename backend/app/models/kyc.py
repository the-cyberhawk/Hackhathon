"""
KYC-related Pydantic models and status enum.
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict


class KYCStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class BasicDetails(BaseModel):
    full_name: str
    date_of_birth: str
    street: str
    city: str
    state: str
    pincode: str
    # Optional social / web presence
    website_url: Optional[str] = None
    linkedin: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None


class IdentityDetails(BaseModel):
    aadhaar_number: str
    pan_number: str


class BusinessDetails(BaseModel):
    business_name: str
    business_type: str
    gst_number: Optional[str] = None
    business_street: str
    business_city: str
    business_state: str
    business_pincode: str


class BankDetails(BaseModel):
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str


class KYCDataResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user_id: str
    status: str
    basic_details: Optional[dict] = None
    identity_details: Optional[dict] = None
    business_details: Optional[dict] = None
    bank_details: Optional[dict] = None
    aadhaar_front: Optional[str] = None
    aadhaar_back: Optional[str] = None
    pan_card: Optional[str] = None
    cancelled_cheque: Optional[str] = None
    selfie: Optional[str] = None
    documents: Optional[dict] = None
    updated_at: str
