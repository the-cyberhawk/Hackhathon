import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class KYCAPITester:
    def __init__(self, base_url="https://fintech-verify-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_phone = f"98765{datetime.now().strftime('%H%M%S')}"

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers={k:v for k,v in headers.items() if k != 'Content-Type'})
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_signup(self):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={
                "email": self.test_email,
                "phone": self.test_phone,
                "password": "Test@1234"
            }
        )
        if success and 'user_id' in response:
            self.user_id = response['user_id']
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_verify_otp(self):
        """Test OTP verification"""
        success, response = self.run_test(
            "Verify OTP",
            "POST",
            "auth/verify-otp",
            200,
            data={
                "phone": self.test_phone,
                "otp": "123456"
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login(self, password="Test@1234"):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "identifier": self.test_email,
                "password": password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Login token: {self.token[:20]}...")
            return True
        return False

    def test_forgot_password(self):
        """Test forgot password"""
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data={"identifier": self.test_email}
        )
        return success

    def test_reset_password(self):
        """Test reset password"""
        success, response = self.run_test(
            "Reset Password",
            "POST",
            "auth/reset-password",
            200,
            data={
                "identifier": self.test_email,
                "otp": "123456",
                "new_password": "NewPass@123"
            }
        )
        return success

    def test_get_user_info(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get User Info",
            "GET",
            "user/me",
            200
        )
        return success

    def test_kyc_status(self):
        """Test KYC status"""
        success, response = self.run_test(
            "Get KYC Status",
            "GET",
            "kyc/status",
            200
        )
        return success

    def test_kyc_step1(self):
        """Test KYC Step 1 - Basic Details"""
        success, response = self.run_test(
            "KYC Step 1 - Basic Details",
            "POST",
            "kyc/step1",
            200,
            data={
                "full_name": "John Doe",
                "date_of_birth": "1990-01-01",
                "street": "123 Main Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        )
        return success

    def create_test_file(self, filename, content=b"test file content"):
        """Create a test file for upload"""
        test_file_path = Path(f"/tmp/{filename}")
        with open(test_file_path, "wb") as f:
            f.write(content)
        return test_file_path

    def test_kyc_step2(self):
        """Test KYC Step 2 - Identity Verification"""
        # Create test files
        aadhaar_front = self.create_test_file("aadhaar_front.jpg")
        aadhaar_back = self.create_test_file("aadhaar_back.jpg")
        pan_card = self.create_test_file("pan_card.jpg")
        
        try:
            files = {
                'aadhaar_front': open(aadhaar_front, 'rb'),
                'aadhaar_back': open(aadhaar_back, 'rb'),
                'pan_card': open(pan_card, 'rb')
            }
            
            data = {
                'aadhaar_number': '123456789012',
                'pan_number': 'ABCDE1234F'
            }
            
            success, response = self.run_test(
                "KYC Step 2 - Identity Verification",
                "POST",
                "kyc/step2",
                200,
                data=data,
                files=files
            )
            
            # Close files
            for f in files.values():
                f.close()
                
            return success
        except Exception as e:
            print(f"❌ Step 2 failed with error: {str(e)}")
            return False

    def test_kyc_step3(self):
        """Test KYC Step 3 - Business Details"""
        success, response = self.run_test(
            "KYC Step 3 - Business Details",
            "POST",
            "kyc/step3",
            200,
            data={
                "business_name": "Test Business Pvt Ltd",
                "business_type": "Private Limited",
                "gst_number": "22ABCDE1234F1Z5",
                "business_street": "456 Business Park",
                "business_city": "Bangalore",
                "business_state": "Karnataka",
                "business_pincode": "560001"
            }
        )
        return success

    def test_kyc_step4(self):
        """Test KYC Step 4 - Bank Details"""
        data = {
            'account_holder_name': 'John Doe',
            'bank_name': 'HDFC Bank',
            'account_number': '12345678901234',
            'ifsc_code': 'HDFC0001234'
        }
        
        # Step 4 uses form data, not JSON
        url = f"{self.base_url}/api/kyc/step4"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing KYC Step 4 - Bank Details...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, data=data, headers=headers)
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
            return success
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_kyc_step5(self):
        """Test KYC Step 5 - Selfie Verification"""
        selfie_file = self.create_test_file("selfie.jpg")
        
        try:
            files = {
                'selfie': open(selfie_file, 'rb')
            }
            
            success, response = self.run_test(
                "KYC Step 5 - Selfie Verification",
                "POST",
                "kyc/step5",
                200,
                files=files
            )
            
            files['selfie'].close()
            return success
        except Exception as e:
            print(f"❌ Step 5 failed with error: {str(e)}")
            return False

    def test_kyc_submit(self):
        """Test KYC submission"""
        success, response = self.run_test(
            "Submit KYC",
            "POST",
            "kyc/submit",
            200
        )
        return success

    def test_get_kyc_data(self):
        """Test get KYC data"""
        success, response = self.run_test(
            "Get KYC Data",
            "GET",
            "kyc/data",
            200
        )
        return success

def main():
    print("🚀 Starting KYC API Testing...")
    print("=" * 50)
    
    tester = KYCAPITester()
    
    # Test authentication flow
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_signup():
        print("❌ Signup failed, stopping tests")
        return 1
    
    if not tester.test_verify_otp():
        print("❌ OTP verification failed, stopping tests")
        return 1
    
    # Test user info
    tester.test_get_user_info()
    
    # Test KYC status
    tester.test_kyc_status()
    
    # Test forgot password flow
    tester.test_forgot_password()
    tester.test_reset_password()
    
    # Re-login after password reset
    if not tester.test_login("NewPass@123"):
        print("❌ Login after password reset failed")
        return 1
    
    # Test KYC flow
    print("\n📋 KYC WORKFLOW TESTS")
    print("-" * 30)
    
    tester.test_kyc_step1()
    tester.test_kyc_step2()
    tester.test_kyc_step3()
    tester.test_kyc_step4()
    tester.test_kyc_step5()
    
    # Test KYC submission
    tester.test_kyc_submit()
    
    # Test get KYC data
    tester.test_get_kyc_data()
    
    # Final KYC status check
    tester.test_kyc_status()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())