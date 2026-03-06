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
            not_started: 'badge-draft',
            pending: 'badge-pending',
            approved: 'badge-approved',
            rejected: 'badge-rejected',
            manual_review: 'badge-draft',
            draft: 'badge-draft',
        };
        return badges[status] || 'badge-draft';
    };

    const getScoreColor = (score) => {
        if (score === 0) return '#6b7280';
        if (score >= 75) return '#16a34a';
        if (score >= 50) return '#ca8a04';
        return '#dc2626';
    };

    const getRiskBadge = (risk) => {
        if (risk === 'N/A') return { bg: '#f3f4f6', color: '#6b7280' };
        const colors = {
            Low: { bg: '#f0fdf4', color: '#166534' },
            Medium: { bg: '#fffbeb', color: '#854d0e' },
            High: { bg: '#fef2f2', color: '#991b1b' },
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
                <span className="navbar-brand">Admin Portal</span>
                <div className="navbar-actions">
                    <button className="btn btn-outline btn-sm" onClick={onBack}>
                        ← Back to Dashboard
                    </button>
                </div>
            </nav>

            <div className="page-container fade-in">
                {/* Merchant Header */}
                <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #22c55e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
                                {merchant.basic_details?.full_name || merchant.email}
                            </h1>
                            <div style={{ fontSize: '.9rem', color: '#6b7280' }}>
                                📧 {merchant.email} &nbsp;•&nbsp; 📱 {merchant.phone}
                            </div>
                            {merchant.business_details?.business_name && (
                                <div style={{ marginTop: '.5rem', fontSize: '.9rem', color: '#374151' }}>
                                    🏢 {merchant.business_details.business_name}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem' }}>
                            <span className={`badge ${getStatusBadge(merchant.kyc_status)}`}>
                                {merchant.kyc_status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                            </span>
                            {merchant.kyc_status !== 'not_started' && (
                                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: getScoreColor(merchant.ai_score) }}>
                                        {merchant.ai_score}
                                    </span>
                                    <span style={{ padding: '.2rem .5rem', borderRadius: 4, fontSize: '.75rem', fontWeight: 600, background: getRiskBadge(merchant.risk_level).bg, color: getRiskBadge(merchant.risk_level).color }}>
                                        {merchant.risk_level} {merchant.risk_level !== 'N/A' ? 'Risk' : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="data-section-title">⚡ Quick Actions</div>
                    {message && (
                        <div className={`alert ${message.includes('failed') ? 'alert-danger' : 'alert-success'}`}>
                            {message}
                        </div>
                    )}
                    {merchant.kyc_status === 'not_started' ? (
                        <div style={{ padding: '1.25rem', background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
                            <p style={{ color: '#6b7280' }}>User has not started KYC yet</p>
                        </div>
                    ) : (
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
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="tab-nav">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content — Overview */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                        {/* Basic Details */}
                        <div className="card">
                            <div className="data-section-title">👤 Basic Details</div>
                            <div className="data-grid">
                                <DataItem label="Full Name" value={merchant.basic_details?.full_name} />
                                <DataItem label="Date of Birth" value={merchant.basic_details?.date_of_birth} />
                                <DataItem label="Address" value={`${merchant.basic_details?.street || ''}, ${merchant.basic_details?.city || ''}, ${merchant.basic_details?.state || ''} - ${merchant.basic_details?.pincode || ''}`} />
                            </div>
                        </div>

                        {/* Identity Details */}
                        <div className="card">
                            <div className="data-section-title">🪪 Identity Details</div>
                            <div className="data-grid">
                                <DataItem label="Aadhaar Number" value={merchant.identity_details?.aadhaar_number} mono />
                                <DataItem label="PAN Number" value={merchant.identity_details?.pan_number?.toUpperCase()} mono />
                            </div>
                        </div>

                        {/* Business Details */}
                        <div className="card">
                            <div className="data-section-title">🏢 Business Details</div>
                            <div className="data-grid">
                                <DataItem label="Business Name" value={merchant.business_details?.business_name} />
                                <DataItem label="Business Type" value={merchant.business_details?.business_type} />
                                <DataItem label="GST Number" value={merchant.business_details?.gst_number} mono />
                                <DataItem label="Business Address" value={`${merchant.business_details?.business_street || ''}, ${merchant.business_details?.business_city || ''}, ${merchant.business_details?.business_state || ''} - ${merchant.business_details?.business_pincode || ''}`} />
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="card">
                            <div className="data-section-title">🏦 Bank Details</div>
                            <div className="data-grid">
                                <DataItem label="Account Holder" value={merchant.bank_details?.account_holder_name} />
                                <DataItem label="Bank Name" value={merchant.bank_details?.bank_name} />
                                <DataItem label="Account Number" value={merchant.bank_details?.account_number} mono />
                                <DataItem label="IFSC Code" value={merchant.bank_details?.ifsc_code} mono />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content — Documents */}
                {activeTab === 'documents' && (
                    <div className="card">
                        <div className="data-section-title">📄 Uploaded Documents</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                            {[
                                { label: 'Aadhaar Front', key: 'aadhaar_front' },
                                { label: 'Aadhaar Back', key: 'aadhaar_back' },
                                { label: 'PAN Card', key: 'pan_card' },
                                { label: 'Selfie', key: 'selfie' },
                                { label: 'Cancelled Cheque', key: 'cancelled_cheque' },
                            ].map((doc) => (
                                <div key={doc.key} style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    background: '#fff',
                                }}>
                                    <div style={{
                                        padding: '.6rem .85rem',
                                        background: '#f9fafb',
                                        borderBottom: '1px solid #e5e7eb',
                                        fontSize: '.85rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                    }}>
                                        📎 {doc.label}
                                    </div>
                                    {merchant.documents?.[doc.key] ? (
                                        <div style={{ padding: '.75rem' }}>
                                            <img
                                                src={merchant.documents[doc.key]}
                                                alt={doc.label}
                                                style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div style={{ display: 'none', padding: '2rem', textAlign: 'center', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                                                <p style={{ color: '#6b7280', fontSize: '.9rem' }}>Unable to load preview</p>
                                                <a href={merchant.documents[doc.key]} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                                    Open File ↗
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '.9rem' }}>
                                            Not uploaded
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab Content — AI Report */}
                {activeTab === 'ai_report' && (
                    merchant.kyc_status === 'not_started' ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🤖</div>
                            <p style={{ color: '#6b7280' }}>No AI report available — KYC not started</p>
                        </div>
                    ) : merchant.ai_report ? (
                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            {/* AI Recommendation */}
                            <div className="card">
                                <div className="data-section-title">🤖 AI Recommendation</div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '1.1rem', fontWeight: 700,
                                        padding: '.5rem 1rem', borderRadius: 8,
                                        background: merchant.ai_report.recommendation === 'Approve' ? '#f0fdf4' : merchant.ai_report.recommendation === 'Reject' ? '#fef2f2' : '#fffbeb',
                                        color: merchant.ai_report.recommendation === 'Approve' ? '#166534' : merchant.ai_report.recommendation === 'Reject' ? '#991b1b' : '#854d0e',
                                        border: `1px solid ${merchant.ai_report.recommendation === 'Approve' ? '#bbf7d0' : merchant.ai_report.recommendation === 'Reject' ? '#fecaca' : '#fde68a'}`,
                                    }}>
                                        {merchant.ai_report.recommendation}
                                    </span>
                                    <span style={{ color: '#6b7280', fontSize: '.9rem' }}>
                                        Confidence: <strong>{merchant.ai_report.confidence}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Risk Factors */}
                            <div className="card">
                                <div className="data-section-title">📊 Risk Factor Analysis</div>
                                <div style={{ display: 'grid', gap: '.75rem' }}>
                                    {merchant.ai_report.risk_factors?.map((factor, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '.75rem 1rem', background: '#f9fafb', borderRadius: 8,
                                            border: '1px solid #f3f4f6',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937' }}>{factor.factor}</div>
                                                <div style={{ fontSize: '.8rem', color: '#6b7280' }}>{factor.status}</div>
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getScoreColor(factor.score) }}>
                                                {factor.score}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Document Verification */}
                            <div className="card">
                                <div className="data-section-title">📄 Document Verification</div>
                                <div className="data-grid">
                                    <DataItem label="Aadhaar Status" value={merchant.ai_report.document_verification?.aadhaar?.status} />
                                    <DataItem label="Aadhaar Number" value={merchant.ai_report.document_verification?.aadhaar?.number} mono />
                                    <DataItem label="PAN Status" value={merchant.ai_report.document_verification?.pan?.status} />
                                    <DataItem label="PAN Number" value={merchant.ai_report.document_verification?.pan?.number} mono />
                                    <DataItem label="Selfie Match" value={merchant.ai_report.document_verification?.selfie_match} />
                                </div>
                            </div>

                            {/* Business Verification */}
                            <div className="card">
                                <div className="data-section-title">🏢 Business Verification</div>
                                <div className="data-grid">
                                    <DataItem label="GST Status" value={merchant.ai_report.business_verification?.gst_status} />
                                    <DataItem label="PAN Status" value={merchant.ai_report.business_verification?.pan_status} />
                                    <DataItem label="Address Verified" value={merchant.ai_report.business_verification?.address_verified ? 'Yes ✓' : 'No ✕'} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🤖</div>
                            <p style={{ color: '#6b7280' }}>AI report data not available</p>
                        </div>
                    )
                )}

                {/* Admin Notes */}
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div className="data-section-title">📝 Admin Notes</div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this merchant..."
                        rows={4}
                        style={{
                            width: '100%', padding: '1rem',
                            border: '1.5px solid #e5e7eb', borderRadius: 8,
                            fontSize: '.95rem', resize: 'vertical',
                            fontFamily: 'inherit',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '.75rem' }}
                        onClick={handleSaveNotes}
                        disabled={saving}
                    >
                        {saving ? <span className="spinner" /> : '💾 Save Notes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Helper Component ──────────────────────────────────────────── */
function DataItem({ label, value, mono }) {
    return (
        <div className="data-item">
            <div className="data-item-label">{label}</div>
            <div className={`data-item-value ${mono ? 'mono' : ''}`}>{value || 'N/A'}</div>
        </div>
    );
}
