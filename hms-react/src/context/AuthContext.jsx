// hms-react/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

// ── Role → nav section permissions ───────────────────────────────────────────
// Maps each role to which nav KEYS they can see.
// Nav items use: 'dashboard', 'patients', 'ipd', 'billing', 'pharmacy',
//               'lab', 'inventory', 'staff', 'room-settings'
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'patients', 'ipd', 'billing',
    'pharmacy', 'lab', 'inventory', 'staff', 'room-settings',
  ],
  doctor: [
    'dashboard', 'patients', 'ipd', 'lab',
  ],
  nurse: [
    'dashboard', 'patients', 'ipd',
  ],
  receptionist: [
    'dashboard', 'patients', 'billing', 'tokens',
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'inventory',
  ],
  lab_technician: [
    'dashboard', 'patients', 'lab',
  ],
};

export const AuthProvider = ({ children }) => {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // On app load: restore session from token
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
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      console.log('LOGIN RESPONSE:', data);
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // ── Permission check ──────────────────────────────────────────────────────
  // Checks nav-section keys ('dashboard', 'pharmacy', etc.) against role.
  // Admin always gets everything.
  // For other roles: first checks ROLE_PERMISSIONS map (role-based),
  // then falls back to checking user.permissions array (DB-stored fine-grained).
  const hasPerm = (key) => {
    if (!user) return false;

    const role = user.role?.toLowerCase();

    // Admin sees everything
    if (role === 'admin') return true;

    // Check role-based nav permissions first
    const roleNavPerms = ROLE_PERMISSIONS[role];
    if (roleNavPerms) return roleNavPerms.includes(key);

    // Fallback: check fine-grained DB permissions array
    // (covers custom roles not listed above)
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