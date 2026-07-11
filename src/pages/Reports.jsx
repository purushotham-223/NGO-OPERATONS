import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import { 
  FiFileText, FiCalendar, FiSearch, FiDownload, FiPrinter, FiGrid, FiList, FiAlertCircle 
} from 'react-icons/fi';
import Papa from 'papaparse';

export default function Reports() {
  const { user } = useAuth();
  
  // Input states
  const [reportType, setReportType] = useState('donations'); // 'donations' | 'campaigns' | 'volunteers' | 'beneficiaries'
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10) // default past 3 months
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  
  // Data states
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const logActivity = async (actionText) => {
    try {
      await supabase.from('activity_logs').insert([
        { user_id: user.id, activity: actionText }
      ]);
    } catch (e) {
      console.error('Error logging activity:', e);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReportData([]);
    setHasGenerated(true);

    try {
      let query;

      if (reportType === 'donations') {
        query = supabase
          .from('donations')
          .select('*, donors(name, email), campaigns(title)')
          .gte('payment_date', new Date(dateFrom).toISOString())
          .lte('payment_date', new Date(dateTo + 'T23:59:59').toISOString())
          .order('payment_date', { ascending: false });
      } else if (reportType === 'campaigns') {
        query = supabase
          .from('campaigns')
          .select('*')
          .gte('start_date', dateFrom)
          .lte('end_date', dateTo)
          .order('collected_amount', { ascending: false });
      } else if (reportType === 'volunteers') {
        query = supabase
          .from('volunteers')
          .select('*, campaigns(title)')
          .order('name', { ascending: true });
      } else if (reportType === 'beneficiaries') {
        query = supabase
          .from('beneficiaries')
          .select('*')
          .order('name', { ascending: true });
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setReportData(data || []);
      logActivity(`Generated "${reportType}" report from ${dateFrom} to ${dateTo}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CSV Export PapaParse
  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    let exportRows = [];

    if (reportType === 'donations') {
      exportRows = reportData.map(d => ({
        'Receipt Number': d.receipt_number,
        Donor: d.donors?.name || 'Unknown',
        Email: d.donors?.email || 'N/A',
        Campaign: d.campaigns?.title || 'General Fund',
        Amount: d.amount,
        'Payment Method': d.payment_method,
        Date: new Date(d.payment_date).toLocaleDateString()
      }));
    } else if (reportType === 'campaigns') {
      exportRows = reportData.map(c => ({
        Campaign: c.title,
        Category: c.category,
        Status: c.status,
        'Goal Amount ($)': c.target_amount,
        'Collected Amount ($)': c.collected_amount,
        'Start Date': c.start_date,
        'End Date': c.end_date
      }));
    } else if (reportType === 'volunteers') {
      exportRows = reportData.map(v => ({
        Volunteer: v.name,
        Email: v.email,
        Phone: v.phone || 'N/A',
        Availability: v.availability,
        Skills: v.skills?.join(', ') || 'None',
        'Assigned Campaign': v.campaigns?.title || 'None'
      }));
    } else if (reportType === 'beneficiaries') {
      exportRows = reportData.map(b => ({
        Name: b.name,
        Age: b.age,
        Gender: b.gender,
        Address: b.address,
        'Family Members': b.family_members,
        'Income Level ($/mo)': b.income_level,
        'Assistance Details': b.assistance_received || 'None'
      }));
    }

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_report_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logActivity(`Downloaded "${reportType}" report as CSV`);
  };

  const handleExportPDF = () => {
    window.print();
    logActivity(`Downloaded/Printed "${reportType}" report as PDF`);
  };

  // Sum total donations in preview
  const totalAmountSum = reportType === 'donations' 
    ? reportData.reduce((acc, curr) => acc + Number(curr.amount), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Search Header no-print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 glass-card rounded-3xl border-[var(--border-color)] no-print">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Reporting & Audit Exporter</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Filter operations databases, preview charts and download PDF/CSV formats</p>
        </div>
      </div>

      {/* Filter panel no-print */}
      <div className="glass-card p-6 rounded-3xl border-[var(--border-color)] no-print">
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Report Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Select Database</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet cursor-pointer transition-all"
            >
              <option value="donations">Donations Report</option>
              <option value="campaigns">Campaign Progress</option>
              <option value="volunteers">Volunteers Roster</option>
              <option value="beneficiaries">Beneficiaries Roster</option>
            </select>
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
              <FiCalendar />
              <span>Date From</span>
            </label>
            <input
              type="date"
              required
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
              <FiCalendar />
              <span>Date To</span>
            </label>
            <input
              type="date"
              required
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-violet transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-violet text-white font-semibold text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-sm shadow-brand-indigo/10 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <FiFileText />
                <span>Generate Preview</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error banner no-print */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs no-print">
          <FiAlertCircle size={14} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ─── PRINT ONLY HEADER ─── */}
      <div className="hidden print:flex justify-between items-start pb-6 border-b border-slate-700 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl uppercase tracking-tight">NGO Audit Reports Summary</h1>
          <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()} &bull; Period: {dateFrom} to {dateTo}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold capitalize">{reportType} Database Ledger</p>
          <p className="text-xs text-slate-500">Record count: {reportData.length}</p>
        </div>
      </div>

      {/* PREVIEW CONTAINER (Always renders, print styles handle visibility) */}
      {reportData.length > 0 && (
        <div className="space-y-4">
          
          {/* Actions Bar no-print */}
          <div className="flex justify-between items-center no-print">
            <span className="text-xs text-[var(--text-muted)] font-semibold">
              Previewing {reportData.length} records.
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors font-semibold cursor-pointer bg-[var(--bg-card)]"
              >
                <FiDownload size={13} />
                <span>Download CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors font-semibold cursor-pointer bg-[var(--bg-card)]"
              >
                <FiPrinter size={13} />
                <span>Print PDF Report</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-card rounded-3xl border-[var(--border-color)] overflow-hidden print:border-none print:glass-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse print-table">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold text-xs uppercase bg-slate-50/50 dark:bg-slate-900/10 print:bg-slate-100 print:text-black">
                    {reportType === 'donations' && (
                      <>
                        <th className="py-4 px-6">Receipt No</th>
                        <th className="py-4 px-6">Donor</th>
                        <th className="py-4 px-6">Campaign</th>
                        <th className="py-4 px-6">Method</th>
                        <th className="py-4 px-6 text-right">Amount</th>
                        <th className="py-4 px-6 text-center">Date</th>
                      </>
                    )}
                    {reportType === 'campaigns' && (
                      <>
                        <th className="py-4 px-6">Campaign Title</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Goal Target</th>
                        <th className="py-4 px-6 text-right">Collected</th>
                        <th className="py-4 px-6 text-center">End Date</th>
                      </>
                    )}
                    {reportType === 'volunteers' && (
                      <>
                        <th className="py-4 px-6">Name</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6">Availability</th>
                        <th className="py-4 px-6">Skills</th>
                        <th className="py-4 px-6">Assigned Campaign</th>
                      </>
                    )}
                    {reportType === 'beneficiaries' && (
                      <>
                        <th className="py-4 px-6">Beneficiary</th>
                        <th className="py-4 px-6">Age / Gender</th>
                        <th className="py-4 px-6">Address</th>
                        <th className="py-4 px-6 text-right">Income</th>
                        <th className="py-4 px-6 text-center">Family Count</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] text-sm">
                  {reportType === 'donations' && (
                    reportData.map((row) => (
                      <tr key={row.id}>
                        <td className="py-4 px-6 font-semibold">{row.receipt_number}</td>
                        <td className="py-4 px-6">{row.donors?.name}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.campaigns?.title || 'General Fund'}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.payment_method}</td>
                        <td className="py-4 px-6 text-right font-bold text-brand-indigo">{formatCurrency(row.amount)}</td>
                        <td className="py-4 px-6 text-center text-[var(--text-muted)]">{formatDate(row.payment_date)}</td>
                      </tr>
                    ))
                  )}
                  {reportType === 'campaigns' && (
                    reportData.map((row) => (
                      <tr key={row.id}>
                        <td className="py-4 px-6 font-semibold">{row.title}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.category}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)] capitalize">{row.status}</td>
                        <td className="py-4 px-6 text-right">{formatCurrency(row.target_amount)}</td>
                        <td className="py-4 px-6 text-right font-bold text-brand-indigo">{formatCurrency(row.collected_amount)}</td>
                        <td className="py-4 px-6 text-center text-[var(--text-muted)]">{formatDate(row.end_date)}</td>
                      </tr>
                    ))
                  )}
                  {reportType === 'volunteers' && (
                    reportData.map((row) => (
                      <tr key={row.id}>
                        <td className="py-4 px-6 font-semibold">{row.name}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.email}</td>
                        <td className="py-4 px-6">{row.availability}</td>
                        <td className="py-4 px-6 text-xs text-[var(--text-secondary)]">{row.skills?.join(', ') || '—'}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.campaigns?.title || 'Unassigned'}</td>
                      </tr>
                    ))
                  )}
                  {reportType === 'beneficiaries' && (
                    reportData.map((row) => (
                      <tr key={row.id}>
                        <td className="py-4 px-6 font-semibold">{row.name}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">{row.age} years &bull; {row.gender}</td>
                        <td className="py-4 px-6 text-[var(--text-secondary)] truncate max-w-[150px]">{row.address}</td>
                        <td className="py-4 px-6 text-right font-bold text-brand-indigo">{formatCurrency(row.income_level)}/mo</td>
                        <td className="py-4 px-6 text-center text-[var(--text-secondary)]">{row.family_members}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Donation total aggregates footer preview */}
            {reportType === 'donations' && (
              <div className="p-6 bg-slate-50/50 dark:bg-slate-900/10 border-t border-[var(--border-color)] flex justify-between items-center text-sm font-semibold print:bg-slate-100">
                <span className="text-[var(--text-secondary)]">Ledger Total Summary Sum</span>
                <span className="text-lg font-bold font-display text-brand-indigo">
                  {formatCurrency(totalAmountSum)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER INSTRUCTION CALLS no-print */}
      {!hasGenerated && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-center no-print">
          <FiFileText size={48} className="opacity-20 mb-4" />
          <p className="font-semibold text-sm">Awaiting Report Criteria</p>
          <p className="text-xs mt-1">Select a database source and log filters above to generate audits.</p>
        </div>
      )}

      {hasGenerated && reportData.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-center no-print">
          <FiFileText size={48} className="opacity-20 mb-4" />
          <p className="font-semibold text-sm">No Records Found</p>
          <p className="text-xs mt-1">There are no records in the selected database for the chosen date range.</p>
        </div>
      )}
    </div>
  );
}
