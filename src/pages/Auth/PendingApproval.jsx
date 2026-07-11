import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { FiClock, FiLogOut, FiShield } from 'react-icons/fi';

export default function PendingApproval() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      {/* Animated background orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-violet/5 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-indigo/5 blur-[120px] pointer-events-none"></div>

      <div className="glass-card rounded-3xl p-10 w-full max-w-lg text-center border-[var(--border-color)] shadow-2xl relative overflow-hidden">
        {/* Glow accent top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal rounded-t-3xl"></div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-violet to-brand-indigo flex items-center justify-center shadow-lg shadow-brand-indigo/25">
            <span className="text-white font-black text-lg">N</span>
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal bg-clip-text text-transparent">
            NGO Operations CRM
          </span>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <FiClock className="text-amber-400" size={36} />
        </div>

        {/* Title */}
        <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)] mb-3">
          Awaiting Approval
        </h1>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
          Your account has been registered successfully. Your access request as{' '}
          <span className="font-bold text-brand-violet capitalize">{role}</span> is currently
          pending review by the system administrator.
        </p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">
          You will be able to log in once an administrator approves your account. Please check back later or contact your organization's admin.
        </p>

        {/* Registered email display */}
        {user?.email && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-[var(--border-color)] mb-8">
            <FiShield size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">{user.email}</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
          </div>
          <span className="text-xs text-amber-500 font-semibold">Approval pending</span>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all duration-200 cursor-pointer"
        >
          <FiLogOut size={14} />
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
