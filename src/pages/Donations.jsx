import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import { 
  FiPlus, FiSearch, FiDollarSign, FiCalendar, FiCreditCard, FiCheckCircle, FiFileText,
  FiUserPlus, FiChevronRight, FiList, FiPieChart, FiGrid, FiAlertCircle
} from 'react-icons/fi';

export default function Donations() {
  const { user } = useAuth();
  
  // Data states
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorSearchQuery, setDonorSearchQuery] = useState('');
  const [donorSuggestions, setDonorSuggestions] = useState([]);
  
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQuickAddDonor, setShowQuickAddDonor] = useState(false);
  const [formError, setFormError] = useState(null);
  const [receiptNumber, setReceiptNumber] = useState('');

  // Quick Add Donor Form State
  const [quickDonor, setQuickDonor] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetchInitialData();
    generateReceiptNumber();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent donations
      const { data: donationsData } = await supabase
        .from('donations')
        .select('*, donors(name), campaigns(title)')
        .order('payment_date', { ascending: false })
        .limit(20);

      // 2. Fetch active campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title')
        .eq('status', 'active');

      setDonations(donationsData || []);
      setCampaigns(campaignsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  // Autocomplete search of donors
  const handleDonorSearchChange = async (e) => {
    const query = e.target.value;
    setDonorSearchQuery(query);
    setSelectedDonor(null);

    if (query.length < 2) {
      setDonorSuggestions([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('donors')
        .select('id, name, email')
        .ilike('name', `%${query}%`)
        .limit(5);
      
      setDonorSuggestions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDonor = (donor) => {
    setSelectedDonor(donor);
    setDonorSearchQuery(donor.name);
    setDonorSuggestions([]);
  };

  // Unique receipt number generator REC-YYYYMMDD-XXXX
  const generateReceiptNumber = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setReceiptNumber(`REC-${today}-${rand}`);
  };

  // Quick Add Donor Submit
  const handleQuickAddDonorSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!quickDonor.name || !quickDonor.email) {
      setFormError('Please enter a name and email.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('donors')
        .insert([quickDonor])
        .select()
        .single();

      if (error) throw error;

      setSelectedDonor(data);
      setDonorSearchQuery(data.name);
      setShowQuickAddDonor(false);
      logActivity(`Quick-registered a new donor profile: ${data.name}`);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Form Submit Donation
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDonor) {
      setFormError('Please select a registered donor (or quick-add a new one).');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError('Please enter a valid donation amount.');
      return;
    }

    try {
      const { error } = await supabase
        .from('donations')
        .insert([{
          donor_id: selectedDonor.id,
          campaign_id: selectedCampaignId || null,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_date: new Date(paymentDate).toISOString(),
          receipt_number: receiptNumber,
          notes: notes
        }]);

      if (error) throw error;

      // Log activity
      logActivity(`Recorded donation of ${formatCurrency(amount)} from donor ${selectedDonor.name}`);
      
      // Show Success Green Check
      setShowSuccess(true);

      // Reset Form fields
      setSelectedDonor(null);
      setDonorSearchQuery('');
      setSelectedCampaignId('');
      setAmount('');
      setNotes('');
      generateReceiptNumber();

      // Trigger list refresh
      fetchInitialData();

      // Clear success state after 2.5s
      setTimeout(() => {
        setShowSuccess(false);
      }, 2500);

    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Finance & Donations Ledger</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Log incoming contributions and assign funds to active campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT TRANSACTION LEDGER (55%) */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 border-[var(--border-color)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <FiList />
                <span>Transaction Feed</span>
              </h3>
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-full">
                Recent Contributions
              </span>
            </div>

            {/* Donation Grid Table */}
            <div className="overflow-y-auto max-h-[460px] pr-2 space-y-3.5">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : donations.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-muted)]">
                  No donations registered.
                </div>
              ) : (
                donations.map((d) => (
                  <div key={d.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/20 border border-[var(--border-color)] hover:border-slate-300 dark:hover:border-slate-700/60 transition-all duration-200 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{d.donors?.name}</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] px-1.5 py-0.5 rounded-md uppercase">
                          {d.payment_method}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate max-w-[200px]">
                        Campaign: {d.campaigns?.title || 'General Funding'}
                      </p>
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Receipt: {d.receipt_number}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-display text-brand-indigo block">
                        {formatCurrency(d.amount)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                        {formatDate(d.payment_date)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LOG DONATION FORM PANEL (45%) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 border-[var(--border-color)] relative">
          
          {/* Direct Success Overlay checkmark */}
          {showSuccess && (
            <div className="absolute inset-0 bg-[var(--bg-card)]/95 rounded-3xl flex flex-col items-center justify-center z-10 animate-fade-in-slide">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce mb-3 border border-emerald-500/35">
                <FiCheckCircle size={32} />
              </div>
              <p className="text-sm font-bold text-emerald-400">Contribution Logged Successfully</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Sponsor aggregates automatically synced.</p>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Record Contribution</h3>
            <span className="text-xs font-bold text-brand-violet bg-brand-violet/10 px-2.5 py-0.5 rounded-full">
              {receiptNumber}
            </span>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4">
              <FiAlertCircle size={14} className="flex-shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          {/* If quick add donor is triggered */}
          {showQuickAddDonor ? (
            <form onSubmit={handleQuickAddDonorSubmit} className="space-y-4 animate-page-enter">
              <div className="bg-slate-100/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-[var(--border-color)] mb-4">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Quick Register Donor</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={quickDonor.name}
                    onChange={(e) => setQuickDonor({ ...quickDonor, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:ring-1 focus:ring-brand-violet text-[var(--text-primary)] focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={quickDonor.email}
                    onChange={(e) => setQuickDonor({ ...quickDonor, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:ring-1 focus:ring-brand-violet text-[var(--text-primary)] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={quickDonor.phone}
                    onChange={(e) => setQuickDonor({ ...quickDonor, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:ring-1 focus:ring-brand-violet text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickAddDonor(false)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-violet text-white text-xs font-semibold hover:brightness-110 cursor-pointer"
                >
                  Register Donor
                </button>
              </div>
            </form>
          ) : (
            /* Record donation form */
            <form onSubmit={handleFormSubmit} className="space-y-4 animate-page-enter">
              
              {/* Donor Search */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Search Sponsor Profile</label>
                  <button
                    type="button"
                    onClick={() => { setFormError(null); setShowQuickAddDonor(true); }}
                    className="text-[10px] font-bold text-brand-violet hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FiUserPlus />
                    <span>Quick-Add New Donor</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <FiSearch className="absolute left-4 text-[var(--text-muted)] text-sm" />
                  <input
                    type="text"
                    value={donorSearchQuery}
                    onChange={handleDonorSearchChange}
                    placeholder="Type name to lookup registered donors..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {donorSuggestions.length > 0 && (
                  <div className="absolute top-[68px] left-0 right-0 glass-card border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden z-20 bg-[var(--bg-card)]">
                    {donorSuggestions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectDonor(s)}
                        className="px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer text-xs flex justify-between items-center text-[var(--text-secondary)]"
                      >
                        <span className="font-semibold text-[var(--text-primary)]">{s.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">{s.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Allocation</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer transition-all"
                >
                  <option value="">General NGO Operating Fund (Unallocated)</option>
                  {campaigns.map(camp => (
                    <option key={camp.id} value={camp.id}>{camp.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Donation Amount ($)</label>
                  <div className="relative flex items-center">
                    <FiDollarSign className="absolute left-4 text-[var(--text-muted)]" />
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
                    />
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer transition-all"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Log Date</label>
                <div className="relative flex items-center">
                  <FiCalendar className="absolute left-4 text-[var(--text-muted)]" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Contribution Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Receipt flags, employer matching details or physical check numbers..."
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-sm shadow-brand-indigo/10 flex justify-center items-center gap-1.5"
              >
                <FiCheckCircle />
                <span>Log Transaction Record</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
