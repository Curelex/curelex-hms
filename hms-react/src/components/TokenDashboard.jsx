// hms-react/src/components/TokenDashboard.jsx
// Permission rules:
//  - Admin        → read-only history, doctor-wise, NO Call/Skip/Done buttons
//  - Doctor       → sees only their own queue, CAN Call / Skip / Done
//  - Receptionist / any staff → CAN Call / Skip / Done ONLY tokens THEY generated

import React, { useEffect, useState, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  Waiting: { bg: '#fef3c7', color: '#d97706' },
  Called:  { bg: '#dbeafe', color: '#1d4ed8' },
  Done:    { bg: '#d1fae5', color: '#065f46' },
  Skipped: { bg: '#fee2e2', color: '#b91c1c' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Waiting;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  );
}

// ── Single token row ───────────────────────────────────────────
function TokenRow({ token, canAct, onStatusChange }) {
  const [busy, setBusy] = useState(false);

  const advance = async () => {
    const next = { Waiting: 'Called', Called: 'Done' }[token.status];
    if (!next) return;
    setBusy(true);
    try {
      await API.patch(`/tokens/${token._id}/status`, { status: next });
      onStatusChange();
    } finally { setBusy(false); }
  };

  const skip = async () => {
    setBusy(true);
    try {
      await API.patch(`/tokens/${token._id}/status`, { status: 'Skipped' });
      onStatusChange();
    } finally { setBusy(false); }
  };

  const isDone  = token.status === 'Done' || token.status === 'Skipped';
  const showAct = canAct && !isDone;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      {/* Token number bubble */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 15,
        background: token.status === 'Done'    ? '#d1fae5' :
                    token.status === 'Called'  ? '#dbeafe' :
                    token.status === 'Skipped' ? '#fee2e2' : '#f0f9ff',
        color:      token.status === 'Done'    ? '#065f46' :
                    token.status === 'Called'  ? '#1d4ed8' :
                    token.status === 'Skipped' ? '#b91c1c' : '#0369a1',
      }}>
        {token.tokenNumber}
      </div>

      {/* Patient + generated-by */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {token.patientName || token.patient?.name || 'Walk-in'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          By: {token.generatedBy?.name || '—'}
          {token.calledAt
            ? ` · Called at ${new Date(token.calledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </div>
      </div>

      <StatusBadge status={token.status} />

      {/* Action buttons — only for permitted users */}
      {showAct && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={advance}
            disabled={busy}
            style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600,
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#0f4c81', color: '#fff',
            }}
          >
            {token.status === 'Waiting' ? '📢 Call' : '✅ Done'}
          </button>
          {token.status === 'Waiting' && (
            <button
              onClick={skip}
              disabled={busy}
              style={{
                padding: '4px 8px', fontSize: 11, fontWeight: 600,
                borderRadius: 6, border: '1px solid #fca5a5',
                background: '#fff', color: '#ef4444', cursor: 'pointer',
              }}
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-doctor queue card ──────────────────────────────────────
function DoctorQueue({ doctorId, doctorName, department, tokens, currentUser, isAdminView, onStatusChange }) {
  const waiting = tokens.filter(t => t.status === 'Waiting').length;
  const called  = tokens.filter(t => t.status === 'Called').length;
  const done    = tokens.filter(t => t.status === 'Done').length;
  const skipped = tokens.filter(t => t.status === 'Skipped').length;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
      overflow: 'hidden', marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(90deg, #0f2942 0%, #1e4976 100%)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>🩺 Dr. {doctorName}</div>
          <div style={{ color: '#93c5fd', fontSize: 11 }}>{department || 'General'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Waiting', value: waiting, bg: '#fef3c7', color: '#92400e' },
            { label: 'Called',  value: called,  bg: '#dbeafe', color: '#1e40af' },
            { label: 'Done',    value: done,    bg: '#d1fae5', color: '#065f46' },
            ...(skipped > 0 ? [{ label: 'Skipped', value: skipped, bg: '#fee2e2', color: '#b91c1c' }] : []),
          ].map(s => (
            <span key={s.label} style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: s.bg, color: s.color,
            }}>
              {s.value} {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Token rows */}
      <div style={{ padding: '0 16px', maxHeight: 320, overflowY: 'auto' }}>
        {tokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            No tokens generated today
          </div>
        ) : tokens.map(t => {
          // ── Permission logic per token ─────────────────────────
          // Admin          → always false (history-only on dashboard)
          // Doctor         → true only if this token belongs to their queue
          // Any other role → true only if they personally generated this token
          let canAct = false;
          if (!isAdminView) {
            if (currentUser.role === 'doctor') {
              canAct = String(t.doctor?._id) === String(currentUser.id);
            } else {
              canAct = String(t.generatedBy?._id) === String(currentUser.id);
            }
          }

          return (
            <TokenRow
              key={t._id}
              token={t}
              canAct={canAct}
              onStatusChange={onStatusChange}
            />
          );
        })}
      </div>

      {/* Footer */}
      {tokens.length > 0 && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #f1f5f9',
          fontSize: 11, color: '#94a3b8', background: '#f8fafc',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Latest token: <strong>#{Math.max(...tokens.map(t => t.tokenNumber))}</strong></span>
          <span>Total today: <strong>{tokens.length}</strong></span>
        </div>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────
export default function TokenDashboard() {
  const { user } = useAuth();
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filterDoc,   setFilterDoc]   = useState('');

  const isAdmin  = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const fetchTokens = useCallback(async () => {
    try {
      const params = isDoctor ? `?doctorId=${user.id}` : '';
      const { data: res } = await API.get(`/tokens/today${params}`);

      // Group by doctor
      const grouped = {};
      res.tokens.forEach(t => {
        const id = t.doctor?._id || 'unknown';
        if (!grouped[id]) {
          grouped[id] = {
            doctorId:   id,
            doctorName: t.doctor?.name || 'Unknown',
            department: t.doctor?.department || '',
            tokens:     [],
          };
        }
        grouped[id].tokens.push(t);
      });

      setData(Object.values(grouped));
      setLastRefresh(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (_) {}
    finally { setLoading(false); }
  }, [isDoctor, user?.id]);

  useEffect(() => {
    fetchTokens();
    const iv = setInterval(fetchTokens, 30_000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

  const displayed = filterDoc
    ? data.filter(d => d.doctorName.toLowerCase().includes(filterDoc.toLowerCase()))
    : data;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
      overflow: 'hidden', marginTop: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
            🎫 {isAdmin ? "Today's Token History" : "Today's Token Queue"}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            📅 {today}
            {lastRefresh && <>&nbsp;·&nbsp; Last updated: {lastRefresh}</>}
          </div>
          {/* Admin info pill */}
          {isAdmin && (
            <div style={{
              marginTop: 6, display: 'inline-block',
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
            }}>
              👁 View-only · Manage tokens from the Token Queue page
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isDoctor && data.length > 1 && (
            <input
              placeholder="Filter by doctor…"
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value)}
              style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 8,
                border: '1px solid #e2e8f0', outline: 'none',
              }}
            />
          )}
          <button
            onClick={fetchTokens}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#0f4c81', cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            Loading tokens…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
            No tokens generated today yet.
          </div>
        ) : displayed.map(dq => (
          <DoctorQueue
            key={dq.doctorId}
            {...dq}
            currentUser={user}
            isAdminView={isAdmin}
            onStatusChange={fetchTokens}
          />
        ))}
      </div>
    </div>
  );
}