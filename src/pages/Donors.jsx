import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import { 
  FiSearch, FiPlus, FiDownload, FiX, FiCheck, FiChevronRight, FiEdit2, FiTrash2,
  FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiFileText, FiCalendar, FiAlertTriangle,
  FiDollarSign
} from 'react-icons/fi';
import Papa from 'papaparse';

export default function Donors() {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'mega' | 'recurring' | 'new'

  // Modal / Drawer States
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorHistory, setDonorHistory] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    notes: ''
  });

  const [formError, setFormError] = useState(null);
  const [donorNotes, setDonorNotes] = useState(''); // editable notes in drawer

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .order('total_donation', { ascending: false });
      
      if (error) throw error;
      setDonors(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonorHistory = async (donorId) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*, campaigns(title)')
        .eq('donor_id', donorId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      setDonorHistory(data || []);
    } catch (e) {
      console.error(e);
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

  // Search & Filtering
  const filteredDonors = donors.filter(d => {
    const query = search.toLowerCase();
    const matchesSearch = d.name.toLowerCase().includes(query) ||
      d.email.toLowerCase().includes(query) ||
      d.phone?.includes(query);

    if (tierFilter === 'mega') return matchesSearch && Number(d.total_donation) >= 5000;
    if (tierFilter === 'new') {
      const date = new Date(d.created_at);
      const pastMonth = new Date();
      pastMonth.setMonth(pastMonth.getMonth() - 1);
      return matchesSearch && date > pastMonth;
    }
    return matchesSearch;
  });

  // Slide-out Drawer Trigger
  const handleRowClick = (donor) => {
    setSelectedDonor(donor);
    setDonorNotes(donor.notes || '');
    fetchDonorHistory(donor.id);
    setIsDrawerOpen(true);
    setIsEditing(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvData = filteredDonors.map(d => ({
      Name: d.name,
      Email: d.email,
      Phone: d.phone || 'N/A',
      Address: d.address || 'N/A',
      Occupation: d.occupation || 'N/A',
      'Total Donated ($)': d.total_donation,
      'Registered Date': new Date(d.created_at).toLocaleDateString(),
      Notes: d.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Donors_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logActivity(`Exported donor list as CSV`);
  };

  // Form submit (Add / Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (isEditing) {
        // UPDATE
        const { error } = await supabase
          .from('donors')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            occupation: formData.occupation,
            notes: formData.notes
          })
          .eq('id', selectedDonor.id);

        if (error) throw error;
        
        logActivity(`Updated donor profile details for ${formData.name}`);
        setIsEditing(false);
        setIsDrawerOpen(false);
      } else {
        // ADD NEW
        const { error } = await supabase
          .from('donors')
          .insert([formData]);

        if (error) throw error;
        
        logActivity(`Registered a new donor: ${formData.name}`);
        setShowAddModal(false);
      }

      // Reset form
      setFormData({ name: '', email: '', phone: '', address: '', occupation: '', notes: '' });
      fetchDonors();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenEdit = () => {
    setFormData({
      name: selectedDonor.name,
      email: selectedDonor.email,
      phone: selectedDonor.phone || '',
      address: selectedDonor.address || '',
      occupation: selectedDonor.occupation || '',
      notes: selectedDonor.notes || ''
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteDonor = async () => {
    try {
      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', selectedDonor.id);
      
      if (error) throw error;

      logActivity(`Deleted donor contact card for ${selectedDonor.name}`);
      setShowDeleteConfirm(false);
      setIsDrawerOpen(false);
      fetchDonors();
    } catch (e) {
      console.error(e);
    }
  };

  // Save notes direct update inside drawer
  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('donors')
        .update({ notes: donorNotes })
        .eq('id', selectedDonor.id);
      
      if (error) throw error;
      
      setSelectedDonor(prev => ({ ...prev, notes: donorNotes }));
      // refresh local listing sum notes
      setDonors(prev => prev.map(d => d.id === selectedDonor.id ? { ...d, notes: donorNotes } : d));
      logActivity(`Updated notes on donor card ${selectedDonor.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Donor Network Directory</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage and audit database connections of sponsors</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => { setIsEditing(false); setFormData({ name: '', email: '', phone: '', address: '', occupation: '', notes: '' }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus />
            <span>Add Donor</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-slate-100 dark:hover:bg-slate-800/40 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search grid */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex items-center w-full sm:w-80">
          <FiSearch className="absolute left-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
          />
        </div>

        {/* Dynamic Tier Filters */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/45 p-1 rounded-2xl border border-[var(--border-color)]">
          {[
            { value: 'all', label: 'All Donors' },
            { value: 'mega', label: 'Mega Tiers ($5k+)' },
            { value: 'new', label: 'New Members' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTierFilter(opt.value)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer
                ${tierFilter === opt.value
                  ? 'bg-[var(--bg-card)] text-brand-violet shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card rounded-3xl border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold text-xs uppercase bg-slate-50/50 dark:bg-slate-900/10">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Phone</th>
                <th className="py-4 px-6">Occupation</th>
                <th className="py-4 px-6 text-right">Total Donated</th>
                <th className="py-4 px-6 text-center">Since</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredDonors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[var(--text-muted)]">
                    No donors found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDonors.map(donor => (
                  <tr
                    key={donor.id}
                    onClick={() => handleRowClick(donor)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/10 cursor-pointer transition-colors duration-150"
                  >
                    <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">{donor.name}</td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">{donor.email}</td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">{donor.phone || '—'}</td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">{donor.occupation || '—'}</td>
                    <td className="py-4 px-6 text-right font-display font-bold text-brand-indigo">
                      {formatCurrency(donor.total_donation)}
                    </td>
                    <td className="py-4 px-6 text-center text-[var(--text-muted)]">
                      {new Date(donor.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-violet transition-colors">
                        <FiChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SLIDE OUT DRAWER DETAILS ─── */}
      <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none invisible'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)}></div>
        
        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl pointer-events-auto transition-transform duration-300 ease-out flex flex-col
          ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {selectedDonor && (
            <>
              {/* Drawer Header */}
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {selectedDonor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)]">{selectedDonor.name}</h3>
                    <p className="text-[10px] text-brand-indigo font-bold bg-brand-indigo/10 px-2 py-0.5 rounded-full inline-block mt-0.5">Donor Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-[var(--text-secondary)] cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Drawer Body Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Contact Card Box */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/25 p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <FiMail className="text-[var(--text-muted)]" />
                    <span className="truncate">{selectedDonor.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <FiPhone className="text-[var(--text-muted)]" />
                    <span>{selectedDonor.phone || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <FiMapPin className="text-[var(--text-muted)] flex-shrink-0" />
                    <span>{selectedDonor.address || 'Address unlisted'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <FiBriefcase className="text-[var(--text-muted)]" />
                    <span>{selectedDonor.occupation || 'Occupation unlisted'}</span>
                  </div>
                </div>

                {/* Financial Overview Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-indigo/10 to-brand-violet/10 border border-brand-indigo/15 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Donations</p>
                    <p className="text-2xl font-bold font-display text-brand-indigo mt-0.5">
                      {formatCurrency(selectedDonor.total_donation)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-brand-indigo/15 text-brand-indigo">
                    <FiDollarSign size={20} />
                  </div>
                </div>

                {/* Staff Interaction Notes Box */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <FiFileText />
                    <span>Operational Case Notes</span>
                  </label>
                  <textarea
                    value={donorNotes}
                    onChange={(e) => setDonorNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="Enter interaction logs, background info or matching campaigns..."
                    className="w-full h-24 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-violet resize-none focus:bg-[var(--bg-card)] transition-all duration-200"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] italic">Saving changes on text-area blur automatically.</p>
                </div>

                {/* Donation History Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <FiCalendar />
                    <span>Financial Contribution Ledger</span>
                  </h4>

                  {donorHistory.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] bg-slate-50 dark:bg-slate-900/10 p-4 rounded-2xl border border-[var(--border-color)] text-center">
                      No contribution records on file.
                    </p>
                  ) : (
                    <div className="space-y-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                      {donorHistory.map((d) => (
                        <div key={d.id} className="relative pl-6 space-y-1">
                          {/* Dot */}
                          <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-indigo"></span>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {formatCurrency(d.amount)} &bull; {d.payment_method}
                            </span>
                            <span className="text-[var(--text-muted)]">{formatDate(d.payment_date)}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            Receipt: {d.receipt_number} &bull; Campaign: {d.campaigns?.title || 'General'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[var(--border-color)] flex gap-3 bg-slate-50/50 dark:bg-slate-900/10">
                <button
                  onClick={handleOpenEdit}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiEdit2 size={12} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/15 font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiTrash2 size={12} />
                  <span>Remove Sponsor</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── ADD / EDIT DIALOG MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg border-[var(--border-color)] animate-fade-in-slide shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-5">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isEditing ? 'Modify Sponsor Details' : 'Register New Sponsor'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 mb-4">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Donor Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Occupation / Employer</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Postal Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                />
              </div>

              {!isEditing && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">General Registration Profile Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs active:scale-98 transition-all cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm border-[var(--border-color)] animate-fade-in-slide shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 animate-pulse">
              <FiAlertTriangle size={24} />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">Delete Donor Profile?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              This will permanently delete the profile card of <b>{selectedDonor?.name}</b> and all associated donation histories. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                No, Retain
              </button>
              <button
                onClick={handleDeleteDonor}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
