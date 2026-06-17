// hms-react/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import taskService from '../services/taskService';

// ── Nav definition ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: 'MAIN',
    items: [
      { path: '/', label: 'Dashboard', icon: '⊞', perm: 'dashboard', end: true },
      { path: '/patients', label: 'Patients', icon: '👤', perm: 'patients' },
    ],
  },
  {
    section: 'SERVICES',
    items: [
      { path: '/ipd', label: 'IPD / Admitted', icon: '🏥', perm: 'ipd' },
      { path: '/billing', label: 'Billing', icon: '💳', perm: 'billing' },
      { path: '/billing-requests', label: 'Lab Bills', icon: '🧾', perm: 'billing' },
      { path: '/pharmacy', label: 'Pharmacy', icon: '💊', perm: 'pharmacy' },
      { path: '/lab', label: 'Lab Tests', icon: '🧪', perm: 'lab' },
      { path: '/tokens', label: 'Token Queue', icon: '🎫', perm: 'patients' },
      { path: '/tasks', label: 'Task Allocation', icon: '📋', perm: 'dashboard' },
      { path: '/emergency', label: 'Emergency Dept', icon: '🚨', perm: 'patients' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { path: '/inventory', label: 'Inventory', icon: '📦', perm: 'inventory' },
      { path: '/staff', label: 'Staff Mgmt', icon: '👥', perm: 'staff' },
      { path: '/room-settings', label: 'Room Settings', icon: '🏨', perm: 'room-settings' }
    ],
  },
];

// ── Role badge config ──────────────────────────────────────────
const ROLE_META = {
  admin: { label: 'Administrator', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  doctor: { label: 'Doctor', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  nurse: { label: 'Nurse', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  receptionist: { label: 'Receptionist', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  pharmacist: { label: 'Pharmacist', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  lab_technician: { label: 'Lab Technician', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
};

export default function Layout() {
  const { user, logout, hasPerm } = useAuth();
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await taskService.getPendingCount();
        setTaskCount(data.count);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchCount();
  }, [user]);

  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = window.innerWidth <= 768;

  const handleLogout = () => { logout(); navigate('/login'); };

  const handlePharmacySSO = async (e) => {
  e.preventDefault();
  try {
    const { data } = await API.post('/auth/sso-token');
    window.location.href = `/pharmacy?sso=${data.token}`;
  } catch (err) {
    console.error('SSO token generation failed', err);
    window.location.href = '/pharmacy';
  }
};

  const roleMeta = ROLE_META[user?.role?.toLowerCase()] || {
    label: user?.role, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)',
  };

  // Filter nav by permission — hasPerm() handles admin (always true)
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => hasPerm(item.perm)),
  })).filter(s => s.items.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarOpen ? '235px' : '0px',
          transition: 'width 0.3s ease',
          background: '#0f2942',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>MediCare HMS</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Hospital Management System</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '10px 16px 6px' }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            color: roleMeta.color, background: roleMeta.bg,
            textTransform: 'uppercase',
          }}>
            {roleMeta.label}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 0' }}>
          {visibleSections.map(({ section, items }) => (
            <div key={section}>
              <div style={{
                padding: '10px 20px 4px', fontSize: 10,
                fontWeight: 700, color: '#64748b', letterSpacing: 1,
              }}>
                {section}
              </div>
              {items.map(({ path, label, icon, end }) => (
                <NavLink
                  key={path} to={path} end={end}
                  onClick={(e) => {
                    setSidebarOpen(false);
                    if (path === '/pharmacy') {
                      handlePharmacySSO(e);
                    }
                  }}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 20px', fontSize: 13, fontWeight: 500,
                    color: isActive ? '#fff' : '#94a3b8',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                    textDecoration: 'none', transition: 'all 0.15s',
                  })}
                >
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <span>{label === 'Task Allocation' && taskCount > 0 ? `Task Allocation [${taskCount}]` : label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', }}>
          <div
            onClick={() => {
              setSidebarOpen(false);
              navigate('/profile');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: '#0f2942', flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontWeight: 600, fontSize: 13, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: roleMeta.color, textTransform: 'capitalize' }}>
                {roleMeta.label}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#f87171',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            }}
          >
            <span style={{ fontSize: 15 }}>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            top: isMobile ? 10 : 12,
            left: isMobile ? 10 : 24,
            zIndex: 2000,
            padding: '4px 14px',
            border: 'none',
            borderRadius: 8,
            background: '#0f2942',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {sidebarOpen ? '✕ Close' : '☰ Menu'}
        </button>
      )}

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#f1f5f9',
          padding: isMobile ? 12 : 24,
          paddingTop: sidebarOpen ? (isMobile ? 70 : 24) : (isMobile ? 70 : 45),
        }}
      >
        <Outlet />
      </main>

      {/* ── Sign-out confirm modal ───────────────────────────────── */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 320, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🚪</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              Sign Out?
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>
              You'll be redirected to the login page.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: 'none',
                  background: '#ef4444', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
