from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
import shutil
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

class KYCStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DRAFT = "draft"

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class BasicDetails(BaseModel):
    full_name: str
    date_of_birth: str
    street: str
    city: str
    state: str
    pincode: str
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
    updated_at: str

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    existing_user = await db.users.find_one(
        {"$or": [{"email": user_data.email}, {"phone": user_data.phone}]},
        {"_id": 0}
    )
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or phone already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    otp = "123456"
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "phone": user_data.phone,
        "password_hash": hashed_pwd,
        "is_verified": False,
        "otp": otp,
        "otp_expiry": otp_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"message": "User created. OTP sent to phone.", "otp": otp, "user_id": user_id}

@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered")
    
    otp = "123456"
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.users.update_one(
        {"phone": request.phone},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry.isoformat()}}
    )
    
    return {"message": "OTP sent", "otp": otp}

@api_router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    otp_expiry = datetime.fromisoformat(user.get("otp_expiry"))
    if datetime.now(timezone.utc) > otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.users.update_one(
        {"phone": request.phone},
        {"$set": {"is_verified": True, "otp": None}}
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
            "is_verified": user["is_verified"]
        }
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0}
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
            "is_verified": user["is_verified"]
        }
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp = "123456"
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry.isoformat()}}
    )
    
    return {"message": "OTP sent", "otp": otp}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    user = await db.users.find_one(
        {"$or": [{"email": request.identifier}, {"phone": request.identifier}]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("otp") != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    otp_expiry = datetime.fromisoformat(user.get("otp_expiry"))
    if datetime.now(timezone.utc) > otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    hashed_pwd = hash_password(request.new_password)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hashed_pwd, "otp": None}}
    )
    
    return {"message": "Password reset successful"}

@api_router.get("/kyc/status")
async def get_kyc_status(current_user: dict = Depends(get_current_user)):
    kyc_data = await db.kyc_data.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not kyc_data:
        return {"status": "not_started", "message": "KYC not started"}
    
    return {
        "status": kyc_data.get("status", "draft"),
        "has_data": True,
        "updated_at": kyc_data.get("updated_at")
    }

@api_router.post("/kyc/step1")
async def save_step1(data: BasicDetails, current_user: dict = Depends(get_current_user)):
    kyc_data = await db.kyc_data.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    update_data = {
        "user_id": current_user["user_id"],
        "basic_details": data.model_dump(),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if kyc_data:
        await db.kyc_data.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": update_data}
        )
    else:
        await db.kyc_data.insert_one(update_data)
    
    return {"message": "Step 1 saved", "status": "success"}

@api_router.post("/kyc/step2")
async def save_step2(
    aadhaar_number: str = Form(...),
    pan_number: str = Form(...),
    aadhaar_front: UploadFile = File(...),
    aadhaar_back: UploadFile = File(...),
    pan_card: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    aadhaar_front_path = upload_dir / f"{uuid.uuid4()}_{aadhaar_front.filename}"
    aadhaar_back_path = upload_dir / f"{uuid.uuid4()}_{aadhaar_back.filename}"
    pan_card_path = upload_dir / f"{uuid.uuid4()}_{pan_card.filename}"
    
    with open(aadhaar_front_path, "wb") as f:
        shutil.copyfileobj(aadhaar_front.file, f)
    with open(aadhaar_back_path, "wb") as f:
        shutil.copyfileobj(aadhaar_back.file, f)
    with open(pan_card_path, "wb") as f:
        shutil.copyfileobj(pan_card.file, f)
    
    update_data = {
        "identity_details": {
            "aadhaar_number": aadhaar_number,
            "pan_number": pan_number
        },
        "aadhaar_front": str(aadhaar_front_path),
        "aadhaar_back": str(aadhaar_back_path),
        "pan_card": str(pan_card_path),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Step 2 saved", "status": "success"}

@api_router.post("/kyc/step3")
async def save_step3(data: BusinessDetails, current_user: dict = Depends(get_current_user)):
    update_data = {
        "business_details": data.model_dump(),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Step 3 saved", "status": "success"}

@api_router.post("/kyc/step4")
async def save_step4(
    account_holder_name: str = Form(...),
    bank_name: str = Form(...),
    account_number: str = Form(...),
    ifsc_code: str = Form(...),
    cancelled_cheque: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    update_data = {
        "bank_details": {
            "account_holder_name": account_holder_name,
            "bank_name": bank_name,
            "account_number": account_number,
            "ifsc_code": ifsc_code
        },
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if cancelled_cheque:
        upload_dir = Path("/app/uploads")
        cheque_path = upload_dir / f"{uuid.uuid4()}_{cancelled_cheque.filename}"
        with open(cheque_path, "wb") as f:
            shutil.copyfileobj(cancelled_cheque.file, f)
        update_data["cancelled_cheque"] = str(cheque_path)
    
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Step 4 saved", "status": "success"}

@api_router.post("/kyc/step5")
async def save_step5(
    selfie: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    upload_dir = Path("/app/uploads")
    selfie_path = upload_dir / f"{uuid.uuid4()}_{selfie.filename}"
    
    with open(selfie_path, "wb") as f:
        shutil.copyfileobj(selfie.file, f)
    
    update_data = {
        "selfie": str(selfie_path),
        "status": KYCStatus.DRAFT,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Step 5 saved", "status": "success"}

@api_router.post("/kyc/submit")
async def submit_kyc(current_user: dict = Depends(get_current_user)):
    kyc_data = await db.kyc_data.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not kyc_data:
        raise HTTPException(status_code=400, detail="No KYC data found")
    
    required_fields = ["basic_details", "identity_details", "business_details", "bank_details", "selfie"]
    missing = [f for f in required_fields if not kyc_data.get(f)]
    
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing data: {', '.join(missing)}")
    
    await db.kyc_data.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {
            "status": KYCStatus.PENDING,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "KYC submitted successfully", "status": "pending"}

@api_router.get("/kyc/data", response_model=KYCDataResponse)
async def get_kyc_data(current_user: dict = Depends(get_current_user)):
    kyc_data = await db.kyc_data.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not kyc_data:
        raise HTTPException(status_code=404, detail="No KYC data found")
    
    return kyc_data

@api_router.get("/user/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "is_verified": current_user["is_verified"]
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()