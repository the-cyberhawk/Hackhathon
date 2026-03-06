import React, { useState, useEffect } from 'react';
import { getMerchantDetail, updateMerchantStatus, saveAdminNotes, getAiReport } from '../api';

export default function MerchantDetail({ userId, onBack }) {
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [aiReport, setAiReport] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

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

    const handleGenerateAiReport = async () => {
        setAiLoading(true);
        setAiError('');
        setAiReport(null);
        try {
            const { data } = await getAiReport(userId);
            setAiReport(data);
        } catch (err) {
            setAiError(err.response?.data?.detail || 'Failed to generate AI report');
        } finally {
            setAiLoading(false);
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

                {activeTab === 'ai_report' && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {/* Generate Button */}
                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: '600' }}>🤖 AI Risk Report</h3>
                                <p style={{ margin: '.25rem 0 0', fontSize: '.85rem', color: 'var(--text-dim)' }}>
                                    Powered by <strong>Amazon Bedrock</strong> (Claude 3 Haiku) + AWS Rekognition
                                </p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateAiReport}
                                disabled={aiLoading}
                                style={{ minWidth: 180 }}
                            >
                                {aiLoading ? (<><span className="spinner" style={{ marginRight: 8 }} /> Analyzing…</>) : (aiReport ? '🔄 Re-generate Report' : '✨ Generate AI Report')}
                            </button>
                        </div>

                        {aiError && <div className="alert alert-danger">{aiError}</div>}

                        {!aiReport && !aiLoading && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
                                <p>Click <strong>Generate AI Report</strong> to run a Bedrock risk analysis on this merchant's KYC data.</p>
                            </div>
                        )}

                        {aiReport && (() => {
                            const rec = aiReport.recommendation || '';
                            const isApprove = rec.toUpperCase().includes('APPROVE');
                            const isReject = rec.toUpperCase().includes('REJECT');
                            const recColor = isApprove ? '#16a34a' : isReject ? '#dc2626' : '#ca8a04';
                            const dv = aiReport.document_verification || {};
                            const bv = aiReport.business_verification || {};
                            const sm = aiReport.social_media || {};
                            const fp = aiReport.financial_profile || {};

                            return (
                                <>
                                    {/* Source badge */}
                                    <div style={{ display: 'flex', gap: '.5rem' }}>
                                        <span style={{ padding: '.2rem .75rem', borderRadius: '999px', fontSize: '.75rem', fontWeight: '700', background: aiReport.source === 'bedrock' ? '#dbeafe' : '#f3f4f6', color: aiReport.source === 'bedrock' ? '#1d4ed8' : '#374151' }}>
                                            {aiReport.source === 'bedrock' ? '◈ Amazon Bedrock' : '⚙ Mock Engine'} · {aiReport.model}
                                        </span>
                                    </div>

                                    {/* AI Recommendation banner */}
                                    <div className="card" style={{ borderLeft: `4px solid ${recColor}` }}>
                                        <div style={{ fontSize: '.75rem', fontWeight: '700', color: recColor, marginBottom: '.25rem', letterSpacing: '.05em' }}>
                                            AI Recommendation: {isApprove ? '✅' : isReject ? '❌' : '👁'} {rec}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.6, color: 'var(--text)' }}>{aiReport.summary}</p>
                                    </div>

                                    {/* Risk Factor Analysis */}
                                    <div className="card">
                                        <h3 style={{ marginBottom: '1.25rem', fontWeight: '600' }}>Risk Factor Analysis</h3>
                                        <div style={{ display: 'grid', gap: '.9rem' }}>
                                            {(aiReport.risk_factors || []).map((f, i) => {
                                                const dotClr = f.status === 'Good' ? '#16a34a' : f.status === 'Warning' ? '#ca8a04' : '#dc2626';
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: dotClr, flexShrink: 0 }} />
                                                        <span style={{ flex: 1, fontSize: '.9rem', fontWeight: '500' }}>{f.factor}</span>
                                                        <div style={{ width: 160, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                                                            <div style={{ height: '100%', width: `${f.score}%`, background: dotClr, borderRadius: 3, transition: 'width 0.6s ease' }} />
                                                        </div>
                                                        <span style={{ fontSize: '.85rem', fontWeight: '700', color: dotClr, minWidth: 52, textAlign: 'right' }}>{f.score}/100</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Document Verification */}
                                    <div className="card">
                                        <h3 style={{ marginBottom: '1.25rem', fontWeight: '600' }}>Document Verification</h3>
                                        <div style={{ display: 'grid', gap: '.5rem' }}>
                                            {[
                                                { label: 'Aadhaar Card', data: dv.aadhaar_card, type: 'doc' },
                                                { label: 'PAN Card', data: dv.pan_card, type: 'doc' },
                                                { label: 'Selfie Match', data: dv.selfie_match, type: 'selfie' },
                                            ].filter(x => x.data).map(({ label, data, type }) => {
                                                const ok = data.status === 'Valid' || data.status === 'Strong Match';
                                                const warn = data.status === 'Low Match';
                                                const clr = ok ? '#16a34a' : warn ? '#ca8a04' : '#dc2626';
                                                const display = type === 'selfie'
                                                    ? (data.match_percentage !== 'N/A' ? `${data.match_percentage}% Match` : data.status)
                                                    : data.status;
                                                return (
                                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '500', fontSize: '.9rem' }}>{label}</div>
                                                            {type === 'doc' && data.confidence != null && <div style={{ fontSize: '.78rem', color: 'var(--text-dim)', marginTop: '.1rem' }}>Confidence {data.confidence}%</div>}
                                                        </div>
                                                        <span style={{ fontWeight: '700', fontSize: '.9rem', color: clr }}>{display}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Business Verification */}
                                    <div className="card">
                                        <h3 style={{ marginBottom: '1.25rem', fontWeight: '600' }}>Business Verification</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: bv.founder_info ? '1rem' : 0 }}>
                                            {[
                                                { k: 'GST Status', v: bv.gst_status, green: bv.gst_status === 'Active' },
                                                { k: 'PAN Status', v: bv.pan_status, green: bv.pan_status === 'Valid' },
                                                { k: 'Address Verified', v: bv.address_verified ? 'Yes' : 'No', green: bv.address_verified },
                                                { k: 'Business Age', v: bv.business_age, green: false },
                                            ].filter(x => x.v).map(({ k, v, green }) => (
                                                <div key={k}>
                                                    <div style={{ fontSize: '.75rem', color: 'var(--text-dim)' }}>{k}</div>
                                                    <div style={{ fontWeight: '600', color: green ? '#16a34a' : 'var(--text)' }}>{v}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {bv.founder_info && (
                                            <div style={{ fontSize: '.85rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: '.75rem' }}>
                                                Founder Information<br />
                                                <span style={{ color: 'var(--text)', fontWeight: '500' }}>✓ {bv.founder_info}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Face Verification (Rekognition) */}
                                    {aiReport.face_match && (
                                        <div className="card">
                                            <h3 style={{ marginBottom: '1.25rem', fontWeight: '600' }}>👤 Face Verification</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                {[
                                                    { label: 'Selfie vs Aadhaar', key: 'selfie_vs_aadhaar' },
                                                    { label: 'Selfie vs PAN', key: 'selfie_vs_pan' },
                                                ].map(({ label, key }) => {
                                                    const r = aiReport.face_match[key] || {};
                                                    const sim = r.similarity;
                                                    const s = r.status;
                                                    const clr = s === 'match' ? '#16a34a' : s === 'low_match' ? '#ca8a04' : s === 'no_match' ? '#dc2626' : '#6b7280';
                                                    const lbl = s === 'match' ? `✓ ${sim}% Match` : s === 'low_match' ? `⚠ ${sim}% (Low)` : s === 'no_match' ? '✕ No Match' : (s || '—').replace(/_/g, ' ');
                                                    return (
                                                        <div key={key} style={{ padding: '.75rem', background: '#f9fafb', borderRadius: 8 }}>
                                                            <div style={{ fontSize: '.8rem', color: 'var(--text-dim)', marginBottom: '.4rem' }}>{label}</div>
                                                            <div style={{ fontWeight: '700', color: clr, fontSize: '.9rem', marginBottom: sim != null ? '.5rem' : 0 }}>{lbl}</div>
                                                            {sim != null && <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${sim}%`, background: clr, borderRadius: 3, transition: 'width 0.6s ease' }} /></div>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Social Media Presence */}
                                    {sm.overall_score != null && (
                                        <div className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                                <h3 style={{ margin: 0, fontWeight: '600' }}>Social Media Presence</h3>
                                                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: sm.overall_score >= 70 ? '#16a34a' : '#ca8a04' }}>
                                                    {sm.overall_score}/100
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: sm.summary ? '1rem' : 0 }}>
                                                {Object.entries(sm.platforms || {}).map(([platform, data]) => (
                                                    <div key={platform} style={{ padding: '.75rem', background: '#f9fafb', borderRadius: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                                                            <span style={{ fontWeight: '600', fontSize: '.85rem', textTransform: 'capitalize' }}>
                                                                {platform === 'twitter' ? 'Twitter/X' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                            </span>
                                                            <span style={{ fontSize: '.75rem', color: data.status === 'Active' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                                                {data.status === 'Active' ? '✓ Active' : '✗ Not Found'}
                                                            </span>
                                                        </div>
                                                        {data.status === 'Active' && <>
                                                            <div style={{ fontSize: '.78rem', color: 'var(--text-dim)' }}>Followers: {data.followers?.toLocaleString()}</div>
                                                            <div style={{ fontSize: '.78rem', color: 'var(--text-dim)' }}>Engagement: {data.engagement}</div>
                                                        </>}
                                                    </div>
                                                ))}
                                            </div>
                                            {sm.summary && <div style={{ fontSize: '.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Summary: {sm.summary}</div>}
                                        </div>
                                    )}

                                    {/* Financial Profile */}
                                    {fp.score != null && (
                                        <div className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                                <h3 style={{ margin: 0, fontWeight: '600' }}>Financial Profile</h3>
                                                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: fp.score >= 70 ? '#16a34a' : '#ca8a04' }}>
                                                    {fp.score}/100
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gap: '.5rem', fontSize: '.9rem' }}>
                                                {[
                                                    ['Business Age', fp.business_age],
                                                    ['Estimated Revenue', fp.estimated_revenue],
                                                    ['Founder Credibility', fp.founder_credibility],
                                                    ['Registration Status', fp.registration_status],
                                                    ['Financial Stability', fp.financial_stability],
                                                ].filter(([, v]) => v).map(([k, v]) => (
                                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)' }}>
                                                        <span style={{ color: 'var(--text-dim)', flexShrink: 0, marginRight: '1rem' }}>{k}</span>
                                                        <span style={{ fontWeight: '500', textAlign: 'right' }}>{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
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

