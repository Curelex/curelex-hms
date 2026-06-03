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

const ROLE_STYLE = {
  admin:          { bg: '#fee2e2', color: '#dc2626', dot: '#dc2626' },
  doctor:         { bg: '#dbeafe', color: '#1d4ed8', dot: '#1d4ed8' },
  nurse:          { bg: '#d1fae5', color: '#059669', dot: '#059669' },
  receptionist:   { bg: '#fef3c7', color: '#b45309', dot: '#b45309' },
  pharmacist:     { bg: '#ede9fe', color: '#7c3aed', dot: '#7c3aed' },
  lab_technician: { bg: '#ffedd5', color: '#c2410c', dot: '#c2410c' },
};

const AVATAR_COLORS = [
  '#0f4c81','#059669','#7c3aed','#b45309','#dc2626','#0369a1',
];

const emptyForm = {
  name: '', email: '', password: '',
  role: 'receptionist', department: '', phone: '',
  permissions: ROLE_DEFAULTS['receptionist'],
};

const roles = ['admin','doctor','nurse','receptionist','pharmacist','lab_technician'];
const departments = [
  'General Medicine','Surgery','Cardiology','Pediatrics','Orthopedics',
  'Neurology','Gynecology','Radiology','Pathology','Emergency','Pharmacy','Administration',
];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const avatarColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── Inline styles ──────────────────────────────────────────────

const css = {
  page: {
    padding: '0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0,
  },
  filterBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    flexWrap: 'wrap', marginBottom: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '18px 18px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'box-shadow 0.18s, transform 0.18s',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTop: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  avatar: (name) => ({
    width: 44, height: 44, borderRadius: 12,
    background: avatarColor(name),
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 18, flexShrink: 0,
  }),
  cardInfo: {
    flex: 1, minWidth: 0,
  },
  cardName: {
    fontSize: 15, fontWeight: 700, color: '#0f172a',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  cardEmail: {
    fontSize: 12, color: '#64748b', marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  roleBadge: (role) => {
    const s = ROLE_STYLE[role] || { bg: '#f1f5f9', color: '#475569' };
    return {
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
      marginTop: 5, width: 'fit-content',
    };
  },
  roleDot: (role) => ({
    width: 6, height: 6, borderRadius: '50%',
    background: (ROLE_STYLE[role] || {}).dot || '#94a3b8',
    flexShrink: 0,
  }),
  statusDot: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600,
    color: active ? '#059669' : '#dc2626',
  }),
  metaRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
  },
  metaChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 8,
    background: '#f8fafc', border: '1px solid #e2e8f0',
    fontSize: 12, color: '#475569',
  },
  modulesLabel: {
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  modulesWrap: {
    display: 'flex', flexWrap: 'wrap', gap: 5,
  },
  moduleTag: {
    fontSize: 11, padding: '3px 9px', borderRadius: 20,
    background: '#dbeafe', color: '#1e40af',
    fontWeight: 500,
  },
  allModulesTag: {
    fontSize: 11, padding: '3px 9px', borderRadius: 20,
    background: '#fee2e2', color: '#dc2626',
    fontWeight: 600,
  },
  cardFooter: {
    display: 'flex', gap: 8, justifyContent: 'flex-end',
    paddingTop: 10, borderTop: '1px solid #f1f5f9',
  },
  btnToday: {
    padding: '6px 14px', borderRadius: 8, border: 'none',
    background: '#0f4c81', color: '#fff',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  btnEdit: {
    padding: '6px 14px', borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#fff',
    color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};

export default function Staff() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState(emptyForm);
  const [editId,      setEditId]      = useState(null);
  const [filterRole,  setFilterRole]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  // ✅ NEW: track if email field was touched to show inline hint
  const [emailTouched, setEmailTouched] = useState(false);

  const [workPanel,   setWorkPanel]   = useState(null);
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

  const closeWorkPanel = () => { setWorkPanel(null); setWorkData(null); };

  const handleRoleChange = (role) => {
    setForm(f => ({
      ...f, role,
      permissions: role === 'admin' ? ALL_MODULES.map(m => m.key) : (ROLE_DEFAULTS[role] || ['dashboard']),
    }));
  };

  const togglePerm = (key) => {
    setForm(f => {
      if (key === 'dashboard') return f;
      const has = f.permissions.includes(key);
      return { ...f, permissions: has ? f.permissions.filter(p => p !== key) : [...f.permissions, key] };
    });
  };

  const toggleAll = () => {
    const allKeys = ALL_MODULES.map(m => m.key);
    const hasAll  = allKeys.every(k => form.permissions.includes(k));
    setForm(f => ({ ...f, permissions: hasAll ? ['dashboard'] : allKeys }));
  };

  // ✅ Check if entered email already exists among current users (client-side hint)
  const emailAlreadyExists = !editId
    ? users.some(u => u.email.toLowerCase() === form.email.toLowerCase() && form.email !== '')
    : users.some(u => u.email.toLowerCase() === form.email.toLowerCase() && u._id !== editId && form.email !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ✅ Block submit instantly if email duplicate detected client-side
    if (emailAlreadyExists) {
      setError('This email is already registered in our system');
      return;
    }
    setSaving(true); setError('');
    try {
      if (editId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await API.put(`/auth/users/${editId}`, payload);
      } else {
        await API.post('/auth/register', form);
      }
      setModal(false); setForm(emptyForm); setEditId(null); setEmailTouched(false); fetchUsers();
    } catch (err) {
      // ✅ Shows the exact message returned from backend
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setForm({
      name: u.name, email: u.email, password: '',
      role: u.role, department: u.department || '', phone: u.phone || '',
      permissions: u.permissions?.length ? u.permissions : (ROLE_DEFAULTS[u.role] || ['dashboard']),
    });
    setEditId(u._id); setError(''); setEmailTouched(false); setModal(true);
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(''); setEmailTouched(false); setModal(true); };

  const filtered = filterRole ? users.filter(u => u.role === filterRole) : users;
  const isAdminRole = (role) => role === 'admin';
  const allKeys = ALL_MODULES.map(m => m.key);
  const hasAll  = allKeys.every(k => form.permissions.includes(k));

  return (
    <div style={css.page}>
      {/* Page header */}
      <div style={css.pageHeader}>
        <h1 style={css.pageTitle}>Staff Management</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>
      </div>

      {/* Filter bar */}
      <div style={css.filterBar}>
        <select
          className="form-control"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ width: 180 }}
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#64748b' }}>{filtered.length} staff members</span>
      </div>

      {/* Staff cards grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 600 }}>No staff found</div>
        </div>
      ) : (
        <div style={css.grid}>
          {filtered.map(u => (
            <StaffCard
              key={u._id}
              u={u}
              onWork={() => openWorkPanel(u)}
              onEdit={(e) => { e.stopPropagation(); openEdit(u); }}
            />
          ))}
        </div>
      )}

      {/* ── TODAY'S WORK MODAL ──────────────────────────────────────── */}
      {workPanel && (
        <div
          onClick={closeWorkPanel}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,25,50,0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 600,
              maxHeight: '88vh',
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #0a1f3d 0%, #0f4c81 60%, #1565a8 100%)',
              padding: '24px 24px 20px',
              flexShrink: 0,
              position: 'relative',
            }}>
              <button
                onClick={closeWorkPanel}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'rgba(255,255,255,0.12)', border: 'none',
                  color: '#fff', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
              >×</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 16,
                  background: avatarColor(workPanel.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 800, color: '#fff',
                  flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                }}>
                  {workPanel.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
                    {workPanel.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 11px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.18)', color: '#e0f2fe',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
                    }}>
                      {workPanel.role?.replace('_', ' ')}
                    </span>
                    {workPanel.department && (
                      <span style={{ fontSize: 12, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
                        🏢 {workPanel.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 16,
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#93c5fd', fontWeight: 500,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '7px 12px',
                width: 'fit-content',
              }}>
                📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, padding: '20px 24px 24px', background: '#f8fafc' }}>
              {workLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', gap: 14 }}>
                  <div className="spinner" />
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading today's activity…</div>
                </div>
              ) : workData?.error ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#475569' }}>Could not load work data</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Please try again later.</div>
                </div>
              ) : workData ? (
                <>
                  <div style={{
                    background: 'linear-gradient(135deg, #0f4c81 0%, #0369a1 100%)',
                    borderRadius: 14, padding: '16px 20px', marginBottom: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 4px 14px rgba(15,76,129,0.25)',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#bae6fd', fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>
                        TOTAL REVENUE TODAY
                      </div>
                      <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
                        {fmt(workData.totalRevenueToday)}
                      </div>
                    </div>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                    }}>💰</div>
                  </div>

                  {(workData.billing.total > 0 || workData.tokens.generated > 0 || workData.doctorTokens.total > 0 || workData.lab.total > 0 || workData.pharmacy.total > 0) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                      {workData.billing.total > 0 && <WorkCard icon="💳" title="Billing" main={fmt(workData.billing.revenue)} sub={`${workData.billing.total} bills · ${workData.billing.paid} paid`} color="#0f4c81" />}
                      {workData.tokens.generated > 0 && <WorkCard icon="🎫" title="Tokens" main={workData.tokens.generated} sub={`${workData.tokens.done} done · ${workData.tokens.waiting} waiting`} color="#0369a1" />}
                      {workData.doctorTokens.total > 0 && <WorkCard icon="🩺" title="Patients Seen" main={`${workData.doctorTokens.done}/${workData.doctorTokens.total}`} sub={`${workData.doctorTokens.waiting} waiting`} color="#059669" />}
                      {workData.lab.total > 0 && <WorkCard icon="🧪" title="Lab Tests" main={workData.lab.total} sub={`${workData.lab.completed} done · ${fmt(workData.lab.revenue)}`} color="#7c3aed" />}
                      {workData.pharmacy.total > 0 && <WorkCard icon="💊" title="Prescriptions" main={workData.pharmacy.total} sub={`Revenue: ${fmt(workData.pharmacy.revenue)}`} color="#b45309" />}
                    </div>
                  ) : (
                    <div style={{
                      background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                      padding: '40px 24px', textAlign: 'center', marginBottom: 16,
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, margin: '0 auto 14px',
                      }}>📋</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 6 }}>
                        No activity recorded today
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                        {workPanel.name} hasn't logged any entries yet for today.
                      </div>
                    </div>
                  )}

                  {workData.billing.bills?.length > 0 && (
                    <Section title="Recent Bills Today">
                      {workData.billing.bills.map((b, i) => (
                        <ListRow key={i} left={b.patient?.name || '—'} sub={b.billId} right={fmt(b.totalAmount)} badge={b.paymentStatus} badgeColor={b.paymentStatus === 'Paid' ? '#059669' : '#b45309'} />
                      ))}
                    </Section>
                  )}

                  {workData.doctorTokens.list?.length > 0 && (
                    <Section title="Token Queue — My Patients">
                      {workData.doctorTokens.list.map((t, i) => (
                        <ListRow key={i} left={t.patientName || t.patient?.name || 'Walk-in'} sub={`Token #${t.tokenNumber}`} right="" badge={t.status} badgeColor={t.status === 'Done' ? '#059669' : t.status === 'Waiting' ? '#0369a1' : '#94a3b8'} />
                      ))}
                    </Section>
                  )}

                  {workData.lab.list?.length > 0 && (
                    <Section title="Lab Orders Today">
                      {workData.lab.list.map((l, i) => (
                        <ListRow key={i} left={l.patient?.name || '—'} sub={l.labId} right={fmt(l.totalAmount)} badge={l.status} badgeColor={l.status === 'Completed' ? '#059669' : '#b45309'} />
                      ))}
                    </Section>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
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
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  {/* ✅ Email field with inline duplicate warning */}
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email}
                      onChange={e => {
                        setForm({ ...form, email: e.target.value });
                        setError(''); // clear submit error while typing
                      }}
                      onBlur={() => setEmailTouched(true)}
                      required
                      style={emailTouched && emailAlreadyExists ? { borderColor: '#dc2626', background: '#fff5f5' } : {}}
                    />
                    {/* ✅ Inline warning shown as soon as user leaves the email field */}
                    {emailTouched && emailAlreadyExists && (
                      <div style={{
                        marginTop: 5,
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: '#dc2626', fontWeight: 500,
                      }}>
                        ⚠️ This email is already registered in our system
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">{editId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      {...(!editId && { required: true })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-control" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                      {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                      <option value="">Select</option>
                      {departments.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>

                {/* Module Permissions */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Module Access</span>
                    {isAdminRole(form.role) ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All modules granted (admin)</span>
                    ) : (
                      <button type="button" onClick={toggleAll} style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                        {hasAll ? 'Clear all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', opacity: isAdminRole(form.role) ? 0.5 : 1, pointerEvents: isAdminRole(form.role) ? 'none' : 'auto' }}>
                    {ALL_MODULES.map((mod, idx) => {
                      const on = form.permissions.includes(mod.key);
                      const locked = mod.key === 'dashboard';
                      return (
                        <div key={mod.key} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: idx < ALL_MODULES.length - 2 ? '1px solid var(--border)' : 'none',
                          borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{mod.icon}</span>
                            <span style={{ fontSize: 13 }}>{mod.label}</span>
                          </div>
                          <label style={{ position: 'relative', width: 38, height: 20, flexShrink: 0, cursor: locked ? 'default' : 'pointer' }}>
                            <input type="checkbox" checked={isAdminRole(form.role) ? true : on} onChange={() => !locked && togglePerm(mod.key)} disabled={locked} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                            <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: (isAdminRole(form.role) || on) ? 'var(--primary, #0f4c81)' : '#d1d5db', transition: 'background 0.2s' }} />
                            <span style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff', top: 3, left: (isAdminRole(form.role) || on) ? 21 : 3, transition: 'left 0.2s' }} />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {!isAdminRole(form.role) && (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary, #f8fafc)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Access granted:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {form.permissions.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No modules selected</span>
                        ) : form.permissions.map(p => {
                          const mod = ALL_MODULES.find(m => m.key === p);
                          return mod ? (
                            <span key={p} style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#dbeafe', color: '#1e40af' }}>
                              {mod.icon} {mod.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ✅ Error banner — shown on submit failure from backend */}
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: '#fee2e2', color: '#dc2626',
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    border: '1px solid #fecaca',
                  }}>
                    🚫 {error}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || emailAlreadyExists}
                  style={emailAlreadyExists ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
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

// ── Staff Card ──────────────────────────────────────────────────────────────
function StaffCard({ u, onWork, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const modules = u.role === 'admin' ? null : (u.permissions || ['dashboard']);

  return (
    <div
      style={{
        ...css.card,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onWork}
    >
      <div style={css.cardTop}>
        <div style={css.avatar(u.name)}>
          {u.name?.[0]?.toUpperCase()}
        </div>
        <div style={css.cardInfo}>
          <div style={css.cardName}>{u.name}</div>
          <div style={css.cardEmail}>{u.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ ...css.roleBadge(u.role) }}>
              <span style={css.roleDot(u.role)} />
              {u.role.replace('_', ' ')}
            </span>
            <span style={css.statusDot(u.isActive)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.isActive ? '#059669' : '#dc2626', display: 'inline-block' }} />
              {u.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {(u.department || u.phone) && (
        <div style={css.metaRow}>
          {u.department && <span style={css.metaChip}>🏢 {u.department}</span>}
          {u.phone && <span style={css.metaChip}>📞 {u.phone}</span>}
        </div>
      )}

      <div>
        <div style={css.modulesLabel}>Module Access</div>
        <div style={css.modulesWrap}>
          {u.role === 'admin' ? (
            <span style={css.allModulesTag}>🔑 All Modules</span>
          ) : (
            modules?.map(p => {
              const mod = ALL_MODULES.find(m => m.key === p);
              return mod ? (
                <span key={p} style={css.moduleTag}>{mod.icon} {mod.label}</span>
              ) : null;
            })
          )}
        </div>
      </div>

      <div style={css.cardFooter} onClick={e => e.stopPropagation()}>
        <button style={css.btnToday} onClick={onWork}>📊 Today's Work</button>
        <button style={css.btnEdit} onClick={onEdit}>✏️ Edit</button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function WorkCard({ icon, title, main, sub, color }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff', borderLeft: `4px solid ${color}` }}>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function ListRow({ left, sub, right, badge, badgeColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{left}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {right && <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{right}</span>}
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: badgeColor + '20', color: badgeColor, fontWeight: 700, textTransform: 'uppercase' }}>
          {badge}
        </span>
      </div>
    </div>
  );
}