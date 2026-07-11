import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, approved, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-16 h-16 border-4 border-t-brand-violet border-r-brand-indigo border-b-brand-teal border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-[var(--text-muted)] animate-pulse">Checking credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but not yet approved, redirect to pending page
  if (!approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
