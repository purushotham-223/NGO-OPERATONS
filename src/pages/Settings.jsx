import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FiUser, FiLock, FiSliders, FiUsers, FiBell, FiCheck, FiX, FiAlertCircle, 
  FiCheckCircle, FiTrash2, FiUserCheck, FiUploadCloud
} from 'react-icons/fi';

export default function Settings() {
  const { user, role } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'appearance' | 'users' | 'notifications'

  // Global Toast State
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile Tab State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Security Tab State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Users Directory Tab State (Admin Only)
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Notifications preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    new_donation: true,
    campaign_deadline: true,
    task_assignment: true,
    task_reminder: false
  });

  useEffect(() => {
    if (activeTab === 'users' && role === 'admin') {
      fetchUsers();
    }
  }, [activeTab, role]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, approved, created_at')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(msg);
      setSuccess(null);
      setTimeout(() => setError(null), 3000);
    }
  };

  const logActivity = async (actionText) => {
    try {
      await supabase.from('activity_logs').insert([
        { user_id: user.id, activity: actionText }
      ]);
    } catch (e) {
      console.error('Error logging activity:', e);
    }
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-banners') // reuse public storage bucket or create default
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-banners')
        .getPublicUrl(filePath);

      // Save URL to auth profile
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      // Update users table row as well
      await supabase
        .from('users')
        .update({ full_name: fullName }) // updates default metadata trigger sync
        .eq('id', user.id);

      setAvatarUrl(publicUrl);
      showToast('Avatar photo updated successfully!', 'success');
      logActivity(`Uploaded a new user profile avatar`);

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update Auth User Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (authError) throw authError;

      // 2. Update public.users database row
      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (dbError) throw dbError;

      showToast('Profile credentials saved successfully!', 'success');
      logActivity(`Updated personal profile details: ${fullName}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Password Update
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      showToast('Password changed successfully!', 'success');
      setPassword('');
      setConfirmPassword('');
      logActivity(`Changed personal password configurations`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user roles (Admin only)
  const handleRoleToggle = async (targetUserId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (error) throw error;

      const target = allUsers.find(u => u.id === targetUserId);
      showToast(`Role for ${target.full_name} updated to ${newRole}.`, 'success');
      logActivity(`Changed system role permissions for ${target.full_name} to ${newRole}`);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Approve a pending user (Admin only)
  const handleApproveUser = async (targetUserId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ approved: true })
        .eq('id', targetUserId);

      if (error) throw error;

      const target = allUsers.find(u => u.id === targetUserId);
      showToast(`${target.full_name} has been approved and can now access the system.`, 'success');
      logActivity(`Approved system access for user: ${target.full_name}`);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete user row (Admin only)
  const handleDeleteUserAccount = async (targetUserId) => {
    const target = allUsers.find(u => u.id === targetUserId);
    if (!window.confirm(`Are you sure you want to de-authorize and delete user ${target.full_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', targetUserId);

      if (error) throw error;

      showToast(`User ${target.full_name} successfully de-enrolled.`, 'success');
      logActivity(`De-enrolled user account profile: ${target.full_name}`);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">System Configurations</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage user credentials, appearance modes, directory roles and preferences</p>
      </div>

      {/* Message Banners */}
      {success && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in-slide">
          <FiCheckCircle size={18} className="flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-fade-in-slide">
          <FiAlertCircle size={18} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Settings Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT TAB MENU NAVIGATION (3 cols) */}
        <div className="md:col-span-3 glass-card rounded-3xl p-4 border-[var(--border-color)] flex flex-col space-y-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${activeTab === 'profile'
                ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
          >
            <FiUser size={16} />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${activeTab === 'security'
                ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
          >
            <FiLock size={16} />
            <span>Security & Pass</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${activeTab === 'appearance'
                ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
          >
            <FiSliders size={16} />
            <span>Custom Appearance</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer
                ${activeTab === 'users'
                  ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
            >
              <FiUsers size={16} />
              <span>User Directory</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer
              ${activeTab === 'notifications'
                ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
          >
            <FiBell size={16} />
            <span>Preferences</span>
          </button>
        </div>

        {/* RIGHT PANEL CONTENT CONTAINER (9 cols) */}
        <div className="md:col-span-9 glass-card rounded-3xl p-6 border-[var(--border-color)]">
          
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-page-enter">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Profile Settings</h3>
              
              {/* Avatar file upload */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-indigo/10 to-brand-violet/10 border border-brand-indigo/35 overflow-hidden flex-shrink-0 flex items-center justify-center text-brand-indigo font-black text-xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                    <FiUploadCloud />
                    <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Avatar size recommendation: 100x100px PNG or JPG.</p>
                </div>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address (Non-modifiable)</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/20 border border-[var(--border-color)] text-sm text-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-sm shadow-brand-indigo/10 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY PASSWORD UPDATE */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-page-enter">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Security Credentials</h3>
              
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-sm shadow-brand-indigo/10 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: CUSTOM APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-page-enter">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Custom Appearance</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Toggle theme options of local terminal sessions</p>
              </div>

              {/* Theme toggle slider row */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-[var(--border-color)] hover:border-slate-300 dark:hover:border-slate-700/60 transition-all duration-200">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Dark Mode Interface</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Uses high-contrast cosmic deep navy backgrounds</p>
                </div>
                
                {/* Visual switch button */}
                <button
                  onClick={toggleTheme}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ease-in-out cursor-pointer
                    ${theme === 'dark' ? 'bg-brand-violet' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md
                    transition-transform duration-300 ease-in-out flex items-center justify-center
                    ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-brand-violet' : 'bg-slate-300'}`}></span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: USER DIRECTORY ROLE SETTINGS (Admin Only) */}
          {activeTab === 'users' && role === 'admin' && (
            <div className="space-y-6 animate-page-enter">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Staff Authorization Roster</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Elevate roles or revoke accesses of staff members</p>
              </div>

              <div className="overflow-x-auto border border-[var(--border-color)] rounded-2xl overflow-hidden bg-slate-50/10 dark:bg-slate-900/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold text-xs uppercase bg-slate-50/50 dark:bg-slate-900/10">
                      <th className="py-3 px-5">Staff Member</th>
                      <th className="py-3 px-5">Email</th>
                      <th className="py-3 px-5 text-center">System Role</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-xs">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center">
                          <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </td>
                      </tr>
                    ) : allUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">No users enrolled on server directory.</td>
                      </tr>
                    ) : (
                      allUsers.map((u) => (
                        <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 ${!u.approved ? 'opacity-70' : ''}`}>
                          <td className="py-3.5 px-5 font-semibold text-[var(--text-primary)]">{u.full_name}</td>
                          <td className="py-3.5 px-5 text-[var(--text-secondary)]">{u.email}</td>
                          <td className="py-3.5 px-5 text-center">
                            {u.id === user.id ? (
                              <span className="text-[10px] font-bold text-brand-violet bg-brand-violet/10 px-2.5 py-0.5 rounded-full uppercase">
                                Self ({u.role})
                              </span>
                            ) : u.approved ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleToggle(u.id, e.target.value)}
                                className="px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-xs cursor-pointer text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-violet"
                              >
                                <option value="volunteer">Volunteer</option>
                                <option value="manager">Manager</option>
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase capitalize">
                                {u.role} (pending)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {u.approved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                                <FiCheck size={9} /> Active
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApproveUser(u.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 rounded-full hover:brightness-110 transition-all cursor-pointer shadow-sm"
                              >
                                <FiUserCheck size={10} /> Approve
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUserAccount(u.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Revoke system access"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-page-enter">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">System Alerts Preferences</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Toggle triggers of dispatch reminders</p>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/15 p-4 rounded-2xl border border-[var(--border-color)]">
                {[
                  { key: 'new_donation',       label: 'New Donation Receipt Logs', desc: 'Notify instantly on incoming funds transaction recordings' },
                  { key: 'campaign_deadline',  label: 'Campaign Deadline Warnings', desc: 'Warn when active target date is within 3 working days' },
                  { key: 'task_assignment',    label: 'Direct Task Workload Assignments', desc: 'Email when a case manager assigns a checklist task to me' },
                  { key: 'task_reminder',      label: 'Delinquent Overdue Reminders', desc: 'Send daily digests of uncompleted high priority tasks' }
                ].map(item => (
                  <label key={item.key} className="flex items-start justify-between py-3 border-b border-[var(--border-color)] last:border-0 cursor-pointer group">
                    <div className="max-w-[80%]">
                      <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-brand-violet transition-colors">{item.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs[item.key]}
                      onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-brand-violet focus:ring-brand-violet mt-1 cursor-pointer accent-brand-violet"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
