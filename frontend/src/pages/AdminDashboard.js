import React, { useState, useEffect } from 'react';
import { getMerchants } from '../api';
import MerchantDetail from './MerchantDetail';

export default function AdminDashboard({ onLogout }) {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [error, setError] = useState('');

    const fetchMerchants = async () => {
        setLoading(true);
        try {
            const { data } = await getMerchants();
            setMerchants(data.merchants || []);
        } catch (err) {
            setError('Failed to load merchants');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const filteredMerchants = merchants.filter((m) => {
        if (filter === 'all') return true;
        return m.kyc_status === filter;
    });

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

    const getRiskBadge = (risk) => {
        const colors = {
            Low: { bg: '#dcfce7', color: '#166534' },
            Medium: { bg: '#fef9c3', color: '#854d0e' },
            High: { bg: '#fee2e2', color: '#991b1b' },
        };
        return colors[risk] || colors.Medium;
    };

    const getScoreColor = (score) => {
        if (score >= 75) return '#16a34a';
        if (score >= 50) return '#ca8a04';
        return '#dc2626';
    };

    if (selectedMerchant) {
        return (
            <MerchantDetail
                userId={selectedMerchant}
                onBack={() => {
                    setSelectedMerchant(null);
                    fetchMerchants();
                }}
            />
        );
    }

    return (
        <div className="app-wrapper">
            <nav className="navbar">
                <span className="navbar-brand">🛡️ Admin Portal</span>
                <div className="navbar-actions">
                    <button className="btn btn-outline btn-sm" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="page-container fade-in">
                <div className="dashboard-hero">
                    <h1>Merchant Review Dashboard</h1>
                    <p>Review and manage KYC applications</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                {/* Filter Tabs */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                            { value: 'manual_review', label: 'Manual Review' },
                        ].map((f) => (
                            <button
                                key={f.value}
                                className={`btn ${filter === f.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{merchants.length}</div>
                        <div style={{ fontSize: '.85rem', color: 'var(--text-dim)' }}>Total</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ca8a04' }}>
                            {merchants.filter((m) => m.kyc_status === 'pending').length}
                        </div>
                        <div style={{ fontSize: '.85rem', color: 'var(--text-dim)' }}>Pending</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#16a34a' }}>
                            {merchants.filter((m) => m.kyc_status === 'approved').length}
                        </div>
                        <div style={{ fontSize: '.85rem', color: 'var(--text-dim)' }}>Approved</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
                            {merchants.filter((m) => m.kyc_status === 'rejected').length}
                        </div>
                        <div style={{ fontSize: '.85rem', color: 'var(--text-dim)' }}>Rejected</div>
                    </div>
                </div>

                {/* Merchant List */}
                {loading ? (
                    <div className="loading-page">
                        <span className="spinner" /> Loading merchants...
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-dim)' }}>No merchants found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {filteredMerchants.map((merchant) => (
                            <div
                                key={merchant.user_id}
                                className="card"
                                style={{ cursor: 'pointer', transition: 'all .2s' }}
                                onClick={() => setSelectedMerchant(merchant.user_id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h3 style={{ marginBottom: '.5rem', fontWeight: '600' }}>
                                            {merchant.basic_details?.full_name || merchant.email || 'Unknown Merchant'}
                                        </h3>
                                        <div style={{ fontSize: '.9rem', color: 'var(--text-dim)' }}>
                                            <div>📧 {merchant.email}</div>
                                            <div>📱 {merchant.phone}</div>
                                            {merchant.business_details?.business_name && (
                                                <div>🏢 {merchant.business_details.business_name}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem' }}>
                                        <span className={`badge ${getStatusBadge(merchant.kyc_status)}`}>
                                            {merchant.kyc_status?.replace('_', ' ') || 'Draft'}
                                        </span>
                                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                                            <span
                                                style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '700',
                                                    color: getScoreColor(merchant.ai_score),
                                                }}
                                            >
                                                {merchant.ai_score}
                                            </span>
                                            <span
                                                style={{
                                                    padding: '.25rem .5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '.75rem',
                                                    fontWeight: '500',
                                                    ...getRiskBadge(merchant.risk_level),
                                                }}
                                            >
                                                {merchant.risk_level} Risk
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {merchant.submitted_at && (
                                    <div style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--text-dim)' }}>
                                        Submitted: {new Date(merchant.submitted_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
