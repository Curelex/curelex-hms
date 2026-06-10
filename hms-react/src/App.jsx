// hms-react/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

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
import IPD from './pages/IPD';   // ← NEW
import RoomSettings from './pages/RoomSettings';
import Emergency from './pages/Emergency';

/* ── Auth guards ─────────────────────────────────────────────── */
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
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
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>

            {/* Dashboard — every logged-in user */}
            <Route index element={<Dashboard />} />

            <Route path="patients" element={
              <PermRoute permKey="patients"><Patients /></PermRoute>
            } />

            <Route path="billing" element={
              <PermRoute permKey="billing"><Billing /></PermRoute>
            } />

            <Route path="billing-requests" element={
              <PermRoute permKey="billing"><BillingRequests /></PermRoute>
            } />

            {/* ── IPD: Inpatient Department ───────────────────────────
                Visible to: receptionist (admits + adds meds + generates bill)
                            doctor & nurse (add follow-up notes)
                            admin (full access)
                Permission key: 'ipd'
            ──────────────────────────────────────────────────────── */}
            <Route path="ipd" element={
              <PermRoute permKey="ipd"><IPD /></PermRoute>
            } />

            <Route path="room-settings" element={<PermRoute permKey="room-settings"><RoomSettings /></PermRoute>} />

<Route path="pharmacy/*" element={
              <PermRoute permKey="pharmacy">
                <IMSApp />
              </PermRoute>
            } />

            <Route path="lab" element={
              <PermRoute permKey="lab"><Lab /></PermRoute>
            } />

            
<Route path="inventory" element={<PermRoute permKey="inventory"><Inventory /></PermRoute>} />


            <Route path="staff" element={
              <PermRoute permKey="staff"><Staff /></PermRoute>
            } />

            <Route path="tokens" element={
              <PermRoute permKey="patients"><TokenPanel /></PermRoute>
            } />

            <Route path="emergency" element={<Emergency />} />

          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;