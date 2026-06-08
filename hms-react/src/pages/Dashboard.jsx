// hms-react/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TokenDashboard from '../components/TokenDashboard';
import inventoryService from '../services/inventoryService';

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
  const [notifications, setNotifications] = useState({
    lowStock: [],
    outOfStock: [],
    dueMaintenance: [],
    overdueMaintenance: []
  });
  const { user, hasPerm } = useAuth();

  // Fetch dashboard stats
  useEffect(() => {
    API.get('/dashboard/stats')
      .then(r  => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fetch inventory notifications (for users with inventory permission)
  useEffect(() => {
    if (hasPerm('inventory') || hasPerm('pharmacy')) {
      const fetchNotifications = async () => {
        try {
          const [lowStock, outOfStock, dueMaintenance, overdueMaintenance] = await Promise.all([
            inventoryService.getLowStock().catch(() => ({ data: [] })),
            inventoryService.getOutOfStock().catch(() => ({ data: [] })),
            inventoryService.getDueMaintenance().catch(() => ({ data: [] })),
            inventoryService.getOverdueMaintenance().catch(() => ({ data: [] }))
          ]);
          setNotifications({
            lowStock: lowStock.data || [],
            outOfStock: outOfStock.data || [],
            dueMaintenance: dueMaintenance.data || [],
            overdueMaintenance: overdueMaintenance.data || []
          });
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      fetchNotifications();
      // Refresh every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [hasPerm]);

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
  const showInventoryAlerts = hasPerm('inventory') || hasPerm('pharmacy');

  // Calculate alert counts
  const totalAlerts = notifications.lowStock.length + notifications.outOfStock.length + 
                      notifications.dueMaintenance.length + notifications.overdueMaintenance.length;

  return (
    <div>
      {/* ── Page header with notification badge ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, <span>{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-muted text-small">{subtitle}</p>
        </div>
        {showInventoryAlerts && totalAlerts > 0 && (
          <div style={{
            background: notifications.overdueMaintenance.length > 0 ? '#fee2e2' : '#fef3c7',
            borderRadius: 30,
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${notifications.overdueMaintenance.length > 0 ? '#fca5a5' : '#fcd34d'}`
          }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {notifications.lowStock.length} low stock · {notifications.overdueMaintenance.length} overdue maintenance
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
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
        {showInventoryAlerts && (
          <>
            <StatCard label="Low Stock Items" value={notifications.lowStock.length} icon="⚠️" color="#fef3c7" />
            <StatCard label="Out of Stock" value={notifications.outOfStock.length} icon="❌" color="#fee2e2" />
          </>
        )}
      </div>

      {/* ── OVERDUE MAINTENANCE ALERT (CRITICAL) ── */}
      {showInventoryAlerts && notifications.overdueMaintenance.length > 0 && (
        <div className="card" style={{ 
          marginBottom: 20, 
          background: '#fef2f2', 
          border: '2px solid #ef4444',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🚨</span>
            <div>
              <h3 style={{ fontSize: 16, margin: 0, color: '#dc2626' }}>Critical: Overdue Maintenance!</h3>
              <p style={{ fontSize: 13, margin: '4px 0 0', color: '#991b1b' }}>
                {notifications.overdueMaintenance.length} equipment item(s) are past their maintenance due date
              </p>
            </div>
          </div>
          {notifications.overdueMaintenance.slice(0, 5).map(item => (
            <div key={item._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #fecaca'
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div className="text-muted text-small">
                  Serial: {item.equipmentDetails?.serialNumber || 'N/A'} · 
                  Due: {item.equipmentDetails?.nextMaintenanceDate ? new Date(item.equipmentDetails.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <button 
                className="btn btn-sm btn-danger"
                onClick={() => window.location.href = '/equipment'}
              >
                View Equipment
              </button>
            </div>
          ))}
          {notifications.overdueMaintenance.length > 5 && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <span className="text-muted text-small">+{notifications.overdueMaintenance.length - 5} more</span>
            </div>
          )}
        </div>
      )}

      {/* ── DUE MAINTENANCE ALERT ── */}
      {showInventoryAlerts && notifications.dueMaintenance.length > 0 && notifications.overdueMaintenance.length === 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#fffbeb', border: '1px solid #fcd34d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#b45309' }}>Maintenance Due Soon</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#92400e' }}>
                {notifications.dueMaintenance.length} equipment item(s) need maintenance within 7 days
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {notifications.dueMaintenance.slice(0, 5).map(item => (
              <span key={item._id} className="badge badge-warning" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/equipment'}>
                {item.name} - Due {item.equipmentDetails?.nextMaintenanceDate ? new Date(item.equipmentDetails.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── LOW STOCK ALERT ── */}
      {showInventoryAlerts && (notifications.lowStock.length > 0 || notifications.outOfStock.length > 0) && (
        <div className="card" style={{ marginBottom: 20, background: '#fefce8', border: '1px solid #fde047' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#854d0e' }}>Stock Alert</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#713f12' }}>
                {notifications.outOfStock.length} out of stock · {notifications.lowStock.length} low stock
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.outOfStock.slice(0, 3).map(item => (
              <div key={item._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: '#fee2e2', borderRadius: 6
              }}>
                <span><strong>{item.name}</strong> <span className="badge badge-danger">Out of Stock</span></span>
                <button className="btn btn-sm btn-primary" onClick={() => window.location.href = '/stock-transactions'}>Restock</button>
              </div>
            ))}
            {notifications.lowStock.slice(0, 5).map(item => (
              <div key={item._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: '#fef3c7', borderRadius: 6
              }}>
                <span><strong>{item.name}</strong> - Only {item.quantity} {item.unit} left (Reorder at {item.reorderLevel})</span>
                <button className="btn btn-sm btn-outline" onClick={() => window.location.href = '/stock-transactions'}>Add Stock</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: 20, marginTop: 20 }}>
        {hasPerm('billing') && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Monthly Revenue (Last 6 Months)</h3>
            <div className="chart-container" style={{ width: '100%', height: '250px', minWidth: 0 }}>
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