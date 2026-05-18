// hms-react/src/components/RoleRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route and only renders children if the logged-in user's role
 * is included in the `roles` prop array.
 * If not allowed → redirects to "/" (dashboard) which shows a "no access" state.
 */
export default function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}