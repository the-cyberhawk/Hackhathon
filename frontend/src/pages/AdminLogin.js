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
                <div className="card-header">
                    <h2>🔐 Admin Portal</h2>
                    <p>Sign in to access the merchant review dashboard</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

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
                        {loading ? <span className="spinner" /> : 'Sign In as Admin'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '.85rem' }}>
                    <strong>Demo Credentials:</strong><br />
                    Username: <code>admin</code><br />
                    Password: <code>admin</code>
                </div>
            </div>
        </div>
    );
}
