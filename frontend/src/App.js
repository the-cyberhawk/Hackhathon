import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

export default function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (stored && token) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
    }, []);

    const handleLogin = (userData) => setUser(userData);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) return <AuthPage onLogin={handleLogin} />;
    return <Dashboard user={user} onLogout={handleLogout} />;
}
