// hms-react/src/pages/TokenPanel.jsx
// Standalone page for reception staff to generate tokens and monitor queues.
// Add to App.jsx:
//   import TokenPanel from './pages/TokenPanel';
//   <Route path="tokens" element={<PermRoute permKey="patients"><TokenPanel /></PermRoute>}/>
// Add to Layout.jsx NAV_SECTIONS under SERVICES:
//   { path: '/tokens', label: 'Token Queue', icon: '🎫', perm: 'patients' },

import React, { useEffect, useState, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  Waiting: { bg: '#fef3c7', color: '#92400e' },
  Called:  { bg: '#dbeafe', color: '#1e40af' },
  Done:    { bg: '#d1fae5', color: '#065f46' },
  Skipped: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function TokenPanel() {
  const { user } = useAuth();

  // ── Data state ─────────────────────────────────────────────────
  const [doctors,     setDoctors]     = useState([]);
  const [tokens,      setTokens]      = useState([]);
  const [summary,     setSummary]     = useState([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [loading,     setLoading]     = useState(true);

  // ── Generate-token form state ──────────────────────────────────
  const [selDoctor,   setSelDoctor]   = useState('');
  const [selPatient,  setSelPatient]  = useState('');
  const [walkInName,  setWalkInName]  = useState('');
  const [patients,    setPatients]    = useState([]);
  const [generating,  setGenerating]  = useState(false);
  const [receipt,     setReceipt]     = useState(null);

  // ── Filter state ───────────────────────────────────────────────
  const [filterDoc,    setFilterDoc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Fetch doctors once ─────────────────────────────────────────
  useEffect(() => {
    API.get('/auth/users').then(r => {
      const docs = r.data.filter(u => u.role === 'doctor');
      setDoctors(docs);
      if (docs.length === 1) setSelDoctor(docs[0]._id);
    });
    API.get('/patients?limit=200').then(r => setPatients(r.data.patients || []));
  }, []);

  // ── Fetch today's tokens ───────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    try {
      const [todayRes, summaryRes] = await Promise.all([
        API.get('/tokens/today'),
        API.get('/tokens/summary'),
      ]);
      setTokens(todayRes.data.tokens);
      setSummary(summaryRes.data.summary);
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTokens();
    const iv = setInterval(fetchTokens, 30_000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

  // ── Generate token ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selDoctor) return alert('Please select a doctor.');
    setGenerating(true);
    try {
      const payload = { doctorId: selDoctor };
      if (selPatient) {
        const p = patients.find(p => p._id === selPatient);
        payload.patientId   = selPatient;
        payload.patientName = p?.name || 'Unknown';
      } else if (walkInName.trim()) {
        payload.patientName = walkInName.trim();
      } else {
        payload.patientName = 'Walk-in';
      }
      const { data } = await API.post('/tokens/generate', payload);
      setReceipt(data);
      setSelPatient('');
      setWalkInName('');
      await fetchTokens();
    } catch (err) {
      alert(err.response?.data?.message || 'Token generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Update token status ────────────────────────────────────────
  const updateStatus = async (id, status) => {
    await API.patch(`/tokens/${id}/status`, { status });
    fetchTokens();
  };

  // ── Filtered tokens ────────────────────────────────────────────
  const displayed = tokens.filter(t => {
    const docMatch = !filterDoc || t.doctor?._id === filterDoc;
    const stMatch  = !filterStatus || t.status === filterStatus;
    return docMatch && stMatch;
  });

  const canUpdate = ['admin', 'doctor'].includes(user?.role);

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🎫 Token Queue</h1>
          <p className="text-muted text-small">
            📅 {today}
            {lastRefresh && <>&nbsp;·&nbsp; Refreshed: {lastRefresh} &nbsp;(auto every 30s)</>}
          </p>
        </div>
        <button
          onClick={fetchTokens}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, color: '#0f4c81',
          }}
        >
          🔄 Refresh Now
        </button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────── */}
      {summary.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
          {summary.map(s => (
            <div key={s.doctorId} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              padding: '14px 18px',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                🩺 Dr. {s.doctorName}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                {s.department || 'General'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Wait',   value: s.waiting, bg: '#fef3c7', color: '#92400e' },
                  { label: 'Called', value: s.called,  bg: '#dbeafe', color: '#1e40af' },
                  { label: 'Done',   value: s.done,    bg: '#d1fae5', color: '#065f46' },
                ].map(st => (
                  <span key={st.label} style={{
                    flex: 1, textAlign: 'center', padding: '4px 0',
                    borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: st.bg, color: st.color,
                  }}>
                    {st.value} {st.label}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                Latest token: <strong>#{s.lastToken}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Generate Token form ───────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          overflow: 'hidden', position: 'sticky', top: 20,
        }}>
          <div style={{
            padding: '14px 18px', background: 'linear-gradient(90deg, #0f2942, #1e4976)',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            🎫 Generate New Token
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Doctor */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                Select Doctor *
              </label>
              <select
                value={selDoctor}
                onChange={e => setSelDoctor(e.target.value)}
                className="form-control"
              >
                <option value="">— Choose Doctor —</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.name} ({d.department || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Registered patient OR walk-in */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                Patient (optional)
              </label>
              <select
                value={selPatient}
                onChange={e => { setSelPatient(e.target.value); if (e.target.value) setWalkInName(''); }}
                className="form-control"
              >
                <option value="">— Walk-in / Search —</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.patientId})
                  </option>
                ))}
              </select>
            </div>

            {/* Walk-in name if no patient selected */}
            {!selPatient && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Walk-in Name (optional)
                </label>
                <input
                  className="form-control"
                  value={walkInName}
                  onChange={e => setWalkInName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            )}

            {/* Date info */}
            <div style={{
              fontSize: 11, color: '#64748b', background: '#f8fafc',
              borderRadius: 8, padding: '8px 12px',
            }}>
              📅 Token date: <strong>{new Date().toLocaleDateString('en-IN')}</strong>
              <br />Resets at 12:00 AM midnight
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !selDoctor}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {generating ? 'Generating…' : '🎫 Generate Token'}
            </button>
          </div>

          {/* Receipt shown inline after generation */}
          {receipt && (
            <div style={{
              margin: '0 18px 18px', borderRadius: 10,
              border: '2px solid #38bdf8', overflow: 'hidden',
              textAlign: 'center',
            }}>
              <div style={{ background: 'linear-gradient(135deg, #0f4c81, #38bdf8)', padding: '14px 0' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4 }}>TOKEN NUMBER</div>
                <div style={{ color: '#fff', fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
                  {receipt.tokenNumber}
                </div>
              </div>
              <div style={{ padding: '12px', background: '#f0f9ff' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {receipt.patientName}
                </div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>
                  Dr. {receipt.doctor?.name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <button
                  onClick={() => setReceipt(null)}
                  style={{
                    marginTop: 8, fontSize: 11, color: '#64748b',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Live token list ───────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Filter bar */}
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <select
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 7, border: '1px solid #e2e8f0' }}
            >
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 7, border: '1px solid #e2e8f0' }}
            >
              <option value="">All Status</option>
              {['Waiting','Called','Done','Skipped'].map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
              {displayed.length} token{displayed.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Token table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
              No tokens found for today.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                    {['#', 'Token', 'Patient', 'Doctor', 'Generated By', 'Time', 'Status', canUpdate ? 'Action' : ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t, i) => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Waiting;
                    return (
                      <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0f4c81, #38bdf8)',
                            color: '#fff', fontWeight: 800, fontSize: 16,
                          }}>
                            {t.tokenNumber}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {t.patientName || t.patient?.name || 'Walk-in'}
                          </div>
                          {t.patient?.patientId && (
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.patient.patientId}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>
                          Dr. {t.doctor?.name || '—'}
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.doctor?.department || ''}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {t.generatedBy?.name || '—'}
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.generatedBy?.role || ''}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                          {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color,
                          }}>
                            {t.status}
                          </span>
                        </td>
                        {canUpdate && (
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {t.status === 'Waiting' && (
                                <>
                                  <button
                                    onClick={() => updateStatus(t._id, 'Called')}
                                    style={{
                                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                      borderRadius: 6, border: 'none', cursor: 'pointer',
                                      background: '#0f4c81', color: '#fff',
                                    }}
                                  >
                                    📢 Call
                                  </button>
                                  <button
                                    onClick={() => updateStatus(t._id, 'Skipped')}
                                    style={{
                                      padding: '4px 8px', fontSize: 11, fontWeight: 600,
                                      borderRadius: 6, border: '1px solid #fca5a5',
                                      background: '#fff', color: '#ef4444', cursor: 'pointer',
                                    }}
                                  >
                                    Skip
                                  </button>
                                </>
                              )}
                              {t.status === 'Called' && (
                                <button
                                  onClick={() => updateStatus(t._id, 'Done')}
                                  style={{
                                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                    borderRadius: 6, border: 'none', cursor: 'pointer',
                                    background: '#059669', color: '#fff',
                                  }}
                                >
                                  ✅ Done
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}