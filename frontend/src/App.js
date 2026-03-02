import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminRoute, setIsAdminRoute] = useState(false);

    useEffect(() => {
        // Check if on admin route
        const checkRoute = () => {
            setIsAdminRoute(window.location.pathname.startsWith('/admin'));
        };
        checkRoute();
        window.addEventListener('popstate', checkRoute);
        return () => window.removeEventListener('popstate', checkRoute);
    }, []);

    useEffect(() => {
        // Check user auth
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (stored && token) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
        // Check admin auth
        const adminAuth = localStorage.getItem('adminAuth');
        if (adminAuth === 'true') {
            setIsAdmin(true);
        }
    }, []);

    const handleLogin = (userData) => setUser(userData);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const handleAdminLogin = () => {
        setIsAdmin(true);
    };

    const handleAdminLogout = () => {
        localStorage.removeItem('adminAuth');
        setIsAdmin(false);
    };

    // Admin routes
    if (isAdminRoute) {
        if (!isAdmin) {
            return <AdminLogin onLogin={handleAdminLogin} />;
        }
        return <AdminDashboard onLogout={handleAdminLogout} />;
    }

    // Merchant routes
    if (!user) return <AuthPage onLogin={handleLogin} />;
    return <Dashboard user={user} onLogout={handleLogout} />;
}
