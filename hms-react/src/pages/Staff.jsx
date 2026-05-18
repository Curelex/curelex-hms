// hms-react/src/pages/Staff.jsx
import React, { useEffect, useState } from 'react';
import API from '../utils/api';

// ── Module definitions ────────────────────────────────────────
const ALL_MODULES = [
  { key: 'dashboard',     label: 'Dashboard',      icon: '🏠' },
  { key: 'patients',      label: 'Patients',        icon: '👤' },
  { key: 'ipd',           label: 'IPD / Admitted',  icon: '🏥' },
  { key: 'billing',       label: 'Billing',         icon: '💳' },
  { key: 'prescriptions', label: 'Prescriptions',   icon: '📝' },
  { key: 'pharmacy',      label: 'Pharmacy',        icon: '💊' },
  { key: 'lab',           label: 'Lab Tests',       icon: '🧪' },
  { key: 'inventory',     label: 'Inventory',       icon: '📦' },
];

const ROLE_DEFAULTS = {
  admin:          ALL_MODULES.map(m => m.key),
  doctor:         ['dashboard', 'patients', 'ipd', 'prescriptions', 'lab'],
  nurse:          ['dashboard', 'patients', 'ipd', 'lab'],
  receptionist:   ['dashboard', 'patients', 'ipd', 'billing'],
  pharmacist:     ['dashboard', 'prescriptions', 'pharmacy', 'inventory'],
  lab_technician: ['dashboard', 'patients', 'lab'],
};

const ROLE_COLOR = {
  admin:          { bg: '#fee2e2', color: '#dc2626' },
  doctor:         { bg: '#dbeafe', color: '#1d4ed8' },
  nurse:          { bg: '#d1fae5', color: '#059669' },
  receptionist:   { bg: '#fef3c7', color: '#b45309' },
  pharmacist:     { bg: '#ede9fe', color: '#7c3aed' },
  lab_technician: { bg: '#ffedd5', color: '#c2410c' },
};

const emptyForm = {
  name: '', email: '', password: '',
  role: 'receptionist', department: '', phone: '',
  permissions: ROLE_DEFAULTS['receptionist'],
};

const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];
const departments = [
  'General Medicine', 'Surgery', 'Cardiology', 'Pediatrics', 'Orthopedics',
  'Neurology', 'Gynecology', 'Radiology', 'Pathology', 'Emergency', 'Pharmacy', 'Administration',
];

// ── Currency formatter ────────────────────────────────────────
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Staff() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState(emptyForm);
  const [editId,      setEditId]      = useState(null);
  const [filterRole,  setFilterRole]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // ── Today's Work panel ────────────────────────────────────────
  const [workPanel,   setWorkPanel]   = useState(null);   // staff user object
  const [workData,    setWorkData]    = useState(null);
  const [workLoading, setWorkLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/auth/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Open Today's Work panel ───────────────────────────────────
  const openWorkPanel = async (u) => {
    setWorkPanel(u);
    setWorkData(null);
    setWorkLoading(true);
    try {
      const { data } = await API.get(`/staff-work/${u._id}`);
      setWorkData(data);
    } catch {
      setWorkData({ error: true });
    } finally {
      setWorkLoading(false);
    }
  };

  const closeWorkPanel = () => {
    setWorkPanel(null);
    setWorkData(null);
  };

  // ── Role / Permission helpers ─────────────────────────────────
  const handleRoleChange = (role) => {
    setForm(f => ({
      ...f,
      role,
      permissions: role === 'admin'
        ? ALL_MODULES.map(m => m.key)
        : (ROLE_DEFAULTS[role] || ['dashboard']),
    }));
  };

  const togglePerm = (key) => {
    setForm(f => {
      if (key === 'dashboard') return f;
      const has = f.permissions.includes(key);
      return {
        ...f,
        permissions: has
          ? f.permissions.filter(p => p !== key)
          : [...f.permissions, key],
      };
    });
  };

  const toggleAll = () => {
    const allKeys = ALL_MODULES.map(m => m.key);
    const hasAll  = allKeys.every(k => form.permissions.includes(k));
    setForm(f => ({ ...f, permissions: hasAll ? ['dashboard'] : allKeys }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await API.put(`/auth/users/${editId}`, payload);
      } else {
        await API.post('/auth/register', form);
      }
      setModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setForm({
      name:        u.name,
      email:       u.email,
      password:    '',
      role:        u.role,
      department:  u.department || '',
      phone:       u.phone || '',
      permissions: u.permissions?.length
        ? u.permissions
        : (ROLE_DEFAULTS[u.role] || ['dashboard']),
    });
    setEditId(u._id);
    setError('');
    setModal(true);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setModal(true);
  };

  const roleBadge = (r) => {
    const map = {
      admin:          'badge-danger',
      doctor:         'badge-info',
      nurse:          'badge-success',
      receptionist:   'badge-gray',
      pharmacist:     'badge-purple',
      lab_technician: 'badge-warning',
    };
    return <span className={`badge ${map[r] || 'badge-gray'}`}>{r.replace('_', ' ').toUpperCase()}</span>;
  };

  const filtered = filterRole ? users.filter(u => u.role === filterRole) : users;
  const isAdminRole = (role) => role === 'admin';
  const allKeys = ALL_MODULES.map(m => m.key);
  const hasAll  = allKeys.every(k => form.permissions.includes(k));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff Management</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <select
            className="form-control"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <div className="text-muted text-small">{filtered.length} staff members</div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th>Department</th><th>Phone</th>
                  <th>Module Access</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No staff found</td></tr>
                ) : filtered.map(u => (
                  <tr
                    key={u._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openWorkPanel(u)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--primary)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Click to view today's work</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>{u.department || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {u.role === 'admin' ? (
                        <span className="badge badge-danger">All modules</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(u.permissions || ['dashboard']).map(p => {
                            const mod = ALL_MODULES.find(m => m.key === p);
                            return mod ? (
                              <span key={p} style={{
                                fontSize: 11, padding: '2px 7px', borderRadius: 20,
                                background: 'var(--primary-light, #dbeafe)', color: '#1e40af',
                                fontWeight: 500,
                              }}>
                                {mod.icon} {mod.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#0f4c81', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => openWorkPanel(u)}
                        >
                          📊 Today
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── TODAY'S WORK PANEL (slide-in from right) ──────────────────────────── */}
      {workPanel && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeWorkPanel}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 900,
            }}
          />

          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 520, background: '#fff',
            boxShadow: '-4px 0 30px rgba(0,0,0,0.15)',
            zIndex: 901, display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}>
            {/* ── Drawer header ── */}
            <div style={{
              background: 'linear-gradient(135deg, #0f2942 0%, #0f4c81 100%)',
              padding: '20px 24px', color: '#fff', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>TODAY'S WORK SUMMARY</div>
                <button
                  onClick={closeWorkPanel}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {workPanel.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{workPanel.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.15)', color: '#e2e8f0',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {workPanel.role?.replace('_', ' ')}
                    </span>
                    {workPanel.department && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{workPanel.department}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8' }}>
                📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* ── Drawer body ── */}
            <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
              {workLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div className="spinner" />
                </div>
              ) : workData?.error ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                  <div>Could not load work data</div>
                </div>
              ) : workData ? (
                <>
                  {/* ── Revenue highlight ── */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0f4c81 0%, #0369a1 100%)',
                    borderRadius: 12, padding: '18px 20px', marginBottom: 20, color: '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#bae6fd', fontWeight: 600, marginBottom: 4 }}>TOTAL REVENUE TODAY</div>
                      <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(workData.totalRevenueToday)}</div>
                    </div>
                    <div style={{ fontSize: 40, opacity: 0.6 }}>💰</div>
                  </div>

                  {/* ── Stats grid ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

                    {/* Billing card */}
                    {workData.billing.total > 0 && (
                      <WorkCard
                        icon="💳" title="Billing"
                        main={fmt(workData.billing.revenue)}
                        sub={`${workData.billing.total} bills · ${workData.billing.paid} paid · ${workData.billing.pending} pending`}
                        color="#0f4c81"
                      />
                    )}

                    {/* Tokens generated (receptionist) */}
                    {workData.tokens.generated > 0 && (
                      <WorkCard
                        icon="🎫" title="Tokens Generated"
                        main={workData.tokens.generated}
                        sub={`${workData.tokens.done} done · ${workData.tokens.waiting} waiting · ${workData.tokens.skipped} skipped`}
                        color="#0369a1"
                      />
                    )}

                    {/* Doctor tokens (doctor's own queue) */}
                    {workData.doctorTokens.total > 0 && (
                      <WorkCard
                        icon="🩺" title="Patients Seen"
                        main={`${workData.doctorTokens.done} / ${workData.doctorTokens.total}`}
                        sub={`${workData.doctorTokens.waiting} still waiting`}
                        color="#059669"
                      />
                    )}

                    {/* Lab */}
                    {workData.lab.total > 0 && (
                      <WorkCard
                        icon="🧪" title="Lab Tests Ordered"
                        main={workData.lab.total}
                        sub={`${workData.lab.completed} completed · ${fmt(workData.lab.revenue)} revenue`}
                        color="#7c3aed"
                      />
                    )}

                    {/* Pharmacy */}
                    {workData.pharmacy.total > 0 && (
                      <WorkCard
                        icon="💊" title="Prescriptions"
                        main={workData.pharmacy.total}
                        sub={`Revenue: ${fmt(workData.pharmacy.revenue)}`}
                        color="#b45309"
                      />
                    )}
                  </div>

                  {/* Show "no activity" if everything is zero */}
                  {workData.billing.total === 0 &&
                   workData.tokens.generated === 0 &&
                   workData.doctorTokens.total === 0 &&
                   workData.lab.total === 0 &&
                   workData.pharmacy.total === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No activity recorded today</div>
                      <div style={{ fontSize: 13 }}>This staff member has no entries yet for today.</div>
                    </div>
                  )}

                  {/* ── Recent Bills ── */}
                  {workData.billing.bills?.length > 0 && (
                    <Section title="Recent Bills Today">
                      {workData.billing.bills.map((b, i) => (
                        <ListRow
                          key={i}
                          left={b.patient?.name || '—'}
                          sub={b.billId}
                          right={fmt(b.totalAmount)}
                          badge={b.paymentStatus}
                          badgeColor={b.paymentStatus === 'Paid' ? '#059669' : '#b45309'}
                        />
                      ))}
                    </Section>
                  )}

                  {/* ── Doctor token list ── */}
                  {workData.doctorTokens.list?.length > 0 && (
                    <Section title="Token Queue (My Patients)">
                      {workData.doctorTokens.list.map((t, i) => (
                        <ListRow
                          key={i}
                          left={t.patientName || t.patient?.name || 'Walk-in'}
                          sub={`Token #${t.tokenNumber}`}
                          right=""
                          badge={t.status}
                          badgeColor={t.status === 'Done' ? '#059669' : t.status === 'Waiting' ? '#0369a1' : '#94a3b8'}
                        />
                      ))}
                    </Section>
                  )}

                  {/* ── Lab list ── */}
                  {workData.lab.list?.length > 0 && (
                    <Section title="Lab Orders Today">
                      {workData.lab.list.map((l, i) => (
                        <ListRow
                          key={i}
                          left={l.patient?.name || '—'}
                          sub={l.labId}
                          right={fmt(l.totalAmount)}
                          badge={l.status}
                          badgeColor={l.status === 'Completed' ? '#059669' : '#b45309'}
                        />
                      ))}
                    </Section>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-control" type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {editId ? 'New Password (leave blank to keep)' : 'Password *'}
                    </label>
                    <input className="form-control" type="password" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      {...(!editId && { required: true })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role}
                      onChange={e => handleRoleChange(e.target.value)}>
                      {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}>
                      <option value="">Select</option>
                      {departments.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>

                {/* ── Module Permissions ── */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Module Access</span>
                    {isAdminRole(form.role) ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All modules granted (admin)</span>
                    ) : (
                      <button type="button" onClick={toggleAll}
                        style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                        {hasAll ? 'Clear all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    opacity: isAdminRole(form.role) ? 0.5 : 1,
                    pointerEvents: isAdminRole(form.role) ? 'none' : 'auto',
                  }}>
                    {ALL_MODULES.map((mod, idx) => {
                      const on     = form.permissions.includes(mod.key);
                      const locked = mod.key === 'dashboard';
                      return (
                        <div
                          key={mod.key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: idx < ALL_MODULES.length - 2 ? '1px solid var(--border)' : 'none',
                            borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{mod.icon}</span>
                            <span style={{ fontSize: 13 }}>{mod.label}</span>
                          </div>
                          <label style={{ position: 'relative', width: 38, height: 20, flexShrink: 0, cursor: locked ? 'default' : 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isAdminRole(form.role) ? true : on}
                              onChange={() => !locked && togglePerm(mod.key)}
                              disabled={locked}
                              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                            />
                            <span style={{
                              position: 'absolute', inset: 0, borderRadius: 10,
                              background: (isAdminRole(form.role) || on) ? 'var(--primary, #0f4c81)' : '#d1d5db',
                              transition: 'background 0.2s',
                            }} />
                            <span style={{
                              position: 'absolute', width: 14, height: 14,
                              borderRadius: '50%', background: '#fff', top: 3,
                              left: (isAdminRole(form.role) || on) ? 21 : 3,
                              transition: 'left 0.2s',
                            }} />
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {!isAdminRole(form.role) && (
                    <div style={{
                      padding: '10px 14px', borderTop: '1px solid var(--border)',
                      background: 'var(--bg-secondary, #f8fafc)',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Access granted:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {form.permissions.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No modules selected</span>
                        ) : form.permissions.map(p => {
                          const mod = ALL_MODULES.find(m => m.key === p);
                          return mod ? (
                            <span key={p} style={{
                              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                              background: '#dbeafe', color: '#1e40af',
                            }}>
                              {mod.icon} {mod.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (editId ? 'Update Staff' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WorkCard({ icon, title, main, sub, color }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '14px 16px', background: '#fff',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{title}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{main}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: 10, paddingBottom: 6,
        borderBottom: '1px solid #e2e8f0',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function ListRow({ left, sub, right, badge, badgeColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: '#f8fafc', borderRadius: 8,
      border: '1px solid #e2e8f0',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{left}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {right && <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{right}</span>}
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: badgeColor + '20', color: badgeColor,
          fontWeight: 700, textTransform: 'uppercase',
        }}>
          {badge}
        </span>
      </div>
    </div>
  );
}