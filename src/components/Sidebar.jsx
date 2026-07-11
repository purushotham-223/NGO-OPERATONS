import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { 
  FiGrid, 
  FiUsers, 
  FiHeart, 
  FiFlag, 
  FiDollarSign, 
  FiUserCheck, 
  FiCheckSquare, 
  FiBarChart2, 
  FiSettings, 
  FiLogOut,
  FiMenu,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

export default function Sidebar() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard',     icon: FiGrid,        label: 'Dashboard' },
    { path: '/donors',        icon: FiUsers,       label: 'Donors',        roles: ['admin', 'manager'] },
    { path: '/beneficiaries', icon: FiHeart,       label: 'Beneficiaries' },
    { path: '/campaigns',     icon: FiFlag,        label: 'Campaigns' },
    { path: '/donations',     icon: FiDollarSign,  label: 'Donations',     roles: ['admin', 'manager'] },
    { path: '/volunteers',    icon: FiUserCheck,   label: 'Volunteers',    roles: ['admin', 'manager'] },
    { path: '/tasks',         icon: FiCheckSquare, label: 'Tasks' },
    { path: '/reports',       icon: FiBarChart2,   label: 'Reports',       roles: ['admin', 'manager'] },
    { path: '/settings',      icon: FiSettings,    label: 'Settings' },
  ];

  // Filter links based on user role
  const visibleLinks = navLinks.filter(link => {
    if (!link.roles) return true;
    return link.roles.includes(role);
  });

  return (
    <aside 
      className={`sidebar flex flex-col h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] text-[var(--text-primary)] z-40 relative
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-[var(--border-color)]">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-indigo flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal bg-clip-text text-transparent">
              NGO CRM
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-brand-violet to-brand-indigo flex items-center justify-center shadow-md">
            <span className="text-white font-black text-lg">N</span>
          </div>
        )}
        
        {/* Toggle Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:scale-110 transition-all duration-200 z-50 cursor-pointer"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-brand-indigo/10 to-brand-violet/10 text-brand-indigo font-medium border-l-4 border-brand-indigo pl-3' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-4 border-transparent'
                }
              `}
            >
              <Icon size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
              {!isCollapsed && (
                <span className="font-medium text-sm transition-all duration-300">{link.label}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-20 bg-slate-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50 shadow-md">
                  {link.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer / User Profile */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {user?.user_metadata?.full_name || 'Staff Member'}
              </p>
              <p className="text-xs text-[var(--text-muted)] capitalize truncate">
                {role || 'volunteer'}
              </p>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className={`mt-4 flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all duration-300 font-medium text-sm cursor-pointer
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          <FiLogOut size={18} className="flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
