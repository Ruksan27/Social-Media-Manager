// src/api.js
// Centralized axios instance — all API calls go through here
// withCredentials: true sends the HttpOnly cookie on every request

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Critical: sends HttpOnly cookie cross-origin
});

// ── Response interceptor ────────────────────────────────────────────────────
// If the server returns 401 (session expired / not logged in),
// redirect to /login — but ONLY if we are not already there.
// Without this guard, /profiles/me returning 401 while on /login would
// trigger window.location.href='/login' → full reload → infinite loop.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
