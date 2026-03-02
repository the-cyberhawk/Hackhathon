import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE}/api`,
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Auth ──────────────────────────────────────────────────────────────
export const signup = (email, phone, password) =>
    api.post('/auth/signup', { email, phone, password });

export const verifyOtp = (phone, otp) =>
    api.post('/auth/verify-otp', { phone, otp });

export const login = (identifier, password) =>
    api.post('/auth/login', { identifier, password });

export const forgotPassword = (identifier) =>
    api.post('/auth/forgot-password', { identifier });

export const resetPassword = (identifier, otp, new_password) =>
    api.post('/auth/reset-password', { identifier, otp, new_password });

// ── User ─────────────────────────────────────────────────────────────
export const getMe = () => api.get('/user/me');

// ── KYC ──────────────────────────────────────────────────────────────
export const getKycStatus = () => api.get('/kyc/status');

export const saveStep1 = (data) => api.post('/kyc/step1', data);

export const saveStep2 = (formData) =>
    api.post('/kyc/step2', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const saveStep3 = (data) => api.post('/kyc/step3', data);

export const saveStep4 = (formData) =>
    api.post('/kyc/step4', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const saveStep5 = (formData) =>
    api.post('/kyc/step5', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const submitKyc = () => api.post('/kyc/submit');

export const getKycData = () => api.get('/kyc/data');

// ── Admin ────────────────────────────────────────────────────────────
export const adminLogin = (username, password) =>
    api.post('/admin/login', { username, password });

export const getMerchants = () => api.get('/admin/merchants');

export const getMerchantDetail = (userId) => api.get(`/admin/merchants/${userId}`);

export const updateMerchantStatus = (userId, status, notes) =>
    api.post('/admin/update-status', { user_id: userId, status, notes });

export const saveAdminNotes = (userId, notes) =>
    api.post('/admin/save-notes', { user_id: userId, notes });

export default api;
