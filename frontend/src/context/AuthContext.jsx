// src/context/AuthContext.jsx
// Cookie-based auth — profile data is validated via /api/profiles/me on load
// The actual JWT lives in an HttpOnly cookie (JS cannot read it — XSS safe)

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Show nothing until session check done

  // ── On mount: verify session from cookie ──────────────────────────────────
  useEffect(() => {
    api.get('/profiles/me')
      .then((res) => setActiveProfile(res.data))
      .catch(() => setActiveProfile(null))
      .finally(() => setLoading(false));
  }, []);

  // ── Login: server sets HttpOnly cookie, we store display info in memory ───
  const login = (profile) => {
    setActiveProfile(profile);
  };

  // ── Logout: server clears the cookie ─────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/profiles/logout');
    } catch (_) { /* still clear local state even if request fails */ }
    setActiveProfile(null);
  };

  return (
    <AuthContext.Provider value={{ activeProfile, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
