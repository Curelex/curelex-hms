// hms-react/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TokenDashboard from '../components/TokenDashboard';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Shared UI helpers ───────────────────────────────────────── */
function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color }}>
        <span>{icon}</span>
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function statusBadge(s) {
  const map = {
    Scheduled: 'badge-info', Completed: 'badge-success',
    Cancelled: 'badge-danger', 'No-Show': 'badge-gray',
  };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 16, fontSize: 15 }}>{title}</h3>
      {children}
    </div>
  );
}

function AppointmentList({ appointments }) {
  if (!appointments?.length)
    return <div className="empty-state"><p>No appointments for today</p></div>;
  return appointments.map(a => (
    <div key={a._id} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patient?.name}</div>
        <div className="text-muted text-small">
          {a.doctor ? `Dr. ${a.doctor.name} · ` : ''}{a.time}
        </div>
      </div>
      {statusBadge(a.status)}
    </div>
  ));
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, hasPerm } = useAuth();

  useEffect(() => {
    API.get('/dashboard/stats')
      .then(r  => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const permList = user?.permissions || [];
  const subtitle = user?.role === 'admin'
    ? 'Full system overview — you have complete access.'
    : permList.length <= 1
      ? 'Welcome! Contact admin to grant you module access.'
      : `You have access to: ${permList.filter(p => p !== 'dashboard').join(', ')}.`;

  const chartData = stats?.monthlyRevenue?.map(m => ({
    name: monthNames[m._id.month - 1],
    revenue: m.total,
  })) || [];

  const showTokenQueue = hasPerm('patients');

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, <span>{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-muted text-small">{subtitle}</p>
        </div>
      </div>

      {/* ── Stat cards — only patients + billing ── */}
      <div className="stat-grid">
        {hasPerm('patients') && (
          <>
            <StatCard label="Total Patients"  value={stats?.totalPatients  || 0} icon="👤" color="#dbeafe" />
            <StatCard label="Active Patients" value={stats?.activePatients || 0} icon="🟢" color="#d1fae5" />
          </>
        )}
        {hasPerm('billing') && (
          <>
            <StatCard label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#d1fae5" />
            <StatCard label="Pending Bills" value={stats?.pendingBills || 0} icon="📋" color="#fee2e2" />
          </>
        )}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {hasPerm('billing') && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Monthly Revenue (Last 6 Months)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#0f4c81" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── Low stock alerts ── */}
      {(hasPerm('pharmacy') || hasPerm('inventory')) && stats?.lowStockMeds?.length > 0 && (
        <SectionCard title="Low Stock Alerts">
          {stats.lowStockMeds.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                <div className="text-muted text-small">{m.category}</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: m.quantity === 0 ? '#fee2e2' : '#fef3c7',
                color:      m.quantity === 0 ? '#ef4444' : '#d97706',
              }}>
                {m.quantity === 0 ? 'Out of Stock' : `${m.quantity} left`}
              </span>
            </div>
          ))}
        </SectionCard>
      )}

      {/* ── Pending lab tests ── */}
      {hasPerm('lab') && stats?.pendingLabList?.length > 0 && (
        <SectionCard title="Pending Lab Tests">
          {stats.pendingLabList.map((t, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.patient?.name}</div>
                <div className="text-muted text-small">
                  {t.testType} · Ordered by Dr. {t.doctor?.name}
                </div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: t.priority === 'urgent' ? '#fee2e2' : '#fef3c7',
                color:      t.priority === 'urgent' ? '#ef4444' : '#d97706',
              }}>
                {t.priority === 'urgent' ? '🚨 Urgent' : 'Pending'}
              </span>
            </div>
          ))}
        </SectionCard>
      )}

      {/* ── Token queue ── */}
      {showTokenQueue && <TokenDashboard />}

      {/* ── Empty permissions state ── */}
      {permList.filter(p => p !== 'dashboard').length === 0 && (
        <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h3 style={{ marginBottom: 8 }}>No modules assigned yet</h3>
          <p className="text-muted text-small">Ask your admin to grant you access to the modules you need.</p>
        </div>
      )}
    </div>
  );
}