// hms-react/src/pages/TokenPanel.jsx
// Complete Patient Registration + Token Queue Management

import React, { useEffect, useState, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TokenActionButtons from '../components/TokenActionButtons';
import PatientHistoryModal from '../components/PatientHistoryModal';

// ── Helper Functions ─────────────────────────────────────────────
function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function followUpBadgeStyle(days) {
  if (days < 0) return { bg: 'rgba(231,76,60,0.10)', border: 'rgba(231,76,60,0.3)', color: '#c0392b', label: 'Overdue' };
  if (days === 0) return { bg: 'rgba(231,76,60,0.10)', border: 'rgba(231,76,60,0.3)', color: '#c0392b', label: 'Today!' };
  if (days <= 3) return { bg: 'rgba(243,156,18,0.10)', border: 'rgba(243,156,18,0.3)', color: '#d68910', label: `${days}d left` };
  return { bg: 'rgba(0,184,148,0.08)', border: 'rgba(0,184,148,0.25)', color: '#00a878', label: `${days}d left` };
}

const STATUS_COLORS = {
  Waiting: { bg: '#fef3c7', color: '#92400e' },
  Called: { bg: '#dbeafe', color: '#1e40af' },
  Done: { bg: '#d1fae5', color: '#065f46' },
  Skipped: { bg: '#fee2e2', color: '#b91c1c' },
};

function PhoneInput({ label, value, onChange, placeholder }) {
  const isFull = value.length === 10;
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10}
          value={value} onChange={handleChange}
          placeholder={placeholder || '10-digit number'}
          style={{
            width: '100%', padding: '9px 40px 9px 12px',
            border: `1.5px solid ${value.length > 0 && !isFull ? '#e74c3c' : isFull ? '#00a878' : '#e2e8f0'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
            color: '#1e293b', background: '#fff', boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: isFull ? '#00a878' : value.length > 0 ? '#e74c3c' : '#94a3b8' }}>
          {value.length}/10
        </span>
      </div>
      {value.length > 0 && !isFull && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Enter exactly 10 digits ({10 - value.length} more needed)</div>}
      {isFull && <div style={{ fontSize: 11, color: '#00a878', marginTop: 3 }}>✓ Valid number</div>}
    </div>
  );
}

function PaymentBadge({ method }) {
  if (method === 'upi') {
    return (
      <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
        📲 UPI
      </span>
    );
  }
  return (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      💵 Cash
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function TokenPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue'); // 'register' or 'queue'

  // Data states
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [summary, setSummary] = useState([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyPatient, setHistoryPatient] = useState(null);

  // Filter states
  const [filterDoc, setFilterDoc] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Registration states
  const [showTokenReceipt, setShowTokenReceipt] = useState(null);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Patient search for registration
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showReturningForm, setShowReturningForm] = useState(false);
  const [selectedReturningPatient, setSelectedReturningPatient] = useState(null);
  const [selectedReturningVisits, setSelectedReturningVisits] = useState([]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // Fetch doctors and patients
  useEffect(() => {
    API.get('/auth/users').then(r => {
      const docs = r.data.filter(u => u.role === 'doctor');
      setDoctors(docs);
    });
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await API.get('/patients?limit=500');
      setPatients(data.patients || []);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  };

  // Fetch today's tokens
  const fetchTokens = useCallback(async () => {
    try {
      const [todayRes, summaryRes] = await Promise.all([
        API.get('/tokens/today'),
        API.get('/tokens/summary'),
      ]);
      setTokens(todayRes.data.tokens || []);
      setSummary(summaryRes.data.summary || []);
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTokens();
    const iv = setInterval(fetchTokens, 30000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

  // ── Patient Search for Registration ───────────────────────────
  const handleSearchPatient = async () => {
    if (!searchPhone || searchPhone.length !== 10) {
      setRegisterError('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const { data } = await API.get(`/patients?search=${searchPhone}`);
      const matches = data.patients || [];
      const unique = matches.reduce((acc, p) => {
        const key = `${p.phone}_${p.name?.toLowerCase()}`;
        if (!acc[key] || new Date(p.createdAt) > new Date(acc[key].createdAt)) {
          acc[key] = p;
        }
        return acc;
      }, {});
      setSearchResults(Object.values(unique));
    } catch (err) {
      setRegisterError('Failed to search patient');
    }
  };

  const getPatientVisits = (patient) => {
    return patients.filter(p =>
      (p.phone === patient.phone) &&
      (p.name?.toLowerCase() === patient.name?.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // ── Register New Patient ───────────────────────────────────────
  const handleRegisterPatient = async (formData) => {
    setRegisterBusy(true);
    setRegisterError('');
    try {
      const { data: patient } = await API.post('/patients', {
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email || '',
        address: formData.address || '',
        assignedDoctor: formData.doctorId,
      });
      const { data: token } = await API.post('/tokens/generate', {
        doctorId: formData.doctorId,
        patientId: patient._id,
        patientName: patient.name,
      });
      setShowTokenReceipt({ patient, token });
      await fetchPatients();
      await fetchTokens();
      setActiveTab('queue');
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegisterBusy(false);
    }
  };

  // ── Register Returning Patient Visit ───────────────────────────
  const handleReturningVisit = async (patient, formData) => {
    setRegisterBusy(true);
    setRegisterError('');
    try {
      const { data: token } = await API.post('/tokens/generate', {
        doctorId: formData.doctorId,
        patientId: patient._id,
        patientName: patient.name,
      });
      setShowTokenReceipt({ patient, token });
      await fetchTokens();
      setActiveTab('queue');
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to generate token');
    } finally {
      setRegisterBusy(false);
    }
  };

  // ── Update Token Status ────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/tokens/${id}/status`, { status });
      fetchTokens();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Update Follow-up ───────────────────────────────────────────
  const updateFollowUp = async (tokenId, followUpDate, followUpNote) => {
    try {
      await API.patch(`/tokens/${tokenId}/followup`, { followUpDate, followUpNote });
      fetchTokens();
    } catch (err) {
      console.error('Failed to update follow-up:', err);
    }
  };

  const displayed = tokens.filter(t => {
    const docMatch = !filterDoc || t.doctor?._id === filterDoc;
    const stMatch = !filterStatus || t.status === filterStatus;
    return docMatch && stMatch;
  });

  const canUpdate = ['admin', 'doctor', 'receptionist'].includes(user?.role);
  const waitingCount = tokens.filter(t => t.status === 'Waiting').length;

  return (
    <div>
      {/* ── Page Header with Tabs ── */}
      <div className="page-header" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>🎫 Token Management</h1>
          <p className="text-muted text-small">📅 {today} · Auto-refreshes every 30 seconds</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setActiveTab('register'); setShowReturningForm(false); setSearchResults([]); setSearchPhone(''); }}
            className={`btn ${activeTab === 'register' ? 'btn-primary' : 'btn-outline'}`}
          >
            ➕ Register Patient
          </button>
          <button
            onClick={() => { setActiveTab('queue'); fetchTokens(); }}
            className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
          >
            📋 Token Queue {waitingCount > 0 && `(${waitingCount})`}
          </button>
          <button onClick={fetchTokens} className="btn btn-outline">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── REGISTER PATIENT TAB ── */}
      {activeTab === 'register' && (
        <div>
          {!showReturningForm ? (
            // Patient Search Panel
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>🔍 Find or Register Patient</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>Search by phone number to check if patient already exists</p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <PhoneInput
                    label="Phone Number"
                    value={searchPhone}
                    onChange={setSearchPhone}
                    placeholder="Enter 10-digit number"
                  />
                </div>
                <button
                  onClick={handleSearchPatient}
                  className="btn btn-primary"
                  disabled={searchPhone.length !== 10}
                >
                  Search
                </button>
                <button
                  onClick={() => setShowReturningForm(true)}
                  className="btn btn-outline"
                >
                  + New Patient
                </button>
              </div>

              {registerError && (
                <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  ⚠️ {registerError}
                </div>
              )}

              {searchResults.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>
                    {searchResults.length} patient(s) found
                  </div>
                  {searchResults.map(patient => {
                    const visits = getPatientVisits(patient);
                    const lastVisit = visits[0];
                    const followUpDays = daysUntil(patient.followUpDate);
                    return (
                      <div key={patient._id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{patient.name}</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                              {patient.age}y · {patient.gender} · 📞 {patient.phone}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                              {visits.length} visit(s) · Last: {lastVisit?.createdAt ? new Date(lastVisit.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                            {patient.followUpDate && (
                              <div style={{ marginTop: 6 }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                  background: followUpBadgeStyle(followUpDays).bg,
                                  color: followUpBadgeStyle(followUpDays).color,
                                  border: `1px solid ${followUpBadgeStyle(followUpDays).border}`,
                                }}>
                                  📅 Follow-up: {patient.followUpDate} ({followUpBadgeStyle(followUpDays).label})
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedReturningPatient(patient);
                              setSelectedReturningVisits(visits);
                              setShowReturningForm(true);
                            }}
                            className="btn btn-primary"
                          >
                            {patient.followUpDate ? '📅 Follow-up Visit' : '🔄 Returning Patient'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Registration Form
            <PatientRegistrationForm
              doctors={doctors}
              initialPatient={selectedReturningPatient}
              visits={selectedReturningVisits}
              onRegister={selectedReturningPatient ? handleReturningVisit : handleRegisterPatient}
              onBack={() => {
                setShowReturningForm(false);
                setSelectedReturningPatient(null);
                setSelectedReturningVisits([]);
                setRegisterError('');
              }}
              busy={registerBusy}
              error={registerError}
            />
          )}
        </div>
      )}

      {/* ── TOKEN QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <>
          {/* Summary Cards */}
          {summary.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
              {summary.map(s => (
                <div key={s.doctorId} className="card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>🩺 Dr. {s.doctorName}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{s.department || 'General'}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Wait', value: s.waiting, bg: '#fef3c7', color: '#92400e' },
                      { label: 'Called', value: s.called, bg: '#dbeafe', color: '#1e40af' },
                      { label: 'Done', value: s.done, bg: '#d1fae5', color: '#065f46' },
                    ].map(st => (
                      <span key={st.label} style={{
                        flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.color,
                      }}>{st.value} {st.label}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Latest: #{s.lastToken}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={filterDoc} onChange={e => setFilterDoc(e.target.value)} className="form-control" style={{ width: 180 }}>
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control" style={{ width: 130 }}>
                <option value="">All Status</option>
                {['Waiting', 'Called', 'Done', 'Skipped'].map(s => <option key={s}>{s}</option>)}
              </select>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>{displayed.length} token(s)</div>
            </div>
          </div>

          {/* Token Table */}
          {loading ? (
            <div className="spinner" />
          ) : displayed.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
              <div>No tokens found for today</div>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>#</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Token</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Patient</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Doctor</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Time</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Status</th>
                    {canUpdate && <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t, i) => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Waiting;
                    return (
                      <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0f4c81, #38bdf8)',
                            color: '#fff', fontWeight: 800, fontSize: 16,
                          }}>{t.tokenNumber}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.patientName || t.patient?.name || 'Walk-in'}</div>
                          {t.patient?.patientId && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.patient.patientId}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>Dr. {t.doctor?.name || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                          {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color,
                          }}>{t.status}</span>
                        </td>
                        {canUpdate && (
                          <td style={{ padding: '12px 14px' }}>
                            {t.status === 'Waiting' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => updateStatus(t._id, 'Called')} className="btn btn-sm btn-primary">📢 Call</button>
                                <button onClick={() => updateStatus(t._id, 'Skipped')} className="btn btn-sm btn-danger">Skip</button>
                              </div>
                            )}
                            {t.status === 'Called' && (
                              <button onClick={() => updateStatus(t._id, 'Done')} className="btn btn-sm btn-success">✅ Done</button>
                            )}
                            {t.status === 'Done' && (
                              <TokenActionButtons
                                token={{
                                  ...t,
                                  patientId: t.patient,
                                  doctorId:  t.doctor,
                                  patientCode: t.patient?.patientId || '',
                                }}
                                clinicId={user?.clinicId || 'default'}
                                onRefresh={fetchTokens}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Token Receipt Modal */}
      {showTokenReceipt && (
        <div className="modal-overlay" onClick={() => setShowTokenReceipt(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '28px 24px' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #0f4c81, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <div style={{ color: '#fff', fontSize: 42, fontWeight: 800 }}>{showTokenReceipt.token.tokenNumber}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Token Generated!</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{showTokenReceipt.patient.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Dr. {showTokenReceipt.token.doctor?.name}</div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                📅 {new Date().toLocaleDateString('en-IN')} · 🕐 {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button onClick={() => setShowTokenReceipt(null)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Patient History Modal */}
      {historyPatient && (
        <PatientHistoryModal
          patient={historyPatient}
          onClose={() => setHistoryPatient(null)}
        />
      )}
    </div>
  );
}

// ── Patient Registration Form Component ─────────────────────────
function PatientRegistrationForm({ doctors, initialPatient, visits, onRegister, onBack, busy, error }) {
  const [form, setForm] = useState({
    name: initialPatient?.name || '',
    age: initialPatient?.age || '',
    gender: initialPatient?.gender || 'Male',
    phone: initialPatient?.phone || '',
    email: initialPatient?.email || '',
    address: initialPatient?.address || '',
    doctorId: '',
    symptoms: '',
    notes: '',
    paymentMethod: 'cash',
    totalFee: '',
    paid: '',
  });

  const [localError, setLocalError] = useState('');

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const dues = Math.max(0, (parseFloat(form.totalFee) || 0) - (parseFloat(form.paid) || 0));

  // ✅ NEW: When doctor changes, auto-fill consultation fee
  const handleDoctorChange = (doctorId) => {
    updateForm('doctorId', doctorId);
    const selectedDoc = doctors.find(d => d._id === doctorId);
    if (selectedDoc?.consultationFee && selectedDoc.consultationFee > 0) {
      updateForm('totalFee', String(selectedDoc.consultationFee));
    } else {
      updateForm('totalFee', '');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setLocalError('Patient name is required'); return; }
    if (!form.doctorId) { setLocalError('Please select a doctor'); return; }
    if (form.phone && form.phone.length !== 10) { setLocalError('Phone number must be 10 digits'); return; }
    setLocalError('');
    await onRegister(initialPatient || form, form);
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 4 }}>
            {initialPatient ? `New Visit - ${initialPatient.name}` : 'New Patient Registration'}
          </h3>
          {initialPatient && visits && visits.length > 0 && (
            <p style={{ fontSize: 12, color: '#64748b' }}>{visits.length} previous visit(s)</p>
          )}
        </div>
        <button onClick={onBack} className="btn btn-ghost">← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Column - Patient Info */}
        <div>
          <h4 style={{ fontSize: 14, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>👤 Patient Information</h4>
          <div style={{ display: 'grid', gap: 14 }}>
            <input type="text" className="form-control" placeholder="Full Name *" value={form.name} onChange={e => updateForm('name', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="number" className="form-control" placeholder="Age" value={form.age} onChange={e => updateForm('age', e.target.value)} />
              <select className="form-control" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <PhoneInput label="" value={form.phone} onChange={v => updateForm('phone', v)} placeholder="Phone Number" />
            <input type="email" className="form-control" placeholder="Email (optional)" value={form.email} onChange={e => updateForm('email', e.target.value)} />
            <textarea className="form-control" rows={2} placeholder="Symptoms / Complaint" value={form.symptoms} onChange={e => updateForm('symptoms', e.target.value)} />
          </div>
        </div>

        {/* Right Column - Doctor & Payment */}
        <div>
          <h4 style={{ fontSize: 14, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>👨‍⚕️ Doctor & Payment</h4>
          <div style={{ display: 'grid', gap: 14 }}>

            {/* ✅ UPDATED: Doctor select with auto-fill fee */}
            <div>
              <select
                className="form-control"
                value={form.doctorId}
                onChange={e => handleDoctorChange(e.target.value)}
              >
                <option value="">— Select Doctor * —</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} ({doc.department || 'General'})
                    {doc.consultationFee > 0 ? ` — ₹${Number(doc.consultationFee).toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </select>
              {/* ✅ Show fee hint when doctor with fee is selected */}
              {form.doctorId && doctors.find(d => d._id === form.doctorId)?.consultationFee > 0 && (
                <div style={{
                  marginTop: 6, fontSize: 11, color: '#059669', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  ✅ Consultation fee auto-filled: ₹{Number(doctors.find(d => d._id === form.doctorId)?.consultationFee).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateForm('paymentMethod', 'cash')} className={`btn ${form.paymentMethod === 'cash' ? 'btn-success' : 'btn-outline'}`} style={{ flex: 1 }}>💵 Cash</button>
              <button onClick={() => updateForm('paymentMethod', 'upi')} className={`btn ${form.paymentMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>📲 UPI</button>
            </div>

            {/* ✅ Total Fee — pre-filled but editable */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: '#64748b', fontWeight: 600, pointerEvents: 'none', zIndex: 1,
              }}>₹</span>
              <input
                type="number"
                className="form-control"
                placeholder="Total Fee"
                value={form.totalFee}
                onChange={e => updateForm('totalFee', e.target.value)}
                style={{ paddingLeft: 26 }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: '#64748b', fontWeight: 600, pointerEvents: 'none', zIndex: 1,
              }}>₹</span>
              <input
                type="number"
                className="form-control"
                placeholder="Amount Paid"
                value={form.paid}
                onChange={e => updateForm('paid', e.target.value)}
                style={{ paddingLeft: 26 }}
              />
            </div>

            <div style={{ background: dues > 0 ? '#fef2f2' : '#f0fdf4', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Dues Remaining</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: dues > 0 ? '#dc2626' : '#16a34a' }}>₹{dues.toLocaleString()}</div>
            </div>

            <textarea className="form-control" rows={2} placeholder="Additional Notes" value={form.notes} onChange={e => updateForm('notes', e.target.value)} />
          </div>
        </div>
      </div>

      {(error || localError) && (
        <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
          ⚠️ {error || localError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
        <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
          {busy ? 'Processing...' : (initialPatient ? '🎫 Generate Token' : '🎫 Register & Generate Token')}
        </button>
      </div>
    </div>
  );
}