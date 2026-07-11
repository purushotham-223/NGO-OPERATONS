import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiAward, FiHeart, FiTrendingUp, FiShield } from 'react-icons/fi';

export default function Login() {
  const { user, approved } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('volunteer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [adminExists, setAdminExists] = useState(null); // null = checking

  // Check if an admin already exists in the system
  useEffect(() => {
    async function checkAdminExists() {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      setAdminExists(count > 0);
    }
    checkAdminExists();
  }, []);

  // Redirect once authenticated
  useEffect(() => {
    if (user && approved) {
      navigate('/dashboard', { replace: true });
    } else if (user && approved === false) {
      navigate('/pending-approval', { replace: true });
    }
  }, [user, approved, navigate]);

  // Password strength logic
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const passwordScore = getPasswordStrength(password);
  const getStrengthMeta = (score) => {
    const levels = [
      { label: '', width: '0%', color: 'bg-slate-300' },
      { label: 'Weak', width: '25%', color: 'bg-rose-500' },
      { label: 'Fair', width: '50%', color: 'bg-amber-400' },
      { label: 'Good', width: '75%', color: 'bg-indigo-400' },
      { label: 'Strong', width: '100%', color: 'bg-emerald-500' },
    ];
    return levels[score] || levels[0];
  };
  const strength = getStrengthMeta(passwordScore);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // on success, the useEffect above handles redirect
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Determine if this user will be auto-approved or pending
    const willBeAdmin = !adminExists && role === 'admin';
    const willBeVolunteer = role === 'volunteer';
    const autoApproved = willBeAdmin || willBeVolunteer;

    if (autoApproved) {
      // Re-check admin state for next signup
      setAdminExists(true);
      setSuccess(
        willBeAdmin
          ? '🎉 Administrator account created! You can now log in.'
          : '✅ Account created! You can now log in.'
      );
    } else {
      setSuccess('📋 Request submitted! An administrator will review your account. You will receive access once approved.');
    }

    // Reset form and go back to login tab
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('volunteer');
    setTab('login');
    setLoading(false);
  };

  // Build role options — hide Admin if one already exists
  const roleOptions = [
    {
      value: 'volunteer',
      label: 'Public User',
      description: 'View tasks and campaigns — auto-approved instantly',
      color: 'text-brand-teal',
    },
    {
      value: 'manager',
      label: 'Manager',
      description: 'Manage campaigns, donors, volunteers — requires admin approval',
      color: 'text-brand-indigo',
    },
    ...(!adminExists
      ? [{
          value: 'admin',
          label: 'Administrator',
          description: 'Full system control — first admin only, auto-approved',
          color: 'text-brand-violet',
        }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] overflow-hidden">

      {/* ── LEFT PANEL ────────────────────────────────── */}
      <div className="hidden md:flex flex-col w-3/5 relative bg-[#090D1A] overflow-hidden justify-between p-12 select-none border-r border-[var(--border-color)]">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-violet/10 blur-[120px] auth-orb-1"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-indigo/10 blur-[120px] auth-orb-2"></div>
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-brand-teal/5 blur-[80px] auth-orb-3"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-violet to-brand-indigo flex items-center justify-center shadow-lg shadow-brand-indigo/25">
            <span className="text-white font-black text-xl">N</span>
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal bg-clip-text text-transparent">
            NGO Operations CRM
          </span>
        </div>

        <div className="my-auto max-w-xl relative z-10 space-y-6">
          <h2 className="font-display font-extrabold text-5xl leading-tight text-white tracking-tight">
            Empower Change <br />
            <span className="bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal bg-clip-text text-transparent">
              One Action at a Time.
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Centralized platform for charitable organizations to digitize volunteer coordination, target assistance, and aggregate donor relations.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="glass-card rounded-2xl p-4 border-white/5 bg-white/[0.02]">
              <FiTrendingUp className="text-brand-indigo text-xl mb-2" />
              <p className="text-2xl font-bold text-white font-display">$1.2M+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Funds Raised</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-white/5 bg-white/[0.02]">
              <FiHeart className="text-brand-rose text-xl mb-2" />
              <p className="text-2xl font-bold text-white font-display">45K+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Lives Impacted</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-white/5 bg-white/[0.02]">
              <FiAward className="text-brand-teal text-xl mb-2" />
              <p className="text-2xl font-bold text-white font-display">220+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Volunteers</p>
            </div>
          </div>
        </div>

        <p className="text-slate-600 text-xs font-medium relative z-10">
          NGO Operations &bull; Smart Management &bull; Built with Supabase &amp; React
        </p>
      </div>

      {/* ── RIGHT FORM PANEL ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-primary)]">
        <div className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl border-[var(--border-color)]">

          {/* Tabs */}
          <div className="flex border-b border-[var(--border-color)] mb-8">
            {[
              { key: 'login', label: 'Sign In' },
              { key: 'signup', label: 'Sign Up' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setError(null); setSuccess(null); }}
                className={`flex-1 pb-4 text-sm font-semibold transition-all duration-300 cursor-pointer
                  ${tab === key
                    ? 'border-b-2 border-brand-violet text-brand-violet'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── SUCCESS BANNER ── */}
          {success && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-5 animate-fade-in-slide">
              <p>{success}</p>
            </div>
          )}

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-5 animate-fade-in-slide">
              <FiAlertCircle size={18} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* ══════════ SIGN IN FORM ══════════ */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                <div className="relative flex items-center">
                  <FiMail className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.org"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                  <button type="button" onClick={() => navigate('/reset-password')}
                    className="text-xs font-semibold text-brand-violet hover:underline cursor-pointer">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-sm hover:brightness-110 active:scale-98 transition-all shadow-md cursor-pointer flex justify-center items-center disabled:opacity-60">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  : 'Sign In'}
              </button>

              <p className="text-center text-xs text-[var(--text-muted)] pt-1">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setTab('signup'); setError(null); }}
                  className="text-brand-violet font-semibold hover:underline cursor-pointer">
                  Sign up here
                </button>
              </p>
            </form>
          )}

          {/* ══════════ SIGN UP FORM ══════════ */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5 animate-fade-in-slide">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="text" required value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                <div className="relative flex items-center">
                  <FiMail className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.org"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                <div className="relative flex items-center">
                  <FiLock className="absolute left-4 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
                {password.length > 0 && (
                  <div className="pt-1 animate-fade-in-slide">
                    <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)] mb-1">
                      <span>Password Strength:</span>
                      <span className={`${passwordScore <= 1 ? 'text-rose-500' : passwordScore === 2 ? 'text-amber-500' : passwordScore === 3 ? 'text-indigo-400' : 'text-emerald-500'}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-2 animate-fade-in-slide">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Select Your Role</label>
                {adminExists === null ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                    <div className="w-3 h-3 border border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking system state...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roleOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200
                          ${role === opt.value
                            ? 'border-brand-violet bg-brand-violet/10'
                            : 'border-[var(--border-color)] hover:border-brand-violet/50 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                      >
                        <input
                          type="radio" name="role" value={opt.value}
                          checked={role === opt.value}
                          onChange={() => setRole(opt.value)}
                          className="mt-0.5 accent-brand-violet"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <FiShield size={11} className={opt.color} />
                            <p className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</p>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{opt.description}</p>
                        </div>
                      </label>
                    ))}
                    {adminExists && (
                      <p className="text-[10px] text-amber-500/80 flex items-center gap-1 pt-0.5">
                        <FiShield size={9} />
                        An Administrator already exists. Only one admin is allowed.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || adminExists === null}
                className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-sm hover:brightness-110 active:scale-98 transition-all shadow-md cursor-pointer flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  : 'Create Account'}
              </button>

              <p className="text-center text-xs text-[var(--text-muted)] pt-1">
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); setError(null); }}
                  className="text-brand-violet font-semibold hover:underline cursor-pointer">
                  Sign in here
                </button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
