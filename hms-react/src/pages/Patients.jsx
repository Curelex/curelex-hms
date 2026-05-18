// hms-react/src/pages/Patients.jsx
import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const emptyForm = {
  name: '', age: '', gender: 'Male', phone: '', email: '',
  address: '', bloodGroup: '', dob: '', status: 'Active',
  allergies: '', assignedDoctor: '',
};

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Only receptionist and admin can admit
  const canAdmit = ['receptionist', 'admin'].includes(user?.role);

  const [patients,    setPatients]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState(emptyForm);
  const [editId,      setEditId]      = useState(null);
  const [viewPatient, setViewPatient] = useState(null);
  const [doctors,     setDoctors]     = useState([]);

  // ── Token state ────────────────────────────────────────────────
  const [tokenModal,    setTokenModal]    = useState(false);
  const [tokenReceipt,  setTokenReceipt]  = useState(null);
  const [newPatient,    setNewPatient]    = useState(null);
  const [tokenDoctorId, setTokenDoctorId] = useState('');
  const [tokenLoading,  setTokenLoading]  = useState(false);

  // ── Admission status cache (patientId → admissionStatus) ───────
  // We fetch active admissions once to show "Admitted" badge on patients
  const [admittedIds, setAdmittedIds] = useState(new Set());

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/patients?search=${search}&page=${page}&limit=15`);
      setPatients(data.patients);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmissions = async () => {
    try {
      const { data } = await API.get('/admissions/active');
      const ids = new Set(data.admissions.map(a => String(a.patient?._id || a.patient)));
      setAdmittedIds(ids);
    } catch {
      // admissions not available for this role — ignore
    }
  };

  useEffect(() => { fetchPatients(); }, [search, page]);
  useEffect(() => { fetchAdmissions(); }, []);
  useEffect(() => {
    API.get('/auth/users')
      .then(r => setDoctors(r.data.filter(u => u.role === 'doctor')));
  }, []);

  // ── Submit new / edit patient ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
    };

    if (editId) {
      await API.put(`/patients/${editId}`, payload);
      setModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchPatients();
    } else {
      const { data: created } = await API.post('/patients', payload);
      setModal(false);
      setForm(emptyForm);
      fetchPatients();
      setNewPatient(created);
      setTokenDoctorId(created.assignedDoctor?._id || created.assignedDoctor || '');
      setTokenModal(true);
    }
  };

  // ── Generate token ─────────────────────────────────────────────
  const handleGenerateToken = async () => {
    if (!tokenDoctorId) return alert('Please select a doctor first.');
    setTokenLoading(true);
    try {
      const { data } = await API.post('/tokens/generate', {
        doctorId:    tokenDoctorId,
        patientId:   newPatient._id,
        patientName: newPatient.name,
      });
      setTokenReceipt(data);
      setTokenModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Token generation failed');
    } finally {
      setTokenLoading(false);
    }
  };

  const skipToken = () => {
    setTokenModal(false);
    setNewPatient(null);
    setTokenDoctorId('');
  };

  // ── Quick admit — navigates to IPD page with patient pre-selected
  // The IPD page handles the actual admit modal
  const handleQuickAdmit = (p) => {
    // Store patient in sessionStorage so IPD page can pre-fill
    sessionStorage.setItem('ipd_admit_patient', JSON.stringify({
      _id:   p._id,
      name:  p.name,
      patientId: p.patientId,
      phone: p.phone,
      assignedDoctor: p.assignedDoctor?._id || p.assignedDoctor || '',
    }));
    navigate('/ipd');
  };

  // ── Edit / Delete ──────────────────────────────────────────────
  const handleEdit = (p) => {
    setForm({
      ...p,
      allergies: p.allergies?.join(', ') || '',
      dob: p.dob ? p.dob.substring(0, 10) : '',
    });
    setEditId(p._id);
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await API.delete(`/patients/${id}`);
    fetchPatients();
  };

  const statusBadge = (s) => {
    const map = { Active: 'badge-success', Discharged: 'badge-gray', Critical: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const pages = Math.ceil(total / 15);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Patients</h1>
        <button
          className="btn btn-primary"
          onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }}
        >
          + Add Patient
        </button>
      </div>

      {/* Patient table */}
      <div className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search by name, ID or phone..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-muted text-small">{total} patients total</div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient ID</th><th>Name</th><th>Age/Gender</th><th>Phone</th>
                  <th>Blood Group</th><th>Doctor</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No patients found</td></tr>
                ) : patients.map(p => {
                  const isAdmitted = admittedIds.has(String(p._id));
                  return (
                    <tr key={p._id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.patientId}</span>
                      </td>
                      <td>
                        <strong>{p.name}</strong><br />
                        <span className="text-muted text-small">{p.email}</span>
                      </td>
                      <td>{p.age}y / {p.gender}</td>
                      <td>{p.phone}</td>
                      <td><span className="badge badge-info">{p.bloodGroup || '—'}</span></td>
                      <td>{p.assignedDoctor?.name || '—'}</td>
                      <td>
                        {/* Show "Admitted" badge if currently admitted, otherwise normal status */}
                        {isAdmitted ? (
                          <span style={{
                            fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                            background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d',
                          }}>
                            🏥 Admitted
                          </span>
                        ) : statusBadge(p.status)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-ghost"
                            onClick={() => setViewPatient(p)}>View</button>
                          <button className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(p)}>Edit</button>

                          {/* ── ADMIT BUTTON — Receptionist only, not already admitted ── */}
                          {canAdmit && !isAdmitted && (
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#0f4c81', color: '#fff',
                                border: 'none', borderRadius: 6,
                                padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              onClick={() => handleQuickAdmit(p)}
                            >
                              🏥 Admit
                            </button>
                          )}

                          {/* If already admitted — go to IPD button */}
                          {canAdmit && isAdmitted && (
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#92400e', color: '#fff',
                                border: 'none', borderRadius: 6,
                                padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              onClick={() => navigate('/ipd')}
                            >
                              View IPD
                            </button>
                          )}

                          <button className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(p._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i+1} className={`page-btn ${page===i+1?'active':''}`}
                onClick={() => setPage(i+1)}>{i+1}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}>›</button>
          </div>
        )}
      </div>

      {/* ── Add / Edit Patient Modal ───────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Patient' : 'Register New Patient'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className="form-control" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Age *</label>
                    <input className="form-control" type="number" value={form.age}
                      onChange={e => setForm({ ...form, age: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender *</label>
                    <select className="form-control" value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select className="form-control" value={form.bloodGroup}
                      onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-control" type="date" value={form.dob}
                      onChange={e => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned Doctor</label>
                    <select className="form-control" value={form.assignedDoctor || ''}
                      onChange={e => setForm({ ...form, assignedDoctor: e.target.value })}>
                      <option value="">None</option>
                      {doctors.map(d => (
                        <option key={d._id} value={d._id}>{d.name} — {d.department}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Active</option><option>Discharged</option><option>Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Allergies (comma-separated)</label>
                  <input className="form-control" value={form.allergies}
                    onChange={e => setForm({ ...form, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Aspirin" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Update Patient' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Token Generation Prompt ──────────────────────────────── */}
      {tokenModal && newPatient && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🎫 Generate Token</h3>
            </div>
            <div className="modal-body">
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                padding: '10px 14px', marginBottom: 18,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{newPatient.name}</div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>
                  {newPatient.patientId} · {newPatient.phone}
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
                Patient registered! Generate a token for their doctor visit today?
              </p>
              <div className="form-group">
                <label className="form-label">Select Doctor *</label>
                <select className="form-control" value={tokenDoctorId}
                  onChange={e => setTokenDoctorId(e.target.value)}>
                  <option value="">— Choose Doctor —</option>
                  {doctors.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                📅 Token date: <strong>{new Date().toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}</strong> — Resets at 12:00 AM
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={skipToken}>Skip</button>
              <button className="btn btn-primary" onClick={handleGenerateToken}
                disabled={tokenLoading || !tokenDoctorId}>
                {tokenLoading ? 'Generating…' : '🎫 Generate Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Token Receipt Modal ───────────────────────────────────── */}
      {tokenReceipt && (
        <div className="modal-overlay" onClick={() => setTokenReceipt(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none' }}>
              <h3 className="modal-title">🎫 Token Generated</h3>
            </div>
            <div className="modal-body" style={{ paddingTop: 0 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f4c81, #38bdf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#fff', fontSize: 42, fontWeight: 900,
              }}>
                {tokenReceipt.tokenNumber}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                Token #{tokenReceipt.tokenNumber}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                <div>👤 <strong>{tokenReceipt.patientName}</strong></div>
                <div>🩺 Dr. <strong>{tokenReceipt.doctor?.name}</strong>
                  {tokenReceipt.doctor?.department ? ` · ${tokenReceipt.doctor.department}` : ''}
                </div>
                <div style={{ marginTop: 6 }}>
                  📅 {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </div>
              </div>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#166534',
              }}>
                ✅ Token resets automatically after 12:00 AM
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setTokenReceipt(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Patient Modal ────────────────────────────────────── */}
      {viewPatient && (
        <div className="modal-overlay" onClick={() => setViewPatient(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Patient Details — {viewPatient.patientId}</h3>
              <button className="modal-close" onClick={() => setViewPatient(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Name',        viewPatient.name],
                  ['Age',         `${viewPatient.age} years`],
                  ['Gender',      viewPatient.gender],
                  ['Phone',       viewPatient.phone],
                  ['Email',       viewPatient.email || '—'],
                  ['Blood Group', viewPatient.bloodGroup || '—'],
                  ['Address',     viewPatient.address || '—'],
                  ['Status',      admittedIds.has(String(viewPatient._id)) ? '🏥 Currently Admitted (IPD)' : viewPatient.status],
                  ['Doctor',      viewPatient.assignedDoctor?.name || '—'],
                  ['Allergies',   viewPatient.allergies?.join(', ') || 'None'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-muted text-small">{k}</div>
                    <div style={{ fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Quick navigate to IPD for admitted patients */}
              {admittedIds.has(String(viewPatient._id)) && canAdmit && (
                <div style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setViewPatient(null); navigate('/ipd'); }}
                  >
                    🏥 Go to IPD — View Admission Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}