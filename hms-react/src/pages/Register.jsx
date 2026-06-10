// hms-react/src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

const ROLES = [
  { value: 'admin',          label: 'Admin',          icon: '🛡️',  desc: 'Full system access' },
  { value: 'doctor',         label: 'Doctor',         icon: '👨‍⚕️', desc: 'Patient care & records' },
  { value: 'nurse',          label: 'Nurse',          icon: '👩‍⚕️', desc: 'Patient monitoring' },
  { value: 'receptionist',   label: 'Receptionist',   icon: '🗂️',  desc: 'Appointments & billing' },
  { value: 'pharmacist',     label: 'Pharmacist',     icon: '💊',  desc: 'Pharmacy & inventory' },
  { value: 'lab_technician', label: 'Lab Technician', icon: '🧪',  desc: 'Lab tests & reports' },
];

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Neurology', 'Radiology', 'Emergency', 'Surgery',
  'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT', 'Administration',
];

export default function Register() {
  const [step,         setStep]         = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [form,         setForm]         = useState({
    clinicName:      '',   // ✅ NEW — required to create clinic on register
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
    department:      '',
    phone:           '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    // ✅ Only require clinicName when registering as admin
    //    (admins create a new clinic; other roles are added by an existing admin)
    if (selectedRole === 'admin' && !form.clinicName.trim()) {
      return setError('Clinic / Hospital name is required for admin registration');
    }

    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', {
        clinicName:  form.clinicName,   // ✅ sent to backend
        name:        form.name,
        email:       form.email,
        password:    form.password,
        role:        selectedRole,
        department:  form.department,
        phone:       form.phone,
      });

      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: step === 1 ? 560 : 460, width: '100%' }}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="login-logo">
          <div style={{ fontSize: 36, marginBottom: 6 }}>🏥</div>
          <h1>MediCare HMS</h1>
          <p>{step === 1 ? 'Select your role to get started' : 'Create your account'}</p>
        </div>

        {/* ── Step indicator ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: step >= s ? '#0f4c81' : '#e2e8f0',
                color:      step >= s ? '#fff'    : '#94a3b8',
                transition: 'all 0.3s',
              }}>{s}</div>
              {s < 2 && (
                <div style={{
                  width: 40, height: 2,
                  background: step > s ? '#0f4c81' : '#e2e8f0',
                  transition: 'all 0.3s',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* ── STEP 1: Role Selection ────────────────────────────────── */}
        {step === 1 && (
          <div>
            <p style={{ textAlign: 'center', marginBottom: 16, fontSize: 13, color: '#64748b' }}>
              Choose the role that best describes your position
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSelect(r.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '16px 12px', border: '2px solid #e2e8f0', borderRadius: 10,
                    background: '#fff', cursor: 'pointer', transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f4c81'; e.currentTarget.style.background = '#f0f6ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                >
                  <span style={{ fontSize: 26 }}>{r.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.desc}</span>
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: Registration Form ─────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>

            {/* Selected role badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: '#f0f6ff', borderRadius: 8, marginBottom: 18, border: '1px solid #bfdbfe',
            }}>
              <span style={{ fontSize: 20 }}>{ROLES.find(r => r.value === selectedRole)?.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f4c81' }}>
                  {ROLES.find(r => r.value === selectedRole)?.label}
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ← Change role
                </button>
              </div>
            </div>

            {/* ✅ Clinic name — only shown for admin, since only admins create a new clinic */}
            {selectedRole === 'admin' && (
              <div className="form-group">
                <label className="form-label">Clinic / Hospital Name *</label>
                <input
                  className="form-control"
                  name="clinicName"
                  type="text"
                  placeholder="e.g. City Health Clinic"
                  value={form.clinicName}
                  onChange={handleChange}
                  required
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  This creates a new isolated clinic workspace.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" name="name" type="text" placeholder="Dr. John Smith"
                value={form.name} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-control" name="email" type="email" placeholder="you@hospital.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" name="phone" type="tel" placeholder="+91 98765 43210"
                value={form.phone} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" name="department" value={form.department} onChange={handleChange}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-control" name="password" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-control" name="confirmPassword" type="password" placeholder="Re-enter password"
                value={form.confirmPassword} onChange={handleChange} required />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}