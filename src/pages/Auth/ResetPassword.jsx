import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FiMail, FiLock, FiAlertCircle, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

export default function ResetPassword() {
  const navigate = useNavigate();

  // Detect recovery mode from hash parameters
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Supabase recovery links contain access_token and type=recovery in hash params
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      setIsRecovery(true);
    }
  }, []);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset email sent! Check your inbox for the recovery link.');
    }
    setLoading(false);
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-violet/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-brand-indigo/5 blur-[100px] pointer-events-none"></div>

      <div className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl relative border-[var(--border-color)]">
        {/* Back Link */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors duration-200 cursor-pointer"
        >
          <FiArrowLeft />
          <span>Back to Login</span>
        </button>

        <h2 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">
          {isRecovery ? 'Set New Password' : 'Reset Password'}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          {isRecovery 
            ? 'Enter your new credentials below to update your account password.' 
            : 'Enter your registered email address and we will email you a password recovery link.'
          }
        </p>

        {/* Message Banner */}
        {message && (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-5">
            <FiCheckCircle size={18} className="flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-5">
            <FiAlertCircle size={18} className="flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isRecovery ? handleSetNewPassword : handleRequestReset} className="space-y-5">
          {!isRecovery ? (
            /* Request reset view */
            <div className="space-y-1.5 animate-page-enter">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-4 text-[var(--text-muted)]" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.org"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                />
              </div>
            </div>
          ) : (
            /* New password view */
            <div className="space-y-5 animate-page-enter">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-sm hover:brightness-110 active:scale-98 transition-all duration-200 shadow-md shadow-brand-indigo/10 cursor-pointer flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>{isRecovery ? 'Update Password' : 'Send Recovery Email'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
