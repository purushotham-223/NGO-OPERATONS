import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { 
  FiSearch, FiPlus, FiX, FiCheck, FiChevronRight, FiEdit2, FiTrash2,
  FiCalendar, FiUser, FiFlag, FiClock, FiAlertTriangle, FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';

export default function Tasks() {
  const { user, role } = useAuth();
  
  // Data states
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Medium',
    due_date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    campaign_id: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [user, role]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch tasks based on user role
      let tasksQuery = supabase
        .from('tasks')
        .select('*, assigned_to:users(full_name, email), campaigns(title)');

      if (role === 'volunteer' && user) {
        tasksQuery = tasksQuery.eq('assigned_to', user.id);
      }

      const { data: tasksData } = await tasksQuery.order('due_date', { ascending: true });

      // 2. Fetch users for assign dropdown (Admin/Manager only)
      if (role !== 'volunteer') {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .order('full_name', { ascending: true });
        setUsers(usersData || []);
      }

      // 3. Fetch active campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title')
        .eq('status', 'active');

      setTasks(tasksData || []);
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

  // Status updates for drag / click transitions
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      const targetTask = tasks.find(t => t.id === taskId);
      logActivity(`Updated status of task "${targetTask?.title}" to "${newStatus}"`);
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title || !formData.due_date) {
      setFormError('Please fill in task title and due date.');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assigned_to || null,
        priority: formData.priority,
        due_date: formData.due_date,
        status: formData.status,
        campaign_id: formData.campaign_id || null
      };

      if (isEditing) {
        // UPDATE
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', selectedTask.id);

        if (error) throw error;

        logActivity(`Modified details on task card: "${formData.title}"`);
      } else {
        // CREATE
        const { error } = await supabase
          .from('tasks')
          .insert([payload]);

        if (error) throw error;

        logActivity(`Assigned new task assignment: "${formData.title}"`);
      }

      setShowFormModal(false);
      fetchInitialData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to?.id || task.assigned_to || '',
      priority: task.priority,
      due_date: task.due_date,
      status: task.status,
      campaign_id: task.campaign_id || ''
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleDeleteTask = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      logActivity(`Deleted task assignment: "${selectedTask.title}"`);
      setShowDeleteConfirm(false);
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  // Category priority styles
  const priorityBadges = {
    High:   'bg-rose-500/10 text-rose-400 border-rose-500/15',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/15',
    Low:    'bg-slate-500/10 text-[var(--text-secondary)] border-[var(--border-color)]'
  };

  // Helper check overdue
  const checkOverdue = (task) => {
    return new Date(task.due_date) < new Date() && task.status !== 'Completed';
  };

  // Filter tasks by columns
  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Operations Task Board</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Assign volunteer workloads, evaluate deliverables and log completions</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          {role !== 'volunteer' && (
            <button
              onClick={() => { setIsEditing(false); setFormData({ title: '', description: '', assigned_to: '', priority: 'Medium', due_date: new Date().toISOString().slice(0, 10), status: 'Pending', campaign_id: '' }); setShowFormModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <FiPlus />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER VIEWS BASED ON ROLES */}
      {role === 'volunteer' ? (
        /* VOLUNTEER LIST PORTAL VIEW */
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">My Task Queue</h3>
            <span className="text-xs font-semibold text-brand-violet bg-brand-violet/10 px-2.5 py-0.5 rounded-full">
              {tasks.length} task(s) assigned
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
              You have no active task assignments. Enjoy your day!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map(task => {
                const overdue = checkOverdue(task);
                return (
                  <div
                    key={task.id}
                    className={`glass-card rounded-2xl p-5 border-[var(--border-color)] flex flex-col justify-between h-48 transition-all duration-300
                      ${overdue ? 'ring-2 ring-rose-500/50 animate-pulse-border' : ''}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate max-w-[200px]">{task.title}</h4>
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${priorityBadges[task.priority]}`}>
                          {task.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                        {task.description || 'No description provided.'}
                      </p>
                      {task.campaigns?.title && (
                        <p className="text-[10px] text-brand-indigo font-semibold mt-1">
                          Campaign: {task.campaigns.title}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <FiCalendar />
                        {overdue ? <span className="text-rose-400 font-semibold">Overdue ({formatDate(task.due_date)})</span> : formatDate(task.due_date)}
                      </span>

                      {/* State update quick clicks */}
                      <div className="flex gap-1.5">
                        {['Pending', 'In Progress', 'Completed'].map(state => (
                          <button
                            key={state}
                            onClick={() => handleUpdateStatus(task.id, state)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all duration-200 cursor-pointer
                              ${task.status === state
                                ? 'bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                              }`}
                          >
                            {state}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MANAGER / ADMIN KANBAN COLUMN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Columns map */}
          {['Pending', 'In Progress', 'Completed'].map(columnStatus => {
            const columnTasks = getTasksByStatus(columnStatus);
            return (
              <div 
                key={columnStatus}
                className="glass-card rounded-3xl p-5 border-[var(--border-color)] space-y-4 bg-slate-50/20 dark:bg-slate-900/5 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                  <h3 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                    <FiCheckSquare className={columnStatus === 'Completed' ? 'text-emerald-500' : 'text-brand-violet'} />
                    <span>{columnStatus}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task List container */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="py-6 text-center">
                      <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-color)] rounded-2xl">
                      Empty column
                    </div>
                  ) : (
                    columnTasks.map(task => {
                      const overdue = checkOverdue(task);
                      return (
                        <div
                          key={task.id}
                          className={`glass-card rounded-2xl p-4 border-[var(--border-color)] space-y-3 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer task-card-enter
                            ${overdue ? 'ring-2 ring-rose-500/50 animate-pulse-border' : ''}`}
                        >
                          {/* Card Top Title & Badge */}
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-xs text-[var(--text-primary)] line-clamp-2 leading-relaxed">{task.title}</h4>
                            <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full flex-shrink-0 uppercase ${priorityBadges[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Description snippet */}
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {task.description || 'No description listed.'}
                          </p>

                          {/* Campaign link */}
                          {task.campaigns?.title && (
                            <p className="text-[9px] text-brand-indigo font-bold bg-brand-indigo/10 px-2 py-0.5 rounded-full inline-block">
                              📌 {task.campaigns.title}
                            </p>
                          )}

                          {/* Card bottom details */}
                          <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                            <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 font-semibold">
                              <FiCalendar />
                              {overdue ? <span className="text-rose-400">Overdue</span> : formatDate(task.due_date)}
                            </span>

                            {/* Assignee initials avatar */}
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-indigo to-brand-violet text-white text-[9px] font-black flex items-center justify-center shadow-sm" title={task.assigned_to?.full_name || 'Unassigned'}>
                                {task.assigned_to?.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            </div>
                          </div>

                          {/* Card Managers control buttons */}
                          <div className="flex gap-2 justify-end pt-1">
                            {/* Move status button links */}
                            {columnStatus !== 'Pending' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, columnStatus === 'Completed' ? 'In Progress' : 'Pending'); }}
                                className="text-[9px] text-brand-indigo font-bold hover:underline cursor-pointer"
                              >
                                &larr; Back
                              </button>
                            )}
                            {columnStatus !== 'Completed' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, columnStatus === 'Pending' ? 'In Progress' : 'Completed'); }}
                                className="text-[9px] text-brand-indigo font-bold hover:underline cursor-pointer"
                              >
                                Move &rarr;
                              </button>
                            )}
                            <div className="flex-1"></div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }}
                              className="text-[9px] text-[var(--text-secondary)] hover:text-brand-violet cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowDeleteConfirm(true); }}
                              className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md border-[var(--border-color)] animate-fade-in-slide shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)] mb-5">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                {isEditing ? 'Modify Task Details' : 'Create Task Assignment'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <FiX size={18} />
              </button>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 mb-4">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Gather donor leaflets"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-violet text-sm text-[var(--text-primary)] transition-all duration-200"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Task Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional contextual details..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                {/* Due Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assign to user */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Assign Staff</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
                  >
                    <option value="">Awaiting Allocation</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                {/* Campaign link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Link</label>
                  <select
                    value={formData.campaign_id}
                    onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
                  >
                    <option value="">None</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status (Edit only) */}
              {isEditing && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

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
                  Save Task
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
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">Delete Task Assignment?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              This will permanently delete the task card of <b>{selectedTask?.title}</b>. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs active:scale-98 transition-all cursor-pointer"
              >
                No, Retain
              </button>
              <button
                onClick={handleDeleteTask}
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
