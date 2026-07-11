import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import { 
  FiSearch, FiPlus, FiX, FiCheck, FiChevronRight, FiEdit2, FiTrash2,
  FiUploadCloud, FiCalendar, FiFlag, FiTarget, FiActivity, FiAlertTriangle
} from 'react-icons/fi';

export default function Campaigns() {
  const { user, role } = useAuth();
  
  // Data states
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'planning' | 'active' | 'completed' | 'cancelled'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal / Drawer States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // File Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Education',
    target_amount: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    banner_image_url: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
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

  // Status mapping styles
  const statusStyles = {
    planning:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  // Search & Filters Logic
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Unique categories for filtering
  const categories = ['Education', 'Disaster Relief', 'Healthcare', 'Food Security', 'Community Development'];

  // Storage Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError(null);

    try {
      // 1. Create a unique path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // 2. Upload image to Supabase storage bucket `campaign-banners`
      const { error: uploadError } = await supabase.storage
        .from('campaign-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-banners')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, banner_image_url: publicUrl }));
      setImagePreview(publicUrl);

    } catch (err) {
      setFormError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!formData.title || !formData.target_amount || !formData.start_date || !formData.end_date) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        target_amount: parseFloat(formData.target_amount),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        banner_image_url: formData.banner_image_url
      };

      if (isEditing) {
        // UPDATE
        const { error } = await supabase
          .from('campaigns')
          .update(payload)
          .eq('id', selectedCampaign.id);

        if (error) throw error;

        logActivity(`Updated fundraising campaign: "${formData.title}"`);
      } else {
        // CREATE
        const { error } = await supabase
          .from('campaigns')
          .insert([payload]);

        if (error) throw error;

        logActivity(`Launched new fundraising campaign: "${formData.title}"`);
      }

      setShowFormModal(false);
      fetchCampaigns();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      title: campaign.title,
      description: campaign.description || '',
      category: campaign.category,
      target_amount: campaign.target_amount,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      status: campaign.status,
      banner_image_url: campaign.banner_image_url || ''
    });
    setImagePreview(campaign.banner_image_url || null);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleDeleteCampaign = async () => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      logActivity(`Deleted fundraising campaign card: "${selectedCampaign.title}"`);
      setShowDeleteConfirm(false);
      fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Fundraising Campaigns</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Organize funding targets, progress metrics and allocations</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          {role !== 'volunteer' && (
            <button
              onClick={() => { setIsEditing(false); setFormData({ title: '', description: '', category: 'Education', target_amount: '', start_date: '', end_date: '', status: 'planning', banner_image_url: '' }); setImagePreview(null); setShowFormModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <FiPlus />
              <span>Create Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative flex items-center">
          <FiSearch className="absolute left-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all duration-200"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Campaigns Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
            No fundraising campaigns listed.
          </div>
        ) : (
          filteredCampaigns.map(camp => {
            const progress = camp.target_amount > 0 
              ? Math.min(100, Math.round((Number(camp.collected_amount) / Number(camp.target_amount)) * 100))
              : 0;

            const daysLeft = Math.max(0, Math.ceil((new Date(camp.end_date) - new Date()) / (1000 * 60 * 60 * 24)));

            return (
              <div
                key={camp.id}
                className="glass-card rounded-3xl border-[var(--border-color)] overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Banner Header Image */}
                <div className="relative h-44 bg-slate-200 dark:bg-slate-800">
                  {camp.banner_image_url ? (
                    <img
                      src={camp.banner_image_url}
                      alt={camp.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-indigo/30 to-brand-violet/30 flex items-center justify-center text-brand-indigo">
                      <FiFlag size={32} className="opacity-40 animate-pulse" />
                    </div>
                  )}
                  {/* Category overlay */}
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/60 text-white backdrop-blur-xs">
                    {camp.category}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-display font-bold text-base text-[var(--text-primary)] line-clamp-1">{camp.title}</h3>
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full capitalize ${statusStyles[camp.status]}`}>
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed h-8">
                      {camp.description || 'No campaign descriptions provided.'}
                    </p>
                  </div>

                  {/* Funding Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end text-xs font-semibold">
                      <span className="text-[var(--text-primary)] font-bold">{progress}% funded</span>
                      <span className="text-[var(--text-muted)]">
                        {formatCurrency(camp.collected_amount)} / {formatCurrency(camp.target_amount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-indigo to-brand-violet rounded-full progress-bar"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Bottom details & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <FiCalendar className="text-[var(--text-muted)]" />
                      <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Completed'}</span>
                    </div>
                    
                    {role !== 'volunteer' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(camp)}
                          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-brand-violet transition-colors cursor-pointer"
                          title="Modify details"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => { setSelectedCampaign(camp); setShowDeleteConfirm(true); }}
                          className="p-2 rounded-xl hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Remove Campaign"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL DRAW */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg border-[var(--border-color)] animate-fade-in-slide shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-5">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isEditing ? 'Modify Campaign Card' : 'Launch Fundraising Campaign'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 mb-4">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Image banner upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Banner Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] overflow-hidden flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <FiUploadCloud size={20} />
                      </div>
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[var(--border-color)] hover:border-brand-violet cursor-pointer transition-colors duration-200">
                    <FiUploadCloud className="text-[var(--text-muted)] mb-1" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                      {uploadingImage ? 'Uploading image...' : 'Upload Image Banner'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Save the Forest Relief"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed goals, allocation targets and promotional resources..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Funding Goal ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Category Type</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Action Buttons */}
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
                  Save Campaign
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
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">Delete Campaign Card?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              This will permanently delete the fundraising campaign card of <b>{selectedCampaign?.title}</b>. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                No, Retain
              </button>
              <button
                onClick={handleDeleteCampaign}
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
