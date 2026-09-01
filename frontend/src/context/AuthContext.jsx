import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { id, email, username, full_name }
  const [loading, setLoading] = useState(true);  // true while checking stored token

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    api.getMe(token)
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const me = await api.getMe(data.access_token);
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (email, username, password, full_name) => {
    const data = await api.register({ email, username, password, full_name });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const me = await api.getMe(data.access_token);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) { try { await api.logout(token); } catch (_) {} }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const token = localStorage.getItem('access_token');
    const updated = await api.updateMe(token, payload);
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
