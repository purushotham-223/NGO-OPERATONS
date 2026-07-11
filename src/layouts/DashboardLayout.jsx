import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Persistent Collapsible Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Persistent Topbar */}
        <Topbar />
        
        {/* Dynamic Nested Route Page */}
        <main className="flex-1 overflow-y-auto p-6 animate-page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
