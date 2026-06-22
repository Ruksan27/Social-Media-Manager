import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState(() => {
    const saved = localStorage.getItem('activeProfile');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('activeProfile', JSON.stringify(activeProfile));
    } else {
      localStorage.removeItem('activeProfile');
    }
  }, [activeProfile]);

  const login = (profile) => {
    setActiveProfile(profile);
  };

  const logout = () => {
    setActiveProfile(null);
  };

  return (
    <AuthContext.Provider value={{ activeProfile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
