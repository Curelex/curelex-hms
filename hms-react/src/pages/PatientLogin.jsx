// hms-react/src/pages/PatientLogin.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PatientLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    
    if (result.success) {
      if (result.user?.role === 'patient') {
        navigate('/patient-dashboard');
      } else {
        setError('This account is not registered as a patient. Please use staff login.');
      }
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
          <h1>Patient Login</h1>
          <p>Access your health records and appointments</p>
        </div>

        {error && (
          <div className="error-msg" style={{ 
            background: '#fef2f2', 
            color: '#dc2626', 
            border: '1px solid #fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-control"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              If you were registered by receptionist, use the same password to login
            </small>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/patient-register" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
            ← Back to Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}