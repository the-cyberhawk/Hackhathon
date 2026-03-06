import React, { useState } from 'react';
import { signup, verifyOtp, login } from '../api';

export default function AuthPage({ onLogin }) {
    const [mode, setMode] = useState('login'); // login | signup | otp
    const [form, setForm] = useState({ email: '', phone: '', password: '', otp: '' });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpPhone, setOtpPhone] = useState('');

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const handleSignup = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setLoading(true);
        try {
            const { data } = await signup(form.email, form.phone, form.password);
            setOtpPhone(form.phone);
            setInfo(`Account created! OTP sent to your phone. (Demo OTP: ${data.otp})`);
            setMode('otp');
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed');
        } finally { setLoading(false); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { data } = await login(form.email, form.password);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally { setLoading(false); }
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { data } = await verifyOtp(otpPhone, form.otp);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (err) {
            setError(err.response?.data?.detail || 'OTP verification failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-container">
            <div className="auth-card card fade-in">
                {/* Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '.75rem', boxShadow: '0 4px 14px rgba(22,163,74,.3)'
                    }}>
                        <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                    </div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#166534', marginBottom: '.3rem' }}>
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'otp' && 'Verify Phone'}
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '.95rem' }}>
                        {mode === 'login' && 'Sign in to your KYC dashboard'}
                        {mode === 'signup' && 'Start your merchant onboarding'}
                        {mode === 'otp' && 'Enter the OTP sent to your phone'}
                    </p>
                </div>

                {error && <div className="alert alert-danger">⚠️ {error}</div>}
                {info && <div className="alert alert-info">ℹ️ {info}</div>}

                {mode === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email or Phone</label>
                            <input type="text" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Sign In →'}
                        </button>
                        <div className="auth-toggle">
                            Don't have an account?{' '}
                            <a href="#signup" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); }}>
                                Sign Up
                            </a>
                        </div>
                    </form>
                )}

                {mode === 'signup' && (
                    <form onSubmit={handleSignup}>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Create Account →'}
                        </button>
                        <div className="auth-toggle">
                            Already have an account?{' '}
                            <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>
                                Sign In
                            </a>
                        </div>
                    </form>
                )}

                {mode === 'otp' && (
                    <form onSubmit={handleOtp}>
                        <div className="form-group">
                            <label>OTP Code</label>
                            <input type="text" placeholder="123456" value={form.otp} onChange={set('otp')} maxLength={6} required
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '.5rem', fontWeight: 700 }}
                            />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Verify OTP →'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
