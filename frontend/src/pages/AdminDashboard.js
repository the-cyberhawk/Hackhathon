import React, { useState, useEffect } from 'react';
import { getMerchants } from '../api';
import MerchantDetail from './MerchantDetail';

export default function AdminDashboard({ onLogout }) {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMerchants = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await getMerchants();
            setMerchants(data.merchants || []);
        } catch (err) {
            setError('Failed to load merchants. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const filteredMerchants = merchants.filter((m) => {
        const matchesFilter = filter === 'all' || m.kyc_status === filter;
        const matchesSearch = !searchTerm ||
            m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.phone?.includes(searchTerm) ||
            m.mid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.basic_details?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusConfig = (status) => {
        const configs = {
            not_started: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db', label: 'Not Started' },
            draft: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Draft' },
            pending: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'Pending' },
            approved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Approved' },
            rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Rejected' },
            manual_review: { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe', label: 'Manual Review' },
        };
        return configs[status] || configs.draft;
    };

    const getRiskConfig = (risk) => {
        if (risk === 'N/A') return { bg: '#f3f4f6', text: '#6b7280' };
        const configs = {
            Low: { bg: '#f0fdf4', text: '#15803d' },
            Medium: { bg: '#fffbeb', text: '#b45309' },
            High: { bg: '#fef2f2', text: '#b91c1c' },
        };
        return configs[risk] || configs.Medium;
    };

    const getScoreColor = (score) => {
        if (score === 0) return '#9ca3af';
        if (score >= 75) return '#16a34a';
        if (score >= 50) return '#ca8a04';
        return '#dc2626';
    };

    const stats = [
        { label: 'Total', value: merchants.length, color: '#16a34a', bg: '#f0fdf4', icon: '👥' },
        { label: 'Not Started', value: merchants.filter(m => m.kyc_status === 'not_started').length, color: '#6b7280', bg: '#f3f4f6', icon: '⏳' },
        { label: 'Pending', value: merchants.filter(m => m.kyc_status === 'pending').length, color: '#b45309', bg: '#fffbeb', icon: '⏱️' },
        { label: 'Approved', value: merchants.filter(m => m.kyc_status === 'approved').length, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
        { label: 'Rejected', value: merchants.filter(m => m.kyc_status === 'rejected').length, color: '#dc2626', bg: '#fef2f2', icon: '❌' },
    ];

    const filterTabs = [
        { value: 'all', label: 'All', count: merchants.length },
        { value: 'not_started', label: 'Not Started', count: merchants.filter(m => m.kyc_status === 'not_started').length },
        { value: 'draft', label: 'Draft', count: merchants.filter(m => m.kyc_status === 'draft').length },
        { value: 'pending', label: 'Pending', count: merchants.filter(m => m.kyc_status === 'pending').length },
        { value: 'approved', label: 'Approved', count: merchants.filter(m => m.kyc_status === 'approved').length },
        { value: 'rejected', label: 'Rejected', count: merchants.filter(m => m.kyc_status === 'rejected').length },
        { value: 'manual_review', label: 'Review', count: merchants.filter(m => m.kyc_status === 'manual_review').length },
    ];

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
            {/* Header */}
            <nav className="navbar" style={{ maxWidth: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.05rem' }}>Admin Portal</div>
                        <div style={{ fontSize: '.75rem', color: '#6b7280' }}>KYC Management</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={fetchMerchants}
                        title="Refresh"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={onLogout}
                        style={{ background: '#ef4444', color: 'white' }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
                {/* Page Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', marginBottom: '.35rem' }}>
                        Merchant Dashboard
                    </h2>
                    <p style={{ color: '#6b7280' }}>Review and manage KYC applications from registered merchants</p>
                </div>

                {error && (
                    <div className="alert alert-danger">⚠️ {error}</div>
                )}

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {stats.map((stat, idx) => (
                        <div key={idx} className="card" style={{
                            padding: '1rem 1.25rem',
                            borderLeft: `3px solid ${stat.color}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{stat.icon}</span>
                                <span style={{ fontSize: '.8rem', color: '#6b7280', fontWeight: 600 }}>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Search and Filters */}
                <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', flex: '1', maxWidth: 360 }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '.55rem .75rem .55rem 2.2rem',
                                    border: '1.5px solid #e5e7eb',
                                    borderRadius: 8,
                                    fontSize: '.9rem',
                                    fontFamily: 'inherit',
                                    transition: 'border-color .2s',
                                    outline: 'none',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setFilter(tab.value)}
                                    style={{
                                        padding: '.35rem .7rem',
                                        fontSize: '.8rem',
                                        fontWeight: 600,
                                        borderRadius: 6,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        transition: 'all .15s',
                                        background: filter === tab.value ? '#16a34a' : '#f3f4f6',
                                        color: filter === tab.value ? '#fff' : '#4b5563',
                                    }}
                                >
                                    {tab.label}
                                    <span style={{
                                        marginLeft: 4,
                                        padding: '.1rem .4rem',
                                        background: filter === tab.value ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.06)',
                                        borderRadius: 4,
                                        fontSize: '.75rem',
                                    }}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Merchant List */}
                {loading ? (
                    <div className="loading-page"><span className="spinner" /> Loading merchants...</div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>👥</div>
                        <h3 style={{ color: '#374151', marginBottom: '.35rem' }}>No merchants found</h3>
                        <p style={{ color: '#6b7280', fontSize: '.9rem' }}>
                            {searchTerm ? 'Try adjusting your search terms' : 'No merchants match the selected filter'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '.75rem' }}>
                        {filteredMerchants.map((merchant) => {
                            const statusConfig = getStatusConfig(merchant.kyc_status);
                            const riskConfig = getRiskConfig(merchant.risk_level);

                            return (
                                <div
                                    key={merchant.user_id}
                                    onClick={() => setSelectedMerchant(merchant.user_id)}
                                    className="card"
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        cursor: 'pointer',
                                        borderLeft: `3px solid ${statusConfig.border}`,
                                        transition: 'all .2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderLeftColor = '#22c55e';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderLeftColor = statusConfig.border;
                                        e.currentTarget.style.boxShadow = '';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        {/* Left — Merchant Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.4rem' }}>
                                                <div style={{
                                                    width: 40, height: 40,
                                                    borderRadius: 10,
                                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
                                                }}>
                                                    {(merchant.basic_details?.full_name || merchant.email)?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1f2937' }}>
                                                        {merchant.basic_details?.full_name || 'Unnamed Merchant'}
                                                    </div>
                                                    {merchant.mid && (
                                                        <span style={{
                                                            fontSize: '.75rem',
                                                            fontFamily: 'monospace',
                                                            color: '#16a34a',
                                                            background: '#f0fdf4',
                                                            padding: '.1rem .4rem',
                                                            borderRadius: 4,
                                                        }}>
                                                            {merchant.mid}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '.85rem', color: '#6b7280' }}>
                                                <span>📧 {merchant.email}</span>
                                                <span>📱 {merchant.phone}</span>
                                                {merchant.business_details?.business_name && (
                                                    <span>🏢 {merchant.business_details.business_name}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right — Status & Score */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {merchant.kyc_status !== 'not_started' && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(merchant.ai_score) }}>
                                                        {merchant.ai_score}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '.7rem', fontWeight: 600,
                                                        padding: '.15rem .5rem', borderRadius: 4,
                                                        background: riskConfig.bg, color: riskConfig.text,
                                                    }}>
                                                        {merchant.risk_level !== 'N/A' ? `${merchant.risk_level} Risk` : 'N/A'}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{
                                                padding: '.35rem .75rem', borderRadius: 6,
                                                fontSize: '.8rem', fontWeight: 600,
                                                background: statusConfig.bg,
                                                color: statusConfig.text,
                                                border: `1px solid ${statusConfig.border}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {statusConfig.label}
                                            </div>
                                        </div>
                                    </div>

                                    {merchant.submitted_at && (
                                        <div style={{
                                            marginTop: '.75rem', paddingTop: '.6rem',
                                            borderTop: '1px solid #f3f4f6',
                                            fontSize: '.8rem', color: '#9ca3af',
                                        }}>
                                            📅 Submitted: {new Date(merchant.submitted_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.85rem', color: '#9ca3af' }}>
                    Showing {filteredMerchants.length} of {merchants.length} merchants
                </div>
            </div>
        </div>
    );
}
