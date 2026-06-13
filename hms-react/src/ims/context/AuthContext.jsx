import { createContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getMe, login as loginApi, signup as signupApi } from "../services/authService";
import api from "../services/api";

export const AuthContext = createContext(null);

const CLINIC_ROLES = ['receptionist', 'doctor', 'pharmacist', 'admin'];

async function fetchClinicToken(email, password, role) {
  try {
    if (!CLINIC_ROLES.includes(role)) return;
    const res = await fetch(
      `${import.meta.env.VITE_CLINIC_API_URL || 'http://localhost:5000/api/clinic'}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      }
    );
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('clinic_token', data.token);
    }
  } catch (err) {
    console.warn('Clinic token fetch failed:', err.message);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      // ── SSO Exchange Check ──────────────────────────────────────
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get("sso");
      if (ssoToken) {
        try {
          // Exchange the one-time HMS token for an IMS JWT
          const { data } = await api.post("/auth/sso-exchange", { token: ssoToken });
          localStorage.setItem("ims_token", data.token);
          // Remove the ?sso= token from the URL for security/cleanliness
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("SSO exchange failed:", error?.response?.data?.message || error.message);
        }
      }
      
      const token = localStorage.getItem("ims_token");
      if (!token) { setLoading(false); return; }
      try {
        const { user: currentUser } = await getMe();
        console.log("bootstrap getMe success:", currentUser); // ← DEBUG
        setUser(currentUser);
      } catch (error) {
        // ✅ FIXED — log the error instead of silently removing token
        console.error("bootstrap getMe failed:", error?.response?.status, error?.message);
        
        // Only remove token on 401 — not on network errors
        if (error?.response?.status === 401) {
          localStorage.removeItem("ims_token");
          localStorage.removeItem("clinic_token");
        }
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (payload) => {
    const data = await loginApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    await fetchClinicToken(payload.email, payload.password, data.user.role);
    toast.success("Logged in");
  };

  const signup = async (payload) => {
    const data = await signupApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    await fetchClinicToken(payload.email, payload.password, data.user.role);
    toast.success("Account created");
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("clinic_token");
    setUser(null);
  };
  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};