import React, { useState } from 'react';
import { adminLogin } from '../api';

export default function AdminLogin({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await adminLogin(username, password);
            localStorage.setItem('adminAuth', 'true');
            onLogin();
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card card fade-in">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: 'linear-gradient(135deg, #15803d, #166534)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '.75rem', boxShadow: '0 4px 14px rgba(22,163,74,.3)'
                    }}>
                        <span style={{ fontSize: '1.6rem' }}>🔐</span>
                    </div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#166534', marginBottom: '.3rem' }}>
                        Admin Portal
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '.95rem' }}>
                        Sign in to access the merchant review dashboard
                    </p>
                </div>

                {error && <div className="alert alert-danger">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Sign In as Admin →'}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    fontSize: '.85rem',
                    color: '#166534',
                }}>
                    <strong>Demo Credentials:</strong><br />
                    Username: <code style={{ background: '#dcfce7', padding: '.1rem .4rem', borderRadius: 4 }}>admin</code><br />
                    Password: <code style={{ background: '#dcfce7', padding: '.1rem .4rem', borderRadius: 4 }}>admin</code>
                </div>
            </div>
        </div>
    );
}
