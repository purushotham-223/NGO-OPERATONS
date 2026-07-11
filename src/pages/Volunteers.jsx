import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  FiSearch, FiPlus, FiX, FiCheck, FiChevronRight, FiEdit2, FiTrash2,
  FiMail, FiPhone, FiCheckSquare, FiBriefcase, FiTag, FiAlertTriangle
} from 'react-icons/fi';

export default function Volunteers() {
  const { user } = useAuth();
  
  // Data states
  const [volunteers, setVolunteers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search / Filters state
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'Full-time' | 'Part-time' | 'Weekends'

  // Modal / Drawer States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Skills Tag field local state
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    availability: 'Full-time',
    assigned_campaign_id: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch volunteers
      const { data: volData } = await supabase
        .from('volunteers')
        .select('*, campaigns(title)')
        .order('name', { ascending: true });

      // 2. Fetch active campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('id, title')
        .eq('status', 'active');

      setVolunteers(volData || []);
      setCampaigns(campData || []);
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

  // Availability pill colors
  const availabilityColors = {
    'Full-time':  'bg-indigo-500/10 text-indigo-400 border-indigo-500/15',
    'Part-time':  'bg-blue-500/10 text-blue-400 border-blue-500/15',
    'Weekends':   'bg-amber-500/10 text-amber-400 border-amber-500/15',
  };

  // Search & Filtering Logic
  const filteredVolunteers = volunteers.filter(v => {
    const query = search.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(query) ||
      v.email.toLowerCase().includes(query) ||
      v.skills?.some(skill => skill.toLowerCase().includes(query));

    const matchesAvailability = availabilityFilter === 'all' || v.availability === availabilityFilter;

    return matchesSearch && matchesAvailability;
  });

  // Skills list chip handlers
  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skillsList.includes(val)) {
        setSkillsList(prev => [...prev, val]);
        setSkillInput('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(prev => prev.filter(s => s !== skillToRemove));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email) {
      setFormError('Please fill in required name and email.');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        availability: formData.availability,
        skills: skillsList,
        assigned_campaign_id: formData.assigned_campaign_id || null
      };

      if (isEditing) {
        // UPDATE
        const { error } = await supabase
          .from('volunteers')
          .update(payload)
          .eq('id', selectedVolunteer.id);

        if (error) throw error;

        logActivity(`Updated volunteer staff record: ${formData.name}`);
      } else {
        // CREATE
        const { error } = await supabase
          .from('volunteers')
          .insert([payload]);

        if (error) throw error;

        logActivity(`Enrolled a new volunteer staff profile: ${formData.name}`);
      }

      setShowFormModal(false);
      fetchInitialData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenEdit = (vol) => {
    setSelectedVolunteer(vol);
    setFormData({
      name: vol.name,
      email: vol.email,
      phone: vol.phone || '',
      availability: vol.availability || 'Full-time',
      assigned_campaign_id: vol.assigned_campaign_id || ''
    });
    setSkillsList(vol.skills || []);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleDeleteVolunteer = async () => {
    try {
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', selectedVolunteer.id);

      if (error) throw error;

      logActivity(`De-enrolled volunteer staff profile: ${selectedVolunteer.name}`);
      setShowDeleteConfirm(false);
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Volunteer Staff Network</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Directory and skill audit of non-profit operations forces</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => { setIsEditing(false); setSkillsList([]); setFormData({ name: '', email: '', phone: '', availability: 'Full-time', assigned_campaign_id: '' }); setShowFormModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus />
            <span>Register Volunteer</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative flex items-center sm:col-span-2">
          <FiSearch className="absolute left-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search volunteers by name, email or skills..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
          />
        </div>

        {/* Availability dropdown */}
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
        >
          <option value="all">All Availability</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Weekends">Weekends</option>
        </select>
      </div>

      {/* Grid of Volunteer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
            No volunteer staff matches criteria.
          </div>
        ) : (
          filteredVolunteers.map(vol => (
            <div
              key={vol.id}
              className="glass-card rounded-3xl p-6 border-[var(--border-color)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-64"
            >
              {/* Header */}
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-indigo/10 to-brand-violet/10 border border-brand-indigo/35 flex items-center justify-center text-brand-indigo font-bold text-sm flex-shrink-0">
                      {vol.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)] truncate max-w-[140px]">{vol.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${availabilityColors[vol.availability]}`}>
                    {vol.availability}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] pl-12 flex items-center gap-1.5 truncate">
                  <FiMail className="text-[var(--text-muted)] flex-shrink-0" />
                  <span>{vol.email}</span>
                </p>
                {vol.phone && (
                  <p className="text-xs text-[var(--text-secondary)] pl-12 flex items-center gap-1.5 truncate">
                    <FiPhone className="text-[var(--text-muted)] flex-shrink-0" />
                    <span>{vol.phone}</span>
                  </p>
                )}
              </div>

              {/* Skills Tags scrollable */}
              <div className="space-y-1.5 pt-3">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Acredited Skills</span>
                <div className="flex flex-wrap gap-1.5 max-h-12 overflow-y-auto pr-1">
                  {vol.skills && vol.skills.length > 0 ? (
                    vol.skills.map(skill => (
                      <span key={skill} className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/40 text-[var(--text-secondary)] font-medium border border-[var(--border-color)]">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic">No skills registered</span>
                  )}
                </div>
              </div>

              {/* Campaign connection details & actions footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)] mt-4">
                <div>
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-semibold">Assigned Campaign</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[150px] block">
                    {vol.campaigns?.title || 'No Allocation'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(vol)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-brand-violet transition-colors cursor-pointer"
                    title="Modify Volunteer"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => { setSelectedVolunteer(vol); setShowDeleteConfirm(true); }}
                    className="p-2 rounded-xl hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove Volunteer"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* REGISTER / EDIT MODAL DRAWER */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg border-[var(--border-color)] animate-fade-in-slide shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-5">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isEditing ? 'Modify Volunteer profile' : 'Register Volunteer staff'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 mb-4">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                {/* Email */}
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
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                {/* Availability */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Availability Profile</label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Weekends">Weekends</option>
                  </select>
                </div>
              </div>

              {/* Skills Multi Chip registration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Operational Skills tags (Press Enter to add)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    onBlur={handleAddSkill}
                    placeholder="e.g. Social Media, First Aid, Teaching"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all"
                  />
                </div>
                {/* Chips Grid list */}
                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {skillsList.map(s => (
                      <span key={s} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-violet/10 text-brand-violet text-xs font-semibold border border-brand-violet/15 animate-fade-in-slide">
                        <span>{s}</span>
                        <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-rose-500 cursor-pointer">
                          <FiX size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign to Campaign */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Assign to Active Campaign</label>
                <select
                  value={formData.assigned_campaign_id}
                  onChange={(e) => setFormData({ ...formData, assigned_campaign_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200 cursor-pointer"
                >
                  <option value="">No Active Allocation</option>
                  {campaigns.map(camp => (
                    <option key={camp.id} value={camp.id}>{camp.title}</option>
                  ))}
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
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
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">De-enroll Volunteer?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              This will permanently delete the staff record of <b>{selectedVolunteer?.name}</b>. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                No, Retain
              </button>
              <button
                onClick={handleDeleteVolunteer}
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
