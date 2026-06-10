// hms-react/src/pages/BillingRequests.jsx
import React, { useEffect, useState, useCallback } from 'react';
import API from '../utils/api';

// ── Resolve clinicId from stored JWT / user object ───────────────────────────
// Must match the same helper used in Billing.jsx — adjust the key if needed.
function getClinicId() {
  try {
    const raw = localStorage.getItem('user');        // change key if needed
    if (!raw) return 'default';
    const parsed = JSON.parse(raw);
    return (
      parsed.clinicId ||
      parsed.clinic?._id ||
      parsed.clinic ||
      'default'
    );
  } catch {
    return 'default';
  }
}

const STATUS_COLORS = {
  Pending:  { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  Approved: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  Rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
};

const TYPE_BADGE = {
  Lab:      { bg: '#ede9fe', color: '#7c3aed', icon: '🧪', label: 'Lab' },
  Pharmacy: { bg: '#fef3c7', color: '#b45309', icon: '💊', label: 'Pharmacy' },
};

export default function BillingRequests() {
  const clinicId = getClinicId();

  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('Pending');
  const [typeFilter,    setTypeFilter]    = useState('');       // 'Lab' | 'Pharmacy' | ''
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/billing-requests?status=${filter}&clinicId=${clinicId}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const { data } = await API.get(url);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, clinicId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (req) => {
    setActionLoading(req._id);
    try {
      await API.post(`/billing-requests/${req._id}/approve`, { clinicId });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading('');
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal._id);
    try {
      await API.post(`/billing-requests/${rejectModal._id}/reject`, {
        rejectReason,
        clinicId,
      });
      setRejectModal(null);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div style={{ padding: 24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
            Billing Requests
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Approve lab tests and pharmacy medicines to add to patient bills
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
            {[['', 'All'], ['Lab', '🧪 Lab'], ['Pharmacy', '💊 Pharmacy']].map(([val, label]) => (
              <button key={val} onClick={() => setTypeFilter(val)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12,
                background: typeFilter === val ? '#fff'    : 'transparent',
                color:      typeFilter === val ? '#0f4c81' : '#64748b',
                boxShadow:  typeFilter === val ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
            {['Pending', 'Approved', 'Rejected'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12,
                background: filter === s ? '#fff'    : 'transparent',
                color:      filter === s ? '#0f4c81' : '#64748b',
                boxShadow:  filter === s ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            No {filter.toLowerCase()} {typeFilter ? typeFilter.toLowerCase() : ''} billing requests
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Request ID', 'Type', 'Patient', 'Items', 'Amount', 'Requested By', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req, i) => {
                const sc   = STATUS_COLORS[req.status] || STATUS_COLORS.Pending;
                const tb   = TYPE_BADGE[req.type]      || TYPE_BADGE.Lab;
                const busy = actionLoading === req._id;

                return (
                  <tr key={req._id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#fff' : '#fafafa',
                  }}>

                    {/* Request ID */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f4c81', fontSize: 13 }}>
                      {req.requestId}
                    </td>

                    {/* Type badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: tb.bg, color: tb.color,
                      }}>
                        {tb.icon} {tb.label}
                      </span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {req.type === 'Lab' ? req.labId : req.pharmacyId}
                      </div>
                    </td>

                    {/* Patient */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{req.patientName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{req.patientId}</div>
                    </td>

                    {/* Items (tests or medicines) */}
                    <td style={{ padding: '14px 16px' }}>
                      {(req.tests || []).map((t, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155' }}>
                          {t.testName}
                          <span style={{ color: '#94a3b8', marginLeft: 6 }}>₹{t.price}</span>
                        </div>
                      ))}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                      ₹{req.totalAmount}
                    </td>

                    {/* Requested by */}
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                      {req.requestedByName || '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      }}>
                        {req.status}
                      </span>
                      {req.status === 'Rejected' && req.rejectReason && (
                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{req.rejectReason}</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      {req.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleApprove(req)} disabled={busy} style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            background: '#16a34a', color: '#fff',
                            fontWeight: 600, fontSize: 12, opacity: busy ? .6 : 1,
                          }}>
                            {busy ? '…' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectModal(req); setRejectReason(''); }}
                            disabled={busy}
                            style={{
                              padding: '6px 14px', borderRadius: 6,
                              border: '1px solid #fca5a5',
                              cursor: busy ? 'not-allowed' : 'pointer',
                              background: '#fff', color: '#dc2626',
                              fontWeight: 600, fontSize: 12, opacity: busy ? .6 : 1,
                            }}>
                            ✕ Reject
                          </button>
                        </div>
                      )}
                      {req.status === 'Approved' && (
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Added to bill</span>
                      )}
                      {req.status === 'Rejected' && (
                        <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>✕ Rejected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Reject modal ────────────────────────────────────────── */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 420,
            boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Reject Request</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              {rejectModal.type === 'Pharmacy' ? '💊' : '🧪'} {rejectModal.requestId} · Patient:{' '}
              <strong>{rejectModal.patientName}</strong>
            </p>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Duplicate entry, incorrect amount…"
              style={{
                width: '100%', marginTop: 6, padding: '8px 12px',
                borderRadius: 8, border: '1px solid #d1d5db',
                fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: '1px solid #d1d5db', background: '#fff',
                  cursor: 'pointer', fontWeight: 600,
                }}>
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600, opacity: actionLoading ? .6 : 1,
                }}>
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}