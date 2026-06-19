// hms-react/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import BillingRequests from './pages/BillingRequests';
import IMSApp from './ims/App';
import Lab from './pages/Lab';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import TokenPanel from './pages/TokenPanel';
import IPD from './pages/IPD';
import RoomSettings from './pages/RoomSettings';
import Emergency from './pages/Emergency';
import PatientDashboard from './pages/PatientDashboard';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientAppointments from './pages/PatientAppointments';

/* ── Auth guards ─────────────────────────────────────────────── */
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
};

const PatientRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/patient-login" />;
  if (user.role !== 'patient') return <Navigate to="/" />;
  return children;
};

const StaffRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'patient') return <Navigate to="/patient-dashboard" />;
  return children;
};

/* ── Permission guard ─────────────────────────────────────────── */
const PermRoute = ({ permKey, children }) => {
  const { hasPerm } = useAuth();
  return hasPerm(permKey) ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public Auth Routes ────────────────────────────── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* ── Patient Auth Routes ───────────────────────────── */}
          <Route path="/patient-login" element={<PublicRoute><PatientLogin /></PublicRoute>} />
          <Route path="/patient-register" element={<PublicRoute><PatientRegister /></PublicRoute>} />

          {/* ── Staff Routes (with Layout) ────────────────────── */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <StaffRoute>
                  <Layout />
                </StaffRoute>
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />

            <Route
              path="patients"
              element={<PermRoute permKey="patients"><Patients /></PermRoute>}
            />

            <Route
              path="billing"
              element={<PermRoute permKey="billing"><Billing /></PermRoute>}
            />

            <Route
              path="billing-requests"
              element={<PermRoute permKey="billing"><BillingRequests /></PermRoute>}
            />

            <Route
              path="ipd"
              element={<PermRoute permKey="ipd"><IPD /></PermRoute>}
            />

            <Route
              path="room-settings"
              element={<PermRoute permKey="room-settings"><RoomSettings /></PermRoute>}
            />

            <Route
              path="pharmacy/*"
              element={<PermRoute permKey="pharmacy"><IMSApp /></PermRoute>}
            />

            <Route
              path="lab"
              element={<PermRoute permKey="lab"><Lab /></PermRoute>}
            />

            <Route
              path="inventory"
              element={<PermRoute permKey="inventory"><Inventory /></PermRoute>}
            />

            <Route
              path="staff"
              element={<PermRoute permKey="staff"><Staff /></PermRoute>}
            />

            <Route
              path="tokens"
              element={<PermRoute permKey="patients"><TokenPanel /></PermRoute>}
            />

            <Route path="tasks" element={<PrivateRoute><TaskAllocation /></PrivateRoute>} />

            <Route path="emergency" element={<Emergency />} />
          </Route>

          {/* ── Patient Routes ─────────────────────────────────── */}
          <Route
            path="/patient-dashboard"
            element={<PatientRoute><PatientDashboard /></PatientRoute>}
          />
          <Route
            path="/patient-appointments"
            element={<PatientRoute><PatientAppointments /></PatientRoute>}
          />
        

          {/* ── Catch all ──────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;