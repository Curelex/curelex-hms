import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // ── On every app boot: fetch fresh profile using stored token ──
  // We NEVER store the user object in localStorage.
  // Only the JWT token is stored. All user data (incl. permissions)
  // always comes fresh from the server — so permission changes by
  // an admin take effect on the staff member's next page load.
  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    API.get('/auth/profile')
      .then(({ data }) => {
        setUser(data); // includes permissions[] from DB
      })
      .catch(() => {
        // Token expired or invalid — clear it silently
        localStorage.removeItem('hms_token');
        setUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('hms_token', data.token); // token only
      setUser(data.user);                             // user with permissions in memory
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────
  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('hms_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('hms_token');
    setUser(null);
  };

  // ── Permission helper ──────────────────────────────────────────
  // hasPerm('billing') → true / false
  // Admins always pass every permission check.
  const hasPerm = (key) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  // Block render until we know auth state (avoids flash of wrong UI)
  if (!authReady) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, hasPerm }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);