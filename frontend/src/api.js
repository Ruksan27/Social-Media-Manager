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
// redirect to /login automatically instead of showing raw errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any stale client state and redirect
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
