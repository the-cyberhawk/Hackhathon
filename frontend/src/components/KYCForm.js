import React, { useState } from 'react';
import { saveStep1, saveStep2, saveStep3, saveStep4, saveStep5, submitKyc } from '../api';

const STEPS = ['Personal', 'Identity', 'Business', 'Bank', 'Selfie'];

export default function KYCForm({ onComplete }) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Step 1
    const [basic, setBasic] = useState({
        full_name: '', date_of_birth: '', street: '', city: '', state: '', pincode: '',
        website_url: '', linkedin: '', facebook: '', instagram: '', twitter: '',
    });

    // Step 2
    const [identity, setIdentity] = useState({ aadhaar_number: '', pan_number: '' });
    const [aadhaarFront, setAadhaarFront] = useState(null);
    const [aadhaarBack, setAadhaarBack] = useState(null);
    const [panCard, setPanCard] = useState(null);

    // Step 3
    const [business, setBusiness] = useState({
        business_name: '', business_type: '', gst_number: '',
        business_street: '', business_city: '', business_state: '', business_pincode: '',
    });

    // Step 4
    const [bank, setBank] = useState({
        account_holder_name: '', bank_name: '', account_number: '', ifsc_code: '',
    });
    const [cancelledCheque, setCancelledCheque] = useState(null);

    // Step 5
    const [selfie, setSelfie] = useState(null);

    const upd = (setter) => (k) => (e) => setter((p) => ({ ...p, [k]: e.target.value }));

    const go = async (fn) => {
        setError(''); setSuccess(''); setLoading(true);
        try {
            await fn();
            setSuccess('Saved!');
            if (step < 4) setStep(step + 1);
        } catch (err) {
            setError(err.response?.data?.detail || 'Something went wrong');
        } finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        setError(''); setLoading(true);
        try {
            await submitKyc();
            setSuccess('KYC submitted successfully! 🎉');
            setTimeout(() => onComplete(), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Submission failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="fade-in">
            {/* Stepper */}
            <div className="stepper">
                {STEPS.map((label, i) => (
                    <div key={i} className={`step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
                        <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                        <span className="step-label">{label}</span>
                    </div>
                ))}
            </div>

            <div className="card">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Step 1 — Personal Details */}
                {step === 0 && (
                    <>
                        <div className="card-header">
                            <h2>Personal Details</h2>
                            <p>Tell us about yourself</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input placeholder="John Doe" value={basic.full_name} onChange={upd(setBasic)('full_name')} required />
                            </div>
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input type="date" value={basic.date_of_birth} onChange={upd(setBasic)('date_of_birth')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Street Address</label>
                            <input placeholder="123 Main Street" value={basic.street} onChange={upd(setBasic)('street')} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>City</label>
                                <input placeholder="Mumbai" value={basic.city} onChange={upd(setBasic)('city')} required />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input placeholder="Maharashtra" value={basic.state} onChange={upd(setBasic)('state')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Pincode</label>
                            <input placeholder="400001" value={basic.pincode} onChange={upd(setBasic)('pincode')} required />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={loading} onClick={() => go(() => saveStep1(basic))}>
                            {loading ? <span className="spinner" /> : 'Save & Continue →'}
                        </button>
                    </>
                )}

                {/* Step 2 — Identity */}
                {step === 1 && (
                    <>
                        <div className="card-header">
                            <h2>Identity Verification</h2>
                            <p>Upload your Aadhaar and PAN documents</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Aadhaar Number</label>
                                <input placeholder="1234 5678 9012" value={identity.aadhaar_number} onChange={upd(setIdentity)('aadhaar_number')} required />
                            </div>
                            <div className="form-group">
                                <label>PAN Number</label>
                                <input placeholder="ABCDE1234F" value={identity.pan_number} onChange={upd(setIdentity)('pan_number')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Aadhaar Front</label>
                            <input type="file" accept="image/*" onChange={(e) => setAadhaarFront(e.target.files[0])} required />
                        </div>
                        <div className="form-group">
                            <label>Aadhaar Back</label>
                            <input type="file" accept="image/*" onChange={(e) => setAadhaarBack(e.target.files[0])} required />
                        </div>
                        <div className="form-group">
                            <label>PAN Card</label>
                            <input type="file" accept="image/*" onChange={(e) => setPanCard(e.target.files[0])} required />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading} onClick={() => {
                                const fd = new FormData();
                                fd.append('aadhaar_number', identity.aadhaar_number);
                                fd.append('pan_number', identity.pan_number);
                                fd.append('aadhaar_front', aadhaarFront);
                                fd.append('aadhaar_back', aadhaarBack);
                                fd.append('pan_card', panCard);
                                go(() => saveStep2(fd));
                            }}>
                                {loading ? <span className="spinner" /> : 'Save & Continue →'}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 3 — Business */}
                {step === 2 && (
                    <>
                        <div className="card-header">
                            <h2>Business Details</h2>
                            <p>Tell us about your business</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Business Name</label>
                                <input placeholder="Acme Corp Pvt Ltd" value={business.business_name} onChange={upd(setBusiness)('business_name')} required />
                            </div>
                            <div className="form-group">
                                <label>Business Type</label>
                                <select value={business.business_type} onChange={upd(setBusiness)('business_type')} required>
                                    <option value="">Select type</option>
                                    <option value="Private Limited">Private Limited</option>
                                    <option value="LLP">LLP</option>
                                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>GST Number (optional)</label>
                            <input placeholder="22ABCDE1234F1Z5" value={business.gst_number} onChange={upd(setBusiness)('gst_number')} />
                        </div>
                        <div className="form-group">
                            <label>Business Address</label>
                            <input placeholder="456 Business Park" value={business.business_street} onChange={upd(setBusiness)('business_street')} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>City</label>
                                <input placeholder="Bangalore" value={business.business_city} onChange={upd(setBusiness)('business_city')} required />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input placeholder="Karnataka" value={business.business_state} onChange={upd(setBusiness)('business_state')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Pincode</label>
                            <input placeholder="560001" value={business.business_pincode} onChange={upd(setBusiness)('business_pincode')} required />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading} onClick={() => go(() => saveStep3(business))}>
                                {loading ? <span className="spinner" /> : 'Save & Continue →'}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 4 — Bank */}
                {step === 3 && (
                    <>
                        <div className="card-header">
                            <h2>Bank Details</h2>
                            <p>Enter your bank account information</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Account Holder Name</label>
                                <input placeholder="John Doe" value={bank.account_holder_name} onChange={upd(setBank)('account_holder_name')} required />
                            </div>
                            <div className="form-group">
                                <label>Bank Name</label>
                                <input placeholder="HDFC Bank" value={bank.bank_name} onChange={upd(setBank)('bank_name')} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Account Number</label>
                                <input placeholder="12345678901234" value={bank.account_number} onChange={upd(setBank)('account_number')} required />
                            </div>
                            <div className="form-group">
                                <label>IFSC Code</label>
                                <input placeholder="HDFC0001234" value={bank.ifsc_code} onChange={upd(setBank)('ifsc_code')} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Cancelled Cheque (optional)</label>
                            <input type="file" accept="image/*,.pdf" onChange={(e) => setCancelledCheque(e.target.files[0])} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading} onClick={() => {
                                const fd = new FormData();
                                fd.append('account_holder_name', bank.account_holder_name);
                                fd.append('bank_name', bank.bank_name);
                                fd.append('account_number', bank.account_number);
                                fd.append('ifsc_code', bank.ifsc_code);
                                if (cancelledCheque) fd.append('cancelled_cheque', cancelledCheque);
                                go(() => saveStep4(fd));
                            }}>
                                {loading ? <span className="spinner" /> : 'Save & Continue →'}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 5 — Selfie */}
                {step === 4 && (
                    <>
                        <div className="card-header">
                            <h2>Selfie Verification</h2>
                            <p>Upload a clear photo of yourself for face match</p>
                        </div>
                        <div className="form-group">
                            <label>Selfie Photo</label>
                            <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files[0])} required />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading} onClick={() => {
                                const fd = new FormData();
                                fd.append('selfie', selfie);
                                go(() => saveStep5(fd));
                            }}>
                                {loading ? <span className="spinner" /> : 'Save Selfie'}
                            </button>
                        </div>
                        <div style={{ marginTop: '1.25rem' }}>
                            <button className="btn btn-primary btn-block" disabled={loading} onClick={handleSubmit}
                                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                {loading ? <span className="spinner" /> : '🚀 Submit KYC for Review'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
