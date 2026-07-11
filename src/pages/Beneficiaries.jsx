import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import { 
  FiSearch, FiPlus, FiPrinter, FiX, FiCheck, FiChevronRight, FiEdit2, FiTrash2,
  FiUser, FiDollarSign, FiHeart, FiMapPin, FiSmile, FiMenu, FiAlertTriangle
} from 'react-icons/fi';

export default function Beneficiaries() {
  const { user, role } = useAuth();
  
  // Data states
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'Male' | 'Female' | 'Other'
  const [incomeSlider, setIncomeSlider] = useState(1500); // max monthly income filter
  const [ageFilter, setAgeFilter] = useState('all'); // 'all' | 'child' | 'youth' | 'adult' | 'senior'

  // Modal / Drawer States
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Step State
  const [formStep, setFormStep] = useState(1); // 1: Demographics, 2: Socio-Economics, 3: Support Logs
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Female',
    address: '',
    family_members: 1,
    income_level: '',
    assistance_received: '',
    notes: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setBeneficiaries(data || []);
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

  // Need rating categorizer
  const getNeedRating = (income) => {
    const inc = Number(income);
    if (inc < 300) {
      return { 
        label: 'Critical Need', 
        class: 'border-rose-500/20 text-rose-400 bg-rose-500/10', 
        dot: 'bg-rose-500 animate-pulse' 
      };
    }
    if (inc < 800) {
      return { 
        label: 'Moderate Need', 
        class: 'border-amber-500/20 text-amber-400 bg-amber-500/10', 
        dot: 'bg-amber-400' 
      };
    }
    return { 
      label: 'Stable Status', 
      class: 'border-emerald-500/20 text-emerald-400 bg-emerald-400/10', 
      dot: 'bg-emerald-400' 
    };
  };

  // Search & Filters Logic
  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase());
    
    const matchesGender = genderFilter === 'all' || b.gender === genderFilter;
    
    const matchesIncome = Number(b.income_level) <= incomeSlider;
    
    const matchesAge = ageFilter === 'all' ||
      (ageFilter === 'child' && b.age < 18) ||
      (ageFilter === 'youth' && b.age >= 18 && b.age < 30) ||
      (ageFilter === 'adult' && b.age >= 30 && b.age < 60) ||
      (ageFilter === 'senior' && b.age >= 60);

    return matchesSearch && matchesGender && matchesIncome && matchesAge;
  });

  // Print Case File Layout
  const handlePrintCaseFile = () => {
    window.print();
    logActivity(`Printed beneficiary case record for ${selectedBeneficiary.name}`);
  };

  const handleCardClick = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowDetailDialog(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate all steps data
    if (!formData.name || !formData.age || !formData.address || !formData.income_level) {
      setFormError('Please fill in all required demographic and economic fields.');
      return;
    }

    try {
      if (isEditing) {
        // UPDATE
        const { error } = await supabase
          .from('beneficiaries')
          .update({
            name: formData.name,
            age: parseInt(formData.age),
            gender: formData.gender,
            address: formData.address,
            family_members: parseInt(formData.family_members),
            income_level: parseFloat(formData.income_level),
            assistance_received: formData.assistance_received,
            notes: formData.notes
          })
          .eq('id', selectedBeneficiary.id);

        if (error) throw error;

        logActivity(`Updated assistance case logs for ${formData.name}`);
        setShowFormModal(false);
      } else {
        // CREATE
        const { error } = await supabase
          .from('beneficiaries')
          .insert([{
            name: formData.name,
            age: parseInt(formData.age),
            gender: formData.gender,
            address: formData.address,
            family_members: parseInt(formData.family_members),
            income_level: parseFloat(formData.income_level),
            assistance_received: formData.assistance_received,
            notes: formData.notes
          }]);

        if (error) throw error;

        logActivity(`Enrolled a new beneficiary: ${formData.name}`);
        setShowFormModal(false);
      }

      // Reset
      fetchBeneficiaries();
      setFormStep(1);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenEdit = () => {
    setFormData({
      name: selectedBeneficiary.name,
      age: selectedBeneficiary.age,
      gender: selectedBeneficiary.gender,
      address: selectedBeneficiary.address,
      family_members: selectedBeneficiary.family_members,
      income_level: selectedBeneficiary.income_level,
      assistance_received: selectedBeneficiary.assistance_received || '',
      notes: selectedBeneficiary.notes || ''
    });
    setIsEditing(true);
    setFormStep(1);
    setShowDetailDialog(false);
    setShowFormModal(true);
  };

  const handleDeleteBeneficiary = async () => {
    try {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', selectedBeneficiary.id);

      if (error) throw error;

      logActivity(`De-enrolled beneficiary profile: ${selectedBeneficiary.name}`);
      setShowDeleteConfirm(false);
      setShowDetailDialog(false);
      fetchBeneficiaries();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)] no-print">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Beneficiary Registry</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Demographics and economic records of families in need</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          {role !== 'volunteer' && (
            <button
              onClick={() => { setIsEditing(false); setFormStep(1); setFormData({ name: '', age: '', gender: 'Female', address: '', family_members: 1, income_level: '', assistance_received: '', notes: '' }); setShowFormModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <FiPlus />
              <span>Enroll Beneficiary</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter options */}
      <div className="glass-card p-6 rounded-3xl border-[var(--border-color)] space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Search</label>
            <div className="relative flex items-center">
              <FiSearch className="absolute left-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, address..."
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
              />
            </div>
          </div>

          {/* Age Filters */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Demographic Band</label>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
            >
              <option value="all">All Ages</option>
              <option value="child">Children (&lt; 18)</option>
              <option value="youth">Youth (18 - 29)</option>
              <option value="adult">Adults (30 - 59)</option>
              <option value="senior">Seniors (60+)</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
            >
              <option value="all">All Genders</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Income Slider Filter */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <span>Income Max Threshold</span>
              <span className="text-brand-violet font-display">{formatCurrency(incomeSlider)}/mo</span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={incomeSlider}
              onChange={(e) => setIncomeSlider(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-violet mt-3"
            />
          </div>
        </div>
      </div>

      {/* Grid List view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-rose border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
            No beneficiaries found matching criteria.
          </div>
        ) : (
          filteredBeneficiaries.map(ben => {
            const need = getNeedRating(ben.income_level);
            return (
              <div
                key={ben.id}
                onClick={() => handleCardClick(ben)}
                className="glass-card rounded-3xl p-6 border-[var(--border-color)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between h-56"
              >
                <div>
                  {/* Name and age */}
                  <div className="flex justify-between items-start">
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)] truncate pr-2">{ben.name}</h3>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold flex-shrink-0 uppercase bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-full">
                      Age {ben.age} &bull; {ben.gender}
                    </span>
                  </div>
                  {/* Address */}
                  <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
                    <FiMapPin className="text-[var(--text-muted)] flex-shrink-0" />
                    <span className="truncate">{ben.address}</span>
                  </p>
                  {/* Family count */}
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                    <FiSmile className="text-[var(--text-muted)]" />
                    <span>{ben.family_members} family member(s)</span>
                  </p>
                </div>

                {/* Need Rating Indicator bottom */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-semibold">Monthly Income</span>
                    <span className="text-sm font-bold font-display text-[var(--text-primary)]">
                      {formatCurrency(ben.income_level)}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-transparent ${need.class}`}>
                    <span className={`w-2 h-2 rounded-full ${need.dot}`}></span>
                    <span>{need.label}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── CASE FILE VIEW / PRINTER DIALOG ─── */}
      {showDetailDialog && selectedBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          {/* Print specific header container */}
          <div className="glass-card rounded-3xl p-8 w-full max-w-lg border-[var(--border-color)] shadow-2xl animate-fade-in-slide relative max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:glass-card print:p-0">
            
            {/* Header no-print */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-6 no-print">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">Case Record</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCaseFile}
                  className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
                  title="Print case report"
                >
                  <FiPrinter size={16} />
                </button>
                <button 
                  onClick={() => setShowDetailDialog(false)} 
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:flex print-header">
              <div>
                <h1 className="font-bold text-xl uppercase">NGO Beneficiary Case Record</h1>
                <p className="text-xs mt-1">Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">Status Profile</p>
                <p className="text-xs text-rose-500 font-bold">{getNeedRating(selectedBeneficiary.income_level).label}</p>
              </div>
            </div>

            {/* Demographic details */}
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-bold text-brand-violet uppercase tracking-wider mb-2">Demographic Summary</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-[var(--border-color)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Full Name</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedBeneficiary.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Age / Gender</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {selectedBeneficiary.age} years &bull; {selectedBeneficiary.gender}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Address</span>
                    <span className="text-sm text-[var(--text-secondary)] leading-normal">{selectedBeneficiary.address}</span>
                  </div>
                </div>
              </div>

              {/* Economic Summary */}
              <div>
                <h4 className="text-[10px] font-bold text-brand-violet uppercase tracking-wider mb-2">Socio-Economic Audit</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-[var(--border-color)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Household Members</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedBeneficiary.family_members} member(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Income per Month</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-display">{formatCurrency(selectedBeneficiary.income_level)}</span>
                  </div>
                </div>
              </div>

              {/* Assistance list */}
              <div>
                <h4 className="text-[10px] font-bold text-brand-violet uppercase tracking-wider mb-2">Assistance Log & Provided Support</h4>
                <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)] leading-relaxed min-h-16">
                  {selectedBeneficiary.assistance_received || 'No historical aid logged on file.'}
                </div>
              </div>

              {/* Case Notes */}
              <div>
                <h4 className="text-[10px] font-bold text-brand-violet uppercase tracking-wider mb-2">Socio-Worker Evaluation Notes</h4>
                <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)] leading-relaxed min-h-16">
                  {selectedBeneficiary.notes || 'No case worker notes added.'}
                </div>
              </div>

              {/* Verification signoff print only */}
              <div className="hidden print:block pt-16 border-t border-dashed mt-20">
                <div className="flex justify-between text-xs">
                  <div className="text-center w-40">
                    <p className="border-t border-black pt-2">Social Case Worker</p>
                  </div>
                  <div className="text-center w-40">
                    <p className="border-t border-black pt-2">NGO Executive Director</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer no-print */}
            {role !== 'volunteer' && (
              <div className="flex gap-3 pt-6 border-t border-[var(--border-color)] mt-6 no-print">
                <button
                  onClick={handleOpenEdit}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiEdit2 size={12} />
                  <span>Modify Record</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/15 font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiTrash2 size={12} />
                  <span>De-enroll</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MULTI STEP ENROLLMENT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg border-[var(--border-color)] animate-fade-in-slide shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-5">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isEditing ? 'Modify Case File' : 'Enroll New Assistance Case'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center mb-6 px-4">
              {[
                { step: 1, label: 'Demographics' },
                { step: 2, label: 'Economic' },
                { step: 3, label: 'Support Log' }
              ].map(s => (
                <div key={s.step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all
                    ${formStep >= s.step 
                      ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)]'
                    }`}
                  >
                    {formStep > s.step ? <FiCheck /> : s.step}
                  </div>
                  {s.step < 3 && (
                    <div className={`h-1 w-12 sm:w-16 mx-2 transition-colors
                      ${formStep > s.step ? 'bg-brand-violet' : 'bg-slate-200 dark:bg-slate-800'}`}
                    ></div>
                  )}
                </div>
              ))}
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 mb-4">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* STEP 1: DEMOGRAPHICS */}
              {formStep === 1 && (
                <div className="space-y-4 animate-page-enter">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Age</label>
                      <input
                        type="number"
                        required
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Postal Address</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: SOCIO ECONOMIC */}
              {formStep === 2 && (
                <div className="space-y-4 animate-page-enter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Household Members</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.family_members}
                        onChange={(e) => setFormData({ ...formData, family_members: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Monthly Household Income ($)</label>
                      <input
                        type="number"
                        required
                        value={formData.income_level}
                        onChange={(e) => setFormData({ ...formData, income_level: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ASSISTANCE & LOGS */}
              {formStep === 3 && (
                <div className="space-y-4 animate-page-enter">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Aid Provided to Date</label>
                    <textarea
                      value={formData.assistance_received}
                      onChange={(e) => setFormData({ ...formData, assistance_received: e.target.value })}
                      placeholder="e.g. food packages, educational scholarship, healthcare checkup logs..."
                      rows={3}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">General Evaluation case worker notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev - 1)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
                  >
                    Previous
                  </button>
                )}
                {formStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev + 1)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs active:scale-98 transition-all cursor-pointer"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs active:scale-98 transition-all cursor-pointer"
                  >
                    Save Case File
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DE-ENROLL CONFIRMATION DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm border-[var(--border-color)] animate-fade-in-slide shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 animate-pulse">
              <FiAlertTriangle size={24} />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">De-enroll Beneficiary?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              This will permanently delete the assistance file of <b>{selectedBeneficiary?.name}</b> and remove them from the system. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                No, Retain
              </button>
              <button
                onClick={handleDeleteBeneficiary}
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
