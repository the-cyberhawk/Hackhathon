"""
User-related Pydantic request/response models.
"""
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str


class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or phone


class ResetPasswordRequest(BaseModel):
    identifier: str  # email or phone
    otp: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
