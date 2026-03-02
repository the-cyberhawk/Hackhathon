import React, { useState, useEffect } from 'react';
import { getMerchantDetail, updateMerchantStatus, saveAdminNotes } from '../api';

export default function MerchantDetail({ userId, onBack }) {
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchMerchant();
    }, [userId]);

    const fetchMerchant = async () => {
        setLoading(true);
        try {
            const { data } = await getMerchantDetail(userId);
            setMerchant(data);
            setNotes(data.admin_notes || '');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status) => {
        setSaving(true);
        setMessage('');
        try {
            await updateMerchantStatus(userId, status, notes);
            setMessage(`Status updated to ${status}`);
            fetchMerchant();
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        setMessage('');
        try {
            await saveAdminNotes(userId, notes);
            setMessage('Notes saved successfully');
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-pending',
            approved: 'badge-approved',
            rejected: 'badge-rejected',
            manual_review: 'badge-draft',
            draft: 'badge-draft',
        };
        return badges[status] || 'badge-draft';
    };

    const getScoreColor = (score) => {
        if (score >= 75) return '#16a34a';
        if (score >= 50) return '#ca8a04';
        return '#dc2626';
    };

    const getRiskBadge = (risk) => {
        const colors = {
            Low: { bg: '#dcfce7', color: '#166534' },
            Medium: { bg: '#fef9c3', color: '#854d0e' },
            High: { bg: '#fee2e2', color: '#991b1b' },
        };
        return colors[risk] || colors.Medium;
    };

    if (loading) {
        return (
            <div className="loading-page">
                <span className="spinner" /> Loading merchant details...
            </div>
        );
    }

    if (!merchant) {
        return (
            <div className="page-container">
                <div className="card">
                    <p>Merchant not found</p>
                    <button className="btn btn-outline" onClick={onBack}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: '📋 Overview' },
        { id: 'documents', label: '📄 Documents' },
        { id: 'ai_report', label: '🤖 AI Report' },
    ];

    return (
        <div className="app-wrapper">
            <nav className="navbar">
                <span className="navbar-brand">🛡️ Admin Portal</span>
                <div className="navbar-actions">
                    <button className="btn btn-outline btn-sm" onClick={onBack}>
                        ← Back to Dashboard
                    </button>
                </div>
            </nav>

            <div className="page-container fade-in">
                {/* Header */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '.5rem' }}>
                                {merchant.basic_details?.full_name || merchant.email}
                            </h1>
                            <div style={{ fontSize: '.9rem', color: 'var(--text-dim)' }}>
                                {merchant.email} • {merchant.phone}
                            </div>
                            {merchant.business_details?.business_name && (
                                <div style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                                    🏢 {merchant.business_details.business_name}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem' }}>
                            <span className={`badge ${getStatusBadge(merchant.kyc_status)}`}>
                                {merchant.kyc_status?.replace('_', ' ') || 'Draft'}
                            </span>
                            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: getScoreColor(merchant.ai_score) }}>
                                    {merchant.ai_score}
                                </span>
                                <span style={{ padding: '.25rem .5rem', borderRadius: '4px', fontSize: '.75rem', fontWeight: '500', ...getRiskBadge(merchant.risk_level) }}>
                                    {merchant.risk_level} Risk
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Quick Actions</h3>
                    {message && (
                        <div className={`alert ${message.includes('failed') ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: '1rem' }}>
                            {message}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                        <button
                            className="btn"
                            style={{ background: '#16a34a', color: 'white' }}
                            onClick={() => handleStatusUpdate('approved')}
                            disabled={saving}
                        >
                            ✓ Approve
                        </button>
                        <button
                            className="btn"
                            style={{ background: '#dc2626', color: 'white' }}
                            onClick={() => handleStatusUpdate('rejected')}
                            disabled={saving}
                        >
                            ✕ Reject
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => handleStatusUpdate('manual_review')}
                            disabled={saving}
                        >
                            🔍 Manual Review
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'} btn-sm`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {/* Basic Details */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>👤 Basic Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Full Name</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.basic_details?.full_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Date of Birth</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.basic_details?.date_of_birth || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Address</label>
                                    <div style={{ fontWeight: '500' }}>
                                        {merchant.basic_details?.street}, {merchant.basic_details?.city}, {merchant.basic_details?.state} - {merchant.basic_details?.pincode}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Identity Details */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>🪪 Identity Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Aadhaar Number</label>
                                    <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{merchant.identity_details?.aadhaar_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>PAN Number</label>
                                    <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{merchant.identity_details?.pan_number?.toUpperCase() || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Business Details */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>🏢 Business Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Business Name</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.business_details?.business_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Business Type</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.business_details?.business_type || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>GST Number</label>
                                    <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{merchant.business_details?.gst_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Business Address</label>
                                    <div style={{ fontWeight: '500' }}>
                                        {merchant.business_details?.business_street}, {merchant.business_details?.business_city}, {merchant.business_details?.business_state} - {merchant.business_details?.business_pincode}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>🏦 Bank Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Account Holder</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.bank_details?.account_holder_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Bank Name</label>
                                    <div style={{ fontWeight: '500' }}>{merchant.bank_details?.bank_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Account Number</label>
                                    <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{merchant.bank_details?.account_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>IFSC Code</label>
                                    <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{merchant.bank_details?.ifsc_code || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { label: 'Aadhaar Front', key: 'aadhaar_front' },
                            { label: 'Aadhaar Back', key: 'aadhaar_back' },
                            { label: 'PAN Card', key: 'pan_card' },
                            { label: 'Selfie', key: 'selfie' },
                            { label: 'Cancelled Cheque', key: 'cancelled_cheque' },
                        ].map((doc) => (
                            <div key={doc.key} className="card">
                                <h4 style={{ marginBottom: '1rem' }}>{doc.label}</h4>
                                {merchant.documents?.[doc.key] ? (
                                    <div>
                                        <img
                                            src={merchant.documents[doc.key]}
                                            alt={doc.label}
                                            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                        <div style={{ display: 'none', padding: '2rem', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                                            <p style={{ color: 'var(--text-dim)' }}>Unable to load image</p>
                                            <a href={merchant.documents[doc.key]} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                                Open File
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ padding: '3rem', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-dim)' }}>Not uploaded</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'ai_report' && merchant.ai_report && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {/* AI Recommendation */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>🤖 AI Recommendation</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        padding: '.5rem 1rem',
                                        borderRadius: '8px',
                                        background: merchant.ai_report.recommendation === 'Approve' ? '#dcfce7' : merchant.ai_report.recommendation === 'Reject' ? '#fee2e2' : '#fef9c3',
                                        color: merchant.ai_report.recommendation === 'Approve' ? '#166534' : merchant.ai_report.recommendation === 'Reject' ? '#991b1b' : '#854d0e',
                                    }}
                                >
                                    {merchant.ai_report.recommendation}
                                </span>
                                <span style={{ color: 'var(--text-dim)' }}>Confidence: {merchant.ai_report.confidence}</span>
                            </div>
                        </div>

                        {/* Risk Factors */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>📊 Risk Factor Analysis</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {merchant.ai_report.risk_factors?.map((factor, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{factor.factor}</div>
                                            <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>{factor.status}</div>
                                        </div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: getScoreColor(factor.score) }}>
                                            {factor.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Document Verification */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>📄 Document Verification</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Aadhaar</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.document_verification?.aadhaar?.status}</div>
                                    <div style={{ fontSize: '.8rem', fontFamily: 'monospace' }}>{merchant.ai_report.document_verification?.aadhaar?.number}</div>
                                </div>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>PAN</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.document_verification?.pan?.status}</div>
                                    <div style={{ fontSize: '.8rem', fontFamily: 'monospace' }}>{merchant.ai_report.document_verification?.pan?.number}</div>
                                </div>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Selfie Match</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.document_verification?.selfie_match}</div>
                                </div>
                            </div>
                        </div>

                        {/* Business Verification */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>🏢 Business Verification</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>GST Status</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.business_verification?.gst_status}</div>
                                </div>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>PAN Status</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.business_verification?.pan_status}</div>
                                </div>
                                <div style={{ padding: '.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>Address Verified</div>
                                    <div style={{ fontWeight: '500' }}>{merchant.ai_report.business_verification?.address_verified ? 'Yes' : 'No'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Notes */}
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>📝 Admin Notes</h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this merchant..."
                        rows={4}
                        style={{ width: '100%', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '.95rem', resize: 'vertical' }}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '1rem' }}
                        onClick={handleSaveNotes}
                        disabled={saving}
                    >
                        {saving ? <span className="spinner" /> : 'Save Notes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
