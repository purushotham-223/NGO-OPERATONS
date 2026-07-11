import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Authentication Pages
import Login from './pages/Auth/Login';
import ResetPassword from './pages/Auth/ResetPassword';
import PendingApproval from './pages/Auth/PendingApproval';

// Core Application Pages
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import Beneficiaries from './pages/Beneficiaries';
import Campaigns from './pages/Campaigns';
import Donations from './pages/Donations';
import Volunteers from './pages/Volunteers';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Root Redirection */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Core Authenticated System Routes */}
            <Route 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route 
                path="/donors" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Donors />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="/beneficiaries" element={<Beneficiaries />} />
              
              <Route path="/campaigns" element={<Campaigns />} />
              
              <Route 
                path="/donations" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Donations />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/volunteers" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Volunteers />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="/tasks" element={<Tasks />} />
              
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback Redirection */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
