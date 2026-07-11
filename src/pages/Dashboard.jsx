import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { 
  FiUsers, FiHeart, FiFlag, FiDollarSign, FiCheckSquare, FiClock, FiActivity,
  FiPlus, FiTrendingUp, FiArrowUpRight, FiUserPlus
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // KPI Stats
  const [stats, setStats] = useState({
    donors: 0,
    beneficiaries: 0,
    activeCampaigns: 0,
    totalDonations: 0,
    pendingTasks: 0,
    volunteers: 0
  });

  // Data states
  const [activityLogs, setActivityLogs] = useState([]);
  const [monthlyDonations, setMonthlyDonations] = useState({});
  const [campaignProgress, setCampaignProgress] = useState([]);
  const [taskStatusCounts, setTaskStatusCounts] = useState({ Pending: 0, 'In Progress': 0, Completed: 0 });

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime activity logs
    const channel = supabase
      .channel('activity_feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs'
      }, (payload) => {
        // Fetch new user metadata for details if possible
        setActivityLogs(prev => [payload.new, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPI Counts
      const [
        { count: donorsCount },
        { count: beneficiariesCount },
        { data: activeCampaignsData },
        { data: donationsData },
        { count: tasksCount },
        { count: volunteersCount }
      ] = await Promise.all([
        supabase.from('donors').select('*', { count: 'exact', head: true }),
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id, title, target_amount, collected_amount').eq('status', 'active'),
        supabase.from('donations').select('amount, payment_date'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('volunteers').select('*', { count: 'exact', head: true })
      ]);

      // Calculate total donation sum
      const totalDonatedSum = donationsData?.reduce((acc, d) => acc + Number(d.amount), 0) || 0;

      // Group monthly donations
      const monthlyData = {};
      donationsData?.forEach(d => {
        const date = new Date(d.payment_date);
        const month = date.toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + Number(d.amount);
      });

      // 2. Fetch Tasks Status breakdown
      const { data: allTasks } = await supabase.from('tasks').select('status');
      const taskCounts = { Pending: 0, 'In Progress': 0, Completed: 0 };
      allTasks?.forEach(t => {
        if (taskCounts[t.status] !== undefined) taskCounts[t.status]++;
      });

      // 3. Fetch Activity Logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      // Save counts
      setStats({
        donors: donorsCount || 0,
        beneficiaries: beneficiariesCount || 0,
        activeCampaigns: activeCampaignsData?.length || 0,
        totalDonations: totalDonatedSum || 0,
        pendingTasks: tasksCount || 0,
        volunteers: volunteersCount || 0
      });

      setMonthlyDonations(monthlyData);
      setCampaignProgress(activeCampaignsData || []);
      setTaskStatusCounts(taskCounts);
      setActivityLogs(logs || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Chart Data Configurations & Fallbacks ───
  
  // 1. Line Chart: Donations
  const lineLabels = Object.keys(monthlyDonations).length > 0 
    ? Object.keys(monthlyDonations) 
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const lineValues = Object.keys(monthlyDonations).length > 0 
    ? Object.values(monthlyDonations) 
    : [12000, 19000, 8500, 24000, 31000, 48000];

  const lineChartData = {
    labels: lineLabels,
    datasets: [{
      label: 'Donations',
      data: lineValues,
      borderColor: '#6366F1', // Indigo
      borderWidth: 3,
      pointBackgroundColor: '#8B5CF6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
        return gradient;
      },
      tension: 0.4
    }]
  };

  // 2. Bar Chart: Campaign collections vs targets
  const barLabels = campaignProgress.length > 0 
    ? campaignProgress.map(c => c.title.length > 15 ? c.title.slice(0, 15) + '...' : c.title)
    : ['Clean Water', 'Food Relief', 'Shelter Build', 'Child Education'];
  const targetValues = campaignProgress.length > 0 
    ? campaignProgress.map(c => c.target_amount)
    : [40000, 25000, 50000, 30000];
  const collectedValues = campaignProgress.length > 0 
    ? campaignProgress.map(c => c.collected_amount)
    : [31000, 18000, 42000, 12000];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Goal',
        data: targetValues,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 1.5,
        borderRadius: 8,
      },
      {
        label: 'Collected',
        data: collectedValues,
        backgroundColor: 'rgba(20, 184, 166, 0.75)', // Teal
        borderColor: '#14B8A6',
        borderWidth: 1.5,
        borderRadius: 8,
      }
    ]
  };

  // 3. Doughnut Chart: Task Status
  const taskTotals = Object.values(taskStatusCounts).reduce((a, b) => a + b, 0);
  const taskChartData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      data: taskTotals > 0 
        ? [taskStatusCounts.Pending, taskStatusCounts['In Progress'], taskStatusCounts.Completed] 
        : [5, 4, 12],
      backgroundColor: [
        'rgba(244, 63, 94, 0.8)', // Rose
        'rgba(245, 158, 11, 0.8)', // Amber
        'rgba(16, 185, 129, 0.8)'  // Emerald
      ],
      borderWidth: 0,
      hoverOffset: 6
    }]
  };

  // Render Card KPIs Helper
  const kpiDetails = [
    { label: 'Total Donors', value: stats.donors, icon: FiUsers, color: 'from-brand-indigo to-brand-violet', text: 'Active relations' },
    { label: 'Total Donations', value: formatCurrency(stats.totalDonations), icon: FiDollarSign, color: 'from-brand-teal to-brand-emerald', text: 'Lifetime value' },
    { label: 'Active Campaigns', value: stats.activeCampaigns, icon: FiFlag, color: 'from-brand-rose to-brand-amber', text: 'Fundraising runs' },
    { label: 'Beneficiaries Served', value: stats.beneficiaries, icon: FiHeart, color: 'from-purple-500 to-pink-500', text: 'Assistance logs' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: FiClock, color: 'from-amber-500 to-orange-500', text: 'Awaiting action' },
    { label: 'Volunteers', value: stats.volunteers, icon: FiUserPlus, color: 'from-blue-500 to-cyan-500', text: 'Staff force' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)]">
        <div>
          <h2 className="font-display font-bold text-2xl text-[var(--text-primary)]">
            Welcome back, {user?.user_metadata?.full_name || 'Staff Member'}!
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Here's the snapshot of operations and donation activities for today.
          </p>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="flex gap-3 mt-4 sm:mt-0 flex-wrap">
          {role !== 'volunteer' && (
            <>
              <a href="/donations" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-xs font-semibold hover:brightness-110 shadow-sm active:scale-95 transition-all cursor-pointer">
                <FiPlus />
                <span>Log Donation</span>
              </a>
              <a href="/campaigns" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-slate-100 dark:hover:bg-slate-800/40 text-xs font-semibold active:scale-95 transition-all cursor-pointer">
                <FiPlus />
                <span>Create Campaign</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Stats KPI Row Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiDetails.map((kpi, index) => (
          <div key={index} className="glass-card rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
                <kpi.icon className="text-white" size={18} />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+12.4%</span>
            </div>
            <p className="text-xl font-bold font-display text-[var(--text-primary)] truncate">{kpi.value}</p>
            <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{kpi.text}</p>
          </div>
        ))}
      </div>

      {/* Main Charts & Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donations Progress Chart Card */}
        <div className="glass-card rounded-3xl p-6 border-[var(--border-color)] lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Monthly Donations Summary</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Aggregate incoming funding trends</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand-indigo font-bold bg-brand-indigo/10 px-2.5 py-1 rounded-full">
              <FiTrendingUp />
              <span>Upswing</span>
            </div>
          </div>
          <div className="h-72 flex items-center justify-center">
            {loading ? (
              <div className="w-10 h-10 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Line 
                data={lineChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 10 } } }
                  }
                }} 
              />
            )}
          </div>
        </div>

        {/* Task Status Doughnut Chart Card */}
        <div className="glass-card rounded-3xl p-6 border-[var(--border-color)]">
          <div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Tasks Health Checklist</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Status breakdown of assignments</p>
          </div>
          <div className="h-56 mt-6 flex items-center justify-center relative">
            {loading ? (
              <div className="w-10 h-10 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Doughnut 
                  data={taskChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: { legend: { display: false } }
                  }} 
                />
                {/* Center Stats */}
                <div className="absolute flex flex-col items-center justify-center">
                  <p className="text-3xl font-extrabold font-display text-[var(--text-primary)]">
                    {taskTotals > 0 ? taskTotals : 21}
                  </p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Tasks</p>
                </div>
              </>
            )}
          </div>
          {/* Chart Legends */}
          <div className="grid grid-cols-3 gap-2 mt-6 text-center text-xs">
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>
              <span className="text-[var(--text-secondary)]">Pending</span>
            </div>
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span>
              <span className="text-[var(--text-secondary)]">Progress</span>
            </div>
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
              <span className="text-[var(--text-secondary)]">Done</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Progress Card */}
        <div className="glass-card rounded-3xl p-6 border-[var(--border-color)]">
          <div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Campaign Targets & Progress</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Manager performance metrics</p>
          </div>
          <div className="h-64 mt-6 flex items-center justify-center">
            {loading ? (
              <div className="w-10 h-10 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Bar 
                data={barChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748B', font: { size: 10 } } }
                  }
                }} 
              />
            )}
          </div>
        </div>

        {/* Live Activity Feed Log */}
        <div className="glass-card rounded-3xl p-6 border-[var(--border-color)] lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Live Operations Logs</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Real-time system updates & activity audits</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          </div>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2">
            {activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <FiActivity size={32} className="opacity-30 mb-3 animate-pulse" />
                <p className="text-sm">No activity recorded yet.</p>
                <p className="text-xs">Incoming changes appear here automatically.</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/20 border border-[var(--border-color)] hover:border-slate-300 dark:hover:border-slate-700/60 transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl bg-brand-indigo/10 flex items-center justify-center flex-shrink-0 text-brand-indigo">
                    <FiActivity size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)] leading-normal">
                      {log.activity}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                      {timeAgo(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
