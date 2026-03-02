# Cashfree KYC Verification System

A complete KYC (Know Your Customer) verification platform with dual portals: Merchant onboarding and Admin review system.

## 🌐 Live URLs

- **Merchant Portal**: https://fintech-verify-2.preview.emergentagent.com
- **Admin Portal**: https://fintech-verify-2.preview.emergentagent.com/admin

## 📋 Features

### PART 1: Merchant KYC Portal

#### Authentication
- **Split-screen design** with professional fintech aesthetic
- Login with email/phone + password
- Signup with OTP verification (Demo OTP: 123456)
- Forgot password flow with OTP reset
- Session persistence with JWT tokens

#### Multi-Step KYC Form (5 Steps)
1. **Basic Details**
   - Full Name, Date of Birth
   - Complete Address (Street, City, State, Pincode)
   - **Website URL (NEW - Optional field)**
   
2. **Identity Verification**
   - Aadhaar Card Number + Upload (Front & Back)
   - PAN Card Number + Upload
   - File preview functionality

3. **Business Details**
   - Business Name, Type (dropdown)
   - GST Number (optional)
   - Complete Business Address

4. **Bank Details**
   - Account Holder Name, Bank Name
   - Account Number, IFSC Code
   - Cancelled Cheque Upload (optional)

5. **Selfie Verification**
   - Live selfie/image upload
   - Preview before submission

#### Features
- Progress bar tracking (20% per step)
- Save as Draft functionality
- Form validation (frontend + backend)
- Real-time file preview
- Success screen after submission
- Dashboard with KYC status

---

### PART 2: Admin/Reviewer Portal

#### Admin Login
- **Credentials**: `admin` / `admin`
- Session-based authentication
- Separate portal at `/admin`

#### Dashboard Features
- **List of 3 Hardcoded Merchants**:
  1. TechVenture Solutions (Approved, Score: 92, Low Risk)
  2. QuickPay Merchants (Rejected, Score: 34, High Risk)
  3. Global Imports & Exports (Manual Review, Score: 68, Medium Risk)

- **Filter by Status**:
  - All
  - Approved
  - Rejected
  - Manual Review

- **Display Information**:
  - Merchant Name, Email, Phone
  - Website URL (clickable)
  - AI Score (color-coded: Green 75+, Yellow 50-74, Red <50)
  - Risk Level Badge (Low/Medium/High)
  - Current Status

#### Merchant Detail View
**4 Tabs:**

1. **Overview Tab**
   - Basic Details (with Website URL)
   - Identity Details
   - Business Details
   - Bank Details

2. **Documents Tab**
   - Preview placeholders for:
     - Aadhaar Front/Back
     - PAN Card
     - Selfie
     - Cancelled Cheque

3. **AI Report Tab**
   - AI Recommendation (Approve/Reject/Manual Review)
   - Risk Factor Analysis (5 factors with scores)
   - Document Verification (Aadhaar, PAN, Selfie match)
   - Business Verification (GST, PAN status, Address)

4. **Website Tab**
   - Website Risk Analysis
   - Trust Score
   - SSL Certificate status
   - Domain Age
   - Content Quality assessment
   - Red Flags (if any)

#### Agent Controls
- **Force Approve** (Green button)
- **Force Reject** (Red button)
- **Manual Review** (Gray button)
- **Agent Notes** (Free text area)
- **Save Notes** functionality
- Real-time status updates

#### AI Investigation Assistant (Mock Chatbot)
- Sticky sidebar chatbot
- **Quick Questions**:
  - "Why was this approved?"
  - "Why was this rejected?"
  - "Why manual review?"
  - "Is PAN valid?"
  - "Website info"
  - "Risk level"
- Predefined merchant-specific responses
- Natural conversation interface

---

## 🎨 Design System

**Minimalist Monochrome Theme**
- Primary: Black (#09090B)
- Background: White (#FFFFFF)
- Borders: Gray (#E4E4E7)
- Accent: Green (success), Red (error), Yellow (warning)

**Typography**
- Headings: Chivo (Bold, 700/900)
- Body: Inter (Regular, 400/500)
- Financial Data: JetBrains Mono

**Components**
- Sharp/minimal rounded corners
- 1px borders
- No gradients (strict monochrome)
- Subtle shadows
- Clean spacing (2-3x normal)

---

## 🔧 Technical Stack

### Frontend
- React 19
- React Router v7
- Tailwind CSS
- Shadcn UI Components
- Axios for API calls
- Sonner for toasts
- Lucide React for icons

### Backend
- FastAPI (Python)
- MongoDB (Motor async driver)
- JWT authentication
- bcrypt for password hashing
- File upload support (multipart/form-data)

### Database
- MongoDB collections:
  - `users` (email, phone, password_hash, otp, is_verified)
  - `kyc_data` (all 5 steps, files, status)

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py              # FastAPI app with all endpoints
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuthPage.js           # Login/Signup
│   │   │   ├── Dashboard.js          # Merchant dashboard
│   │   │   ├── KYCForm.js            # 5-step KYC form
│   │   │   ├── SuccessPage.js        # Success screen
│   │   │   └── admin/
│   │   │       ├── AdminAuth.js      # Admin login
│   │   │       ├── AdminDashboard.js # Merchant list
│   │   │       └── MerchantDetail.js # Detail view
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn components
│   │   │   └── admin/
│   │   │       └── AIChatbot.js      # Mock AI assistant
│   │   ├── data/
│   │   │   └── mockMerchants.js      # Hardcoded data
│   │   ├── App.js                    # Routes
│   │   ├── App.css                   # Component styles
│   │   └── index.css                 # Global styles
│   ├── package.json
│   └── .env                   # Frontend environment variables
├── uploads/                   # Local file storage
└── design_guidelines.json     # Design system
```

---

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/send-otp` - Send OTP (mock: 123456)
- `POST /api/auth/verify-otp` - Verify OTP & get token
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset with OTP

### KYC
- `GET /api/kyc/status` - Get KYC status
- `POST /api/kyc/step1` - Save basic details
- `POST /api/kyc/step2` - Upload identity docs
- `POST /api/kyc/step3` - Save business details
- `POST /api/kyc/step4` - Save bank details + cheque
- `POST /api/kyc/step5` - Upload selfie
- `POST /api/kyc/submit` - Final submission
- `GET /api/kyc/data` - Get saved KYC data

### User
- `GET /api/user/me` - Get current user info

---

## 🧪 Testing Guide

### Merchant Portal Testing
1. Navigate to https://fintech-verify-2.preview.emergentagent.com
2. Click "Sign Up"
3. Fill form with any valid data
4. Enter OTP: `123456`
5. Complete all 5 KYC steps
6. Verify success page

### Admin Portal Testing
1. Navigate to https://fintech-verify-2.preview.emergentagent.com/admin
2. Login with `admin` / `admin`
3. View 3 merchants with different statuses
4. Click on any merchant
5. Test all 4 tabs (Overview, Documents, AI Report, Website)
6. Test Agent Controls (Approve/Reject/Manual Review)
7. Type in chatbot: "Is PAN valid?" or other quick questions
8. Test filters (All, Approved, Rejected, Manual Review)

---

## 📊 Mock Merchant Data

### Merchant 1: TechVenture Solutions
- **Status**: Approved
- **AI Score**: 92/100
- **Risk**: Low
- **Reason**: All checks passed, legitimate business

### Merchant 2: QuickPay Merchants
- **Status**: Rejected
- **AI Score**: 34/100
- **Risk**: High
- **Reason**: Document tampering, fraudulent website, PAN invalid

### Merchant 3: Global Imports & Exports
- **Status**: Manual Review
- **AI Score**: 68/100
- **Risk**: Medium
- **Reason**: New business, limited online presence

---

## 💡 Key Features Implemented

✅ **Part 1 Enhancements**
- Added optional "Website URL" field in Step 1 (Basic Details)
- Updated backend model to accept website_url
- Updated frontend KYC form with new field

✅ **Part 2 Admin Portal** (Completely New)
- Separate authentication system (admin/admin)
- Dashboard with 3 hardcoded merchants
- Advanced filtering (All, Approved, Rejected, Manual Review)
- Detailed merchant view with 4 tabs
- Complete AI Report with scores and recommendations
- Website risk analysis
- Mock AI Chatbot with predefined responses
- Agent controls (Approve/Reject/Manual Review)
- Custom notes functionality
- Real-time status changes
- Clean fintech design matching merchant portal

---

## 🎯 Demo Credentials

**Merchant Portal**
- Create new account via signup
- OTP: `123456` (works for all phone numbers)

**Admin Portal**
- Username: `admin`
- Password: `admin`

---

## 🔐 Security Notes

- This is a **demo/prototype** application
- No real AI integration (all responses are hardcoded)
- Mock OTP (always 123456)
- No backend for admin portal (UI only with hardcoded data)
- Local file storage (not production-ready)
- JWT tokens stored in localStorage

---

## 📝 Future Enhancements (Not Implemented)

- Real AI integration for document verification
- Live face detection/liveness check
- Real-time website scraping
- Backend for admin portal
- Database integration for admin actions
- Email/SMS notifications
- Audit logs
- Role-based access control
- Production-grade file storage (S3/Cloud Storage)

---

## 🎨 Design Highlights

- Strict minimalist monochrome palette
- Professional fintech aesthetic
- Clean, spacious layouts
- Color-coded risk indicators
- Intuitive navigation
- Responsive design
- Consistent component styling
- Modern UI with Shadcn components

---

Built with ❤️ for Cashfree Payments KYC Demo
