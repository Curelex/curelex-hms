// hms-react/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    API.get('/auth/profile')
      .then(({ data }) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('hms_token');
        setUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('hms_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

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

  const logout = () => {
    localStorage.removeItem('hms_token');
    setUser(null);
  };

  // ── FIXED: case-insensitive role check ─────────────────────────
  const hasPerm = (key) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  if (!authReady) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, hasPerm }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);