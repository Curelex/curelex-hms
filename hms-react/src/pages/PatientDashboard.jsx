// hms-react/src/pages/PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';

export default function PatientDashboard() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    prescriptionsCount: 0,
    doctorsConsulted: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/patient-login');
      return;
    }
    if (!isPatient()) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const patientId = patient?._id || patient?.id || user?.id || user?._id;

      if (!patientId) {
        console.error('No patient ID found');
        setLoading(false);
        return;
      }

      const statsRes = await API.get(`/patient-portal/${patientId}/dashboard`);
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const apptRes = await API.get(`/patient-portal/${patientId}/appointments`);
      if (apptRes.data.success) {
        setAppointments(apptRes.data.appointments || []);
      }

      try {
        const rxRes = await API.get(`/patient-portal/${patientId}/prescriptions`);
        if (rxRes.data.success) {
          setPrescriptions(rxRes.data.prescriptions || []);
        }
      } catch {
        console.log('Prescriptions not available yet');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  }

  const handleLogout = () => {
    logout();
    navigate('/patient-login');
  };

  const goTo = (path) => {
    setSidebarOpen(false);
    setUserDropdown(false);
    navigate(path);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const patientName  = patient?.name  || user?.name  || 'Patient';
  const patientEmail = patient?.email || user?.email || '';

  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const upcomingAppointments = appointments.filter(
    a => new Date(a.appointmentTime) > new Date()
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      {/* TOPBAR */}
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/patient-dashboard" className="pd-topbar__title">
            My Health
          </Link>
        </div>
        <div className="pd-topbar__right">
          <div className="pd-topbar__location">
            <i className="fas fa-map-marker-alt"></i>
            Home
            <i className="fas fa-chevron-down" style={{ fontSize: 10 }}></i>
          </div>
          <div className="pd-topbar__search">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search doctors, clinics..." />
          </div>
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger" onClick={() => setUserDropdown(!userDropdown)}>
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, color: 'var(--text-secondary)' }}></i>
            </div>
            {userDropdown && (
              <>
                <div className="pd-user-dropdown-overlay" onClick={() => setUserDropdown(false)} />
                <div className="pd-user-dropdown">
                  <div className="pd-user-dropdown__info">
                    <strong>{patientName}</strong>
                    <span>{patientEmail}</span>
                  </div>
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-profile')}>
                    <i className="fas fa-user-circle"></i> Profile
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-appointments')}>
                    <i className="fas fa-calendar-check"></i> Appointments
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-prescriptions')}>
                    <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
                  </button>
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item pd-user-dropdown__item--danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="pd-sidebar__profile">
            <div className="pd-sidebar__avatar">{initials}</div>
            <div>
              <div className="pd-sidebar__name">{patientName}</div>
              <div className="pd-sidebar__phone">{patientEmail}</div>
            </div>
          </div>
          <nav className="pd-sidebar__nav">
            <div className="pd-nav-item active" onClick={() => setSidebarOpen(false)}>
              <i className="fas fa-home"></i> Dashboard
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-appointments')}>
              <i className="fas fa-calendar-check"></i> My Appointments
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-prescriptions')}>
              <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-profile')}>
              <i className="fas fa-user-circle"></i> Profile
            </div>
            <div className="pd-nav-divider" />
            <div className="pd-nav-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </div>
          </nav>
          <div className="pd-sidebar__footer">
            <button className="pd-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="pd-main">
          <main className="pd-body">
            {/* Welcome Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: '16px',
              padding: '24px 28px',
              marginBottom: '24px',
              border: '1px solid #bfdbfe',
            }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1e3a8a' }}>
                Welcome back, {patientName}! 👋
              </h2>
              <p style={{ margin: '4px 0 0', color: '#3b82f6', fontSize: '14px' }}>
                Here's a summary of your health journey
              </p>
            </div>

            {/* Quick Stats */}
            <div className="pd-stats">
              {[
                { icon: 'fa-calendar-check',      label: 'Upcoming',           value: stats.upcomingAppointments, color: '#2d6be4' },
                { icon: 'fa-prescription-bottle', label: 'Prescriptions',      value: stats.prescriptionsCount,   color: '#00b386' },
                { icon: 'fa-file-medical',        label: 'Total Appointments', value: stats.totalAppointments,    color: '#f59e0b' },
                { icon: 'fa-user-md',             label: 'Doctors Consulted',  value: stats.doctorsConsulted,     color: '#7c3aed' },
              ].map(s => (
                <div className="pd-stat-card" key={s.label}>
                  <div className="pd-stat-card__icon" style={{ background: s.color + '18', color: s.color }}>
                    <i className={`fas ${s.icon}`}></i>
                  </div>
                  <div>
                    <div className="pd-stat-card__num">{s.value}</div>
                    <div className="pd-stat-card__label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Grid */}
            <div className="pd-grid">
              {/* Upcoming Appointments */}
              <div className="pd-card">
                <div className="pd-card__head">
                  <div className="pd-card__head-icon"><i className="fas fa-calendar-alt"></i></div>
                  <h3>Upcoming Appointments</h3>
                </div>
                <div className="pd-card__body">
                  {upcomingAppointments.length === 0 && (
                    <div className="pd-empty">
                      <i className="fas fa-calendar-times"></i> No upcoming appointments
                    </div>
                  )}
                  {upcomingAppointments.slice(0, 3).map((apt, i) => {
                    const d = new Date(apt.appointmentTime);
                    return (
                      <div className="pd-appt-item" key={i}>
                        <div className="pd-appt-date">
                          <span className="day">{d.getDate()}</span>
                          <span className="month">{d.toLocaleString('en-US', { month: 'short' })}</span>
                        </div>
                        <div className="pd-appt-info">
                          <h4>{apt.doctorId?.name ? `Dr. ${apt.doctorId.name}` : 'Doctor'}</h4>
                          <p>{formatTime(apt.appointmentTime)}</p>
                          <span className="badge badge--green">✅ Confirmed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pd-card__footer">
                  <button
                    className="pd-btn pd-btn--primary pd-btn--full"
                    onClick={() => navigate('/patient-appointments')}
                  >
                    <i className="fas fa-calendar-plus"></i> Book New Appointment
                  </button>
                </div>
              </div>

              {/* Recent Prescriptions */}
              <div className="pd-card">
                <div className="pd-card__head">
                  <div className="pd-card__head-icon"><i className="fas fa-prescription-bottle-alt"></i></div>
                  <h3>Recent Prescriptions</h3>
                </div>
                <div className="pd-card__body">
                  {prescriptions.length === 0 && (
                    <div className="pd-empty"><i className="fas fa-file-prescription"></i> No prescriptions yet</div>
                  )}
                  {prescriptions.slice(0, 3).map((rx, i) => (
                    <div className="pd-rx-item" key={i}>
                      <div className="pd-rx-avatar"><i className="fas fa-user-md"></i></div>
                      <div className="pd-rx-info">
                        <h4>{rx.doctorId?.name || 'Doctor'}</h4>
                        <p>{rx.doctorId?.specialization || 'General'}</p>
                      </div>
                      <span className="pd-rx-date">{formatDate(rx.createdAt)}</span>
                    </div>
                  ))}
                </div>
                <div className="pd-card__footer">
                  <button
                    className="pd-btn pd-btn--outline pd-btn--full"
                    onClick={() => navigate('/patient-prescriptions')}
                  >
                    <i className="fas fa-eye"></i> View All Prescriptions
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}>
              {[
                { icon: 'fa-video',       label: 'Video Consultation', color: '#2d6be4', action: () => alert('Video consultation coming soon!') },
                { icon: 'fa-user-md',     label: 'Find Doctors',       color: '#00b386', action: () => alert('Find doctors coming soon!') },
                { icon: 'fa-flask',       label: 'Lab Tests',          color: '#f59e0b', action: () => alert('Lab tests coming soon!') },
                { icon: 'fa-comment-dots',label: 'Feedback',           color: '#7c3aed', action: () => alert('Feedback coming soon!') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.boxShadow = `0 4px 16px ${item.color}22`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: item.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: item.color,
                  }}>
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a2236' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}