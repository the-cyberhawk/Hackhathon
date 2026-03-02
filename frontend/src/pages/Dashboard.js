import React, { useEffect, useState } from 'react';
import { getKycStatus } from '../api';
import KYCForm from '../components/KYCForm';

export default function Dashboard({ user, onLogout }) {
    const [status, setStatus] = useState(null);
    const [showKyc, setShowKyc] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const { data } = await getKycStatus();
            setStatus(data);
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
                <div className="dashboard-hero">
                    <h1>Merchant Dashboard</h1>
                    <p>Complete your KYC verification to start accepting payments</p>
                </div>

                {loading ? (
                    <div className="loading-page"><span className="spinner" /> Loading...</div>
                ) : (
                    <>
                        <div className="card status-card">
                            <div>
                                <h3 style={{ marginBottom: '.25rem' }}>KYC Status</h3>
                                <span className={`badge ${badgeClass[status?.status] || 'badge-draft'}`}>
                                    {status?.status?.replace('_', ' ') || 'Not Started'}
                                </span>
                            </div>
                            {status?.status !== 'pending' && status?.status !== 'approved' && (
                                <button className="btn btn-primary" onClick={() => setShowKyc(true)}>
                                    {status?.status === 'not_started' ? 'Start KYC' : 'Continue KYC'}
                                </button>
                            )}
                        </div>

                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Verification Steps</h3>
                            <div style={{ display: 'grid', gap: '.75rem' }}>
                                {[
                                    { icon: '👤', title: 'Personal Details', desc: 'Name, address, DOB' },
                                    { icon: '🪪', title: 'Identity Verification', desc: 'Aadhaar & PAN upload' },
                                    { icon: '🏢', title: 'Business Details', desc: 'Company & GST info' },
                                    { icon: '🏦', title: 'Bank Account', desc: 'Account & IFSC details' },
                                    { icon: '📸', title: 'Selfie Verification', desc: 'Photo for face match' },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '.85rem 1rem', borderRadius: '8px',
                                        background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)'
                                    }}>
                                        <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{s.title}</div>
                                            <div style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>{s.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
