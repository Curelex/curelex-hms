// hms-react/src/pages/PatientRegister.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PatientRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    clinicName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { registerPatient, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Basic validation
    if (!form.clinicName) {
      setError('Clinic/Hospital name is required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const result = await registerPatient(form);
    
    if (result.success) {
      setSuccess('Registration successful! Please login.');
      setTimeout(() => {
        navigate('/patient-login');
      }, 2000);
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
          <h1>Patient Registration</h1>
          <p>Create your account to get started</p>
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

        {success && (
          <div className="error-msg" style={{ 
            background: '#d1fae5', 
            color: '#065f46', 
            border: '1px solid #86efac',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinic / Hospital Name *</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter clinic or hospital name"
              value={form.clinicName}
              onChange={e => setForm({ ...form, clinicName: e.target.value })}
              required
            />
            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              This is the clinic where you are a patient
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
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
            <label className="form-label">Phone Number *</label>
            <input
              className="form-control"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              className="form-control"
              type="password"
              placeholder="Create a password (min 6 characters)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Password must be at least 6 characters
            </small>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/patient-login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
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