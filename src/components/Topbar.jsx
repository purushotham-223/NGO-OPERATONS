import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FiSun, FiMoon, FiBell, FiUser } from 'react-icons/fi';

export default function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, role } = useAuth();
  const location = useLocation();

  // Get active route label
  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="glass-card sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
      {/* Page Title */}
      <div>
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">
          {getPageTitle()}
        </h1>
        <p className="text-xs text-[var(--text-muted)] hidden sm:block">
          NGO Operations CRM &bull; Core System
        </p>
      </div>

      {/* Action Items */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggle}
          className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all duration-200 cursor-pointer"
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? (
            <FiSun size={18} className="text-amber-400 rotate-0 transition-transform duration-500" />
          ) : (
            <FiMoon size={18} className="text-indigo-600 rotate-0 transition-transform duration-500" />
          )}
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-[var(--border-color)]"></div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {user?.user_metadata?.full_name || 'Staff Member'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              {role || 'volunteer'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-indigo/20 to-brand-violet/20 border border-brand-indigo/30 flex items-center justify-center text-brand-indigo font-bold shadow-sm">
            {user?.email?.charAt(0).toUpperCase() || <FiUser />}
          </div>
        </div>
      </div>
    </header>
  );
}
