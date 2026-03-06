import React, { useEffect, useState } from 'react';
import { getKycStatus, getKycData } from '../api';
import KYCForm from '../components/KYCForm';

export default function Dashboard({ user, onLogout }) {
    const [status, setStatus] = useState(null);
    const [kycData, setKycData] = useState(null);
    const [showKyc, setShowKyc] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const { data } = await getKycStatus();
            setStatus(data);
            // If user has KYC data, fetch it
            if (data.status !== 'not_started') {
                try {
                    const kycRes = await getKycData();
                    setKycData(kycRes.data);
                } catch { /* no data yet */ }
            }
        } catch {
            setStatus({ status: 'not_started' });
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchStatus(); }, []);

    const badgeClass = {
        not_started: 'badge-draft',
        draft: 'badge-draft',
        pending: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
    };

    const statusLabels = {
        not_started: 'Not Started',
        draft: 'Draft',
        pending: 'Under Review',
        approved: 'Approved ✓',
        rejected: 'Rejected',
    };

    const statusDescriptions = {
        not_started: 'Begin your KYC verification to start accepting payments.',
        draft: 'You have unsaved progress. Continue filling in your details.',
        pending: 'Your KYC application is being reviewed by our team.',
        approved: 'Congratulations! Your KYC is verified and approved.',
        rejected: 'Your KYC was rejected. Please re-submit with correct information.',
    };

    if (showKyc) {
        return (
            <div className="app-wrapper">
                <nav className="navbar">
                    <span className="navbar-brand">KYC Verify</span>
                    <div className="navbar-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => { setShowKyc(false); fetchStatus(); }}>
                            ← Dashboard
                        </button>
                    </div>
                </nav>
                <div className="page-container">
                    <KYCForm onComplete={() => { setShowKyc(false); fetchStatus(); }} />
                </div>
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <nav className="navbar">
                <span className="navbar-brand">KYC Verify</span>
                <div className="navbar-actions">
                    <span className="navbar-user">{user?.email}</span>
                    <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
                </div>
            </nav>

            <div className="page-container fade-in">
                {/* Hero */}
                <div className="dashboard-hero">
                    <h1>Welcome, {user?.email?.split('@')[0] || 'Merchant'} 👋</h1>
                    <p>Complete your KYC verification to start accepting payments</p>
                </div>

                {loading ? (
                    <div className="loading-page"><span className="spinner" /> Loading...</div>
                ) : (
                    <>
                        {/* Status Card */}
                        <div className="card status-card">
                            <div>
                                <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.35rem' }}>
                                    KYC Status
                                </div>
                                <span className={`badge ${badgeClass[status?.status] || 'badge-draft'}`}>
                                    {statusLabels[status?.status] || 'Not Started'}
                                </span>
                                <p style={{ fontSize: '.85rem', color: '#6b7280', marginTop: '.5rem' }}>
                                    {statusDescriptions[status?.status] || ''}
                                </p>
                            </div>
                            {status?.status !== 'pending' && status?.status !== 'approved' && (
                                <button className="btn btn-primary" onClick={() => setShowKyc(true)}>
                                    {status?.status === 'not_started' ? '🚀 Start KYC' : '✏️ Continue KYC'}
                                </button>
                            )}
                        </div>

                        {/* If user has KYC data, show tabs to view their submission */}
                        {kycData ? (
                            <>
                                {/* Tab Navigation */}
                                <div className="tab-nav">
                                    {[
                                        { id: 'overview', label: '📋 Overview' },
                                        { id: 'documents', label: '📄 Documents' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                            onClick={() => setActiveTab(tab.id)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                                        {/* Personal Details */}
                                        {kycData.basic_details && (
                                            <div className="card">
                                                <div className="data-section-title">👤 Personal Details</div>
                                                <div className="data-grid">
                                                    <DataItem label="Full Name" value={kycData.basic_details.full_name} />
                                                    <DataItem label="Date of Birth" value={kycData.basic_details.date_of_birth} />
                                                    <DataItem label="City" value={kycData.basic_details.city} />
                                                    <DataItem label="State" value={kycData.basic_details.state} />
                                                    <DataItem label="Street" value={kycData.basic_details.street} />
                                                    <DataItem label="Pincode" value={kycData.basic_details.pincode} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Identity Details */}
                                        {kycData.identity_details && (
                                            <div className="card">
                                                <div className="data-section-title">🪪 Identity Details</div>
                                                <div className="data-grid">
                                                    <DataItem label="Aadhaar Number" value={kycData.identity_details.aadhaar_number} mono />
                                                    <DataItem label="PAN Number" value={kycData.identity_details.pan_number?.toUpperCase()} mono />
                                                </div>
                                            </div>
                                        )}

                                        {/* Business Details */}
                                        {kycData.business_details && (
                                            <div className="card">
                                                <div className="data-section-title">🏢 Business Details</div>
                                                <div className="data-grid">
                                                    <DataItem label="Business Name" value={kycData.business_details.business_name} />
                                                    <DataItem label="Business Type" value={kycData.business_details.business_type} />
                                                    <DataItem label="GST Number" value={kycData.business_details.gst_number} mono />
                                                    <DataItem label="City" value={kycData.business_details.business_city} />
                                                    <DataItem label="State" value={kycData.business_details.business_state} />
                                                    <DataItem label="Pincode" value={kycData.business_details.business_pincode} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bank Details */}
                                        {kycData.bank_details && (
                                            <div className="card">
                                                <div className="data-section-title">🏦 Bank Details</div>
                                                <div className="data-grid">
                                                    <DataItem label="Account Holder" value={kycData.bank_details.account_holder_name} />
                                                    <DataItem label="Bank Name" value={kycData.bank_details.bank_name} />
                                                    <DataItem label="Account Number" value={kycData.bank_details.account_number} mono />
                                                    <DataItem label="IFSC Code" value={kycData.bank_details.ifsc_code} mono />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Documents Tab */}
                                {activeTab === 'documents' && (
                                    <div className="card">
                                        <div className="data-section-title">📄 Uploaded Documents</div>
                                        <div className="doc-grid">
                                            <DocCard label="Aadhaar Front" url={kycData.documents?.aadhaar_front} />
                                            <DocCard label="Aadhaar Back" url={kycData.documents?.aadhaar_back} />
                                            <DocCard label="PAN Card" url={kycData.documents?.pan_card} />
                                            <DocCard label="Selfie" url={kycData.documents?.selfie} />
                                            <DocCard label="Cancelled Cheque" url={kycData.documents?.cancelled_cheque} />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* If no KYC data yet, show verification steps guide */
                            <div className="card">
                                <div className="data-section-title">📝 Verification Steps</div>
                                <div style={{ display: 'grid', gap: '.75rem' }}>
                                    {[
                                        { icon: '👤', title: 'Personal Details', desc: 'Name, address, date of birth' },
                                        { icon: '🪪', title: 'Identity Verification', desc: 'Aadhaar & PAN upload' },
                                        { icon: '🏢', title: 'Business Details', desc: 'Company & GST info' },
                                        { icon: '🏦', title: 'Bank Account', desc: 'Account & IFSC details' },
                                        { icon: '📸', title: 'Selfie Verification', desc: 'Photo for face match' },
                                    ].map((s, i) => (
                                        <div key={i} className="verification-step">
                                            <div className="verification-step-icon">{s.icon}</div>
                                            <div>
                                                <div className="verification-step-title">{s.title}</div>
                                                <div className="verification-step-desc">{s.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ── Helper Components ──────────────────────────────────────────── */
function DataItem({ label, value, mono }) {
    return (
        <div className="data-item">
            <div className="data-item-label">{label}</div>
            <div className={`data-item-value ${mono ? 'mono' : ''}`}>{value || 'N/A'}</div>
        </div>
    );
}

function DocCard({ label, url }) {
    return (
        <div className="doc-card">
            {url ? (
                <img
                    src={url}
                    alt={label}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.querySelector('.doc-fallback').style.display = 'flex';
                    }}
                />
            ) : null}
            {url ? (
                <div className="doc-fallback" style={{ display: 'none', height: 140, alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#9ca3af', fontSize: '.85rem', borderBottom: '1px solid #e5e7eb' }}>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 600, fontSize: '.8rem' }}>
                        Open File ↗
                    </a>
                </div>
            ) : (
                <div className="doc-placeholder">Not uploaded</div>
            )}
            <div className="doc-card-label">📎 {label}</div>
        </div>
    );
}
