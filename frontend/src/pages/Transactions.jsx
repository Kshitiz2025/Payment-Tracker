import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { requestAI } from '../api';
import { exportLedger, monthKey } from '../ledgerTools';
import { groupSpending, money, paymentTags } from '../ledger';
import { 
  Search, Filter, Download, Sparkles, Trash2, ChevronLeft, ChevronRight, 
  Calendar, CheckSquare, Square, Tag, ChevronDown, Plus, 
  Plane, Home, Coffee, Cloud, ArrowDownLeft, X
} from 'lucide-react';

export default function Transactions({ aiTone }) {
  const { payments, deletedPayments, openPayment, editPayment, changeDeleted } = useOutletContext();

  // Filtering & Pagination State
 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterMode, setFilterMode] = useState('All Modes');
  const [activeTag, setActiveTag] = useState('all');
  const [period, setPeriod] = useState('');
  const [trash, setTrash] = useState(false);
  const [undo, setUndo] = useState(null);
  const [changing, setChanging] = useState(false);
  const [requestedPage, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  const ledger = trash ? deletedPayments : payments;
  const months = [...new Set(ledger.map(row => monthKey(new Date(row.created_at)).slice(0,7)))].sort().reverse();
  const allTags = [...new Set(ledger.flatMap(paymentTags))];
  const filtered = ledger.filter(row => {
    const description = [row.sub_category, row.label].filter(Boolean).join(' ').toLowerCase();
    return (!period || monthKey(new Date(row.created_at)).startsWith(period)) && description.includes(searchTerm.trim().toLowerCase())
      && (filterCategory === 'All Categories' || row.category === filterCategory)
      && (filterMode === 'All Modes' || row.payment_mode === filterMode)
      && (activeTag === 'all' || paymentTags(row).includes(activeTag));
  });
  const totalCount = filtered.length;
  const page = Math.min(requestedPage, Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1));
  const transactions = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Selection Logic
  const toggleSelectAll = () => {
    const ids = transactions.map(tx => tx.id);
    setSelectedIds(current => ids.every(id => current.includes(id))
      ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(item => item !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // UI Helpers
  const getCategoryStyles = (category) => {
    switch(category?.toLowerCase()) {
      case 'travel': return { icon: Plane, bg: 'bg-blue-wash', text: 'text-blue-ink' };
      case 'housing & rent': return { icon: Home, bg: 'bg-amber-wash', text: 'text-amber-ink' };
      case 'food & dining': return { icon: Coffee, bg: 'bg-emerald-wash', text: 'text-emerald-ink' };
      case 'software': return { icon: Cloud, bg: 'bg-purple-wash', text: 'text-purple-ink' };
      case 'income / refund': 
      case 'income / allowance': return { icon: ArrowDownLeft, bg: 'bg-green-wash', text: 'text-green-ink' };
      default: return { icon: Tag, bg: 'bg-muted', text: 'text-secondary' };
    }
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const selected = filtered.filter(row => selectedIds.includes(row.id));
  async function changeRows(ids, restore, stamp) {
    if (!ids.length || changing) return;
    setChanging(true);
    try {
      const result = await changeDeleted(ids, restore, stamp);
      setUndo(!restore && result.ids.length ? result : null);
      setSelectedIds([]);
    } catch { alert('Could not update these payments. Please refresh and try again.'); }
    finally { setChanging(false); }
  }

  const handleAIReport = async () => {
    setIsAnalyzing(true);
    try {
      // Use transaction_type to exclude incoming money from spending analysis
      const groups = groupSpending(filtered.filter(row => row.transaction_type === 'expense'), row => row.category || 'Other')
        .map(group => ({ category: group.name, total: group.value, count: group.txCount }));
      const data = await requestAI('analyze', { groups, tone: aiTone });
      setAiReport(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto bg-surface rounded-2xl shadow-sm border border-outline overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-divider">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-heading">Transaction History</h1>
                <span className="bg-muted text-quiet text-xs font-bold px-2 py-1 rounded-md">v2.4</span>
              </div>
              <p className="text-quiet mt-1">Search, filter, and analyze your payment logs.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={openPayment}
                className="bg-surface border border-outline text-indigo-ink px-4 py-2.5 rounded-xl font-semibold hover:bg-subtle transition-all flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Add Payment
              </button>
              <button onClick={() => exportLedger(filtered)} disabled={!filtered.length} className="bg-surface border border-outline text-body px-4 py-2.5 rounded-xl font-semibold hover:bg-subtle transition-all flex items-center gap-2 text-sm">
                <Download size={16} /> Export CSV
              </button>
              <button type="button" aria-pressed={trash} onClick={() => { setTrash(!trash); setPage(0); setSelectedIds([]); setPeriod(''); setActiveTag('all'); setFilterMode('All Modes'); setFilterCategory('All Categories'); setSearchTerm(''); }} className="px-3 text-sm font-semibold text-secondary">
                {trash ? 'View active payments' : 'Deleted payments'}
              </button>
              <div className="relative">
                <span className="absolute -top-2.5 -right-2 bg-pink-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm z-10">AI HOOK</span>
               <button 
                  onClick={handleAIReport}
                  disabled={isAnalyzing || trash || !filtered.some(row => row.transaction_type === 'expense')}
                  className="bg-[#4f46e5] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#4338ca] shadow-lg shadow-brand-shadow transition-all flex items-center gap-2 text-sm relative disabled:opacity-75"
                >
                  <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} /> 
                  {isAnalyzing ? 'Analyzing...' : 'Generate AI Report'}
                </button>
              </div>
            </div>
          </div>

          <p className="mb-3 text-sm text-secondary">AI reports share only category totals and counts with Gemini or Groq.</p>
          {trash && <h2 className="text-lg font-bold">Deleted payments</h2>}
          {undo && <p role="status" className="p-2">{undo.ids.length} payment(s) moved to deleted payments. <button disabled={changing} className="underline" onClick={() => changeRows(undo.ids, true, undo.stamp)}>Undo</button></p>}
          {/* Controls Bar */}
          <div className="flex flex-col xl:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search expenses (e.g., IRCTC, IndiGo, Hostel rent, Maggi)..." 
                className="w-full bg-surface border border-outline rounded-xl py-2.5 pl-10 pr-12 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-block bg-muted border border-outline rounded px-1.5 text-[10px] font-semibold text-quiet">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0">
              <select aria-label="Payment period" className="rounded-xl bg-surface border border-outline p-2" value={period} onChange={e => { setPeriod(e.target.value); setPage(0); }}>
                <option value="">All dates</option>
                {months.map(month => <option key={month}>{month}</option>)}
              </select>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-4 h-4 pointer-events-none" />
                <select 
                  className="bg-surface border border-outline rounded-xl py-2.5 pl-9 pr-8 text-sm font-medium text-body focus:outline-none appearance-none hover:bg-subtle cursor-pointer"
                  value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
                >
                  <option>All Categories</option>
                  {[...new Set(ledger.map(tx => tx.category).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-hint pointer-events-none" />
              </div>
              <div className="relative">
                <select 
                  className="bg-surface border border-outline rounded-xl py-2.5 pl-4 pr-8 text-sm font-medium text-body focus:outline-none appearance-none hover:bg-subtle cursor-pointer"
                  value={filterMode} onChange={(e) => { setFilterMode(e.target.value); setPage(0); }}
                >
                  <option>All Modes</option>
                  {[...new Set(ledger.map(tx => tx.payment_mode).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-hint pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Tags Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-hint uppercase tracking-wider mr-2"># Quick Tags:</span>
              {['all', ...allTags].map(tag => (
                <button 
                  key={tag} onClick={() => { setActiveTag(tag); setPage(0); }}
                  className={`px-3 py-1 rounded-full font-medium transition-colors border ${
                    activeTag === tag 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-surface text-secondary border-outline hover:bg-subtle'
                  }`}
                >
                  {tag} {tag === 'all' && <span className="ml-1 opacity-70 text-[10px] bg-black/20 px-1.5 rounded">{totalCount}</span>}
                </button>
              ))}
              <button className="px-3 py-1 rounded-full font-medium text-indigo-ink bg-indigo-wash hover:bg-indigo-tint transition-colors border border-indigo-tint flex items-center gap-1">
                <Plus size={14} /> New Tag
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-quiet">
              Quick Amount: 
              <button className="border border-outline rounded px-2 py-1 hover:bg-subtle">&gt; ₹1,000</button>
              <button className="border border-outline rounded px-2 py-1 hover:bg-subtle">&gt; ₹5,000</button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when selected) */}
        {selected.length > 0 && (
          <div className="bg-indigo-wash/80 border-b border-indigo-tint px-6 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                {selected.length}
              </div>
              <span className="text-sm font-semibold text-indigo-ink">Transactions selected across current query</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportLedger(selected)} className="text-xs font-semibold text-indigo-ink bg-surface px-3 py-1.5 rounded-lg">
                <Download size={14} /> Export
              </button>
              <button disabled={changing} onClick={() => changeRows(selected.map(row => row.id), trash)} className="text-xs font-semibold text-red-ink bg-surface border border-red-tint px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-wash flex items-center gap-1.5">
                <Trash2 size={14} /> {trash ? 'Restore' : 'Delete'}
              </button>
              <button onClick={() => setSelectedIds([])} className="text-xs font-medium text-quiet px-3 hover:text-heading">
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-divider text-xs font-bold text-hint uppercase tracking-wider bg-subtle/30">
                <th className="py-4 px-6 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-hint hover:text-indigo-ink transition-colors">
                    {transactions.length > 0 && transactions.every(row => selectedIds.includes(row.id)) ? <CheckSquare size={18} className="text-indigo-ink" /> : <Square size={18} />}
                  </button>
                </th>
                <th className="py-4 px-4 font-medium">Date</th>
                <th className="py-4 px-4 font-medium w-1/4">Details & Sub-Item</th>
                <th className="py-4 px-4 font-medium w-1/5">Labels / Notes</th>
                <th className="py-4 px-4 font-medium">Tags</th>
                <th className="py-4 px-4 font-medium">Category</th>
                <th className="py-4 px-4 font-medium">Payment Mode</th>
                <th className="py-4 px-6 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {transactions.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-hint font-medium">No transactions match your filters.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  const catStyle = getCategoryStyles(tx.category);
                  const isPositive = tx.transaction_type === 'income';

                  return (
                    <tr key={tx.id} className={`hover:bg-subtle transition-colors ${isSelected ? 'bg-indigo-wash/30' : ''}`}>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => toggleSelect(tx.id)} className="text-hint hover:text-indigo-ink transition-colors">
                          {isSelected ? <CheckSquare size={18} className="text-indigo-ink" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-medium text-quiet">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-hint" />
                          {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-heading text-sm truncate">{tx.sub_category || 'General'}</p>
                        {trash ? <button disabled={changing} className="text-xs text-indigo-ink underline" onClick={() => changeRows([tx.id], true)}>Restore</button>
                          : <button className="text-xs text-indigo-ink underline" onClick={() => editPayment(tx)}>Edit payment</button>}
                        <p className="text-[11px] text-quiet mt-0.5 truncate">{tx.upi_app || tx.payment_mode || '—'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-xs text-quiet italic truncate max-w-[180px]">{tx.label || '—'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-emerald-wash border border-emerald-tint text-emerald-ink px-2 py-0.5 rounded text-[10px] font-bold">
                          {paymentTags(tx).join(' ') || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${catStyle.bg} ${catStyle.text}`}>
                          <catStyle.icon size={12} />
                          {tx.category}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs text-body font-medium">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${tx.payment_mode === 'UPI' ? 'bg-purple-tint text-purple-ink' : 'bg-blue-tint text-blue-ink'}`}>
                            {tx.payment_mode?.charAt(0)}
                          </div>
                          {tx.payment_mode} {tx.upi_app ? `(${tx.upi_app})` : ''}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <p className={`font-extrabold text-sm ${isPositive ? 'text-emerald-ink' : 'text-heading'}`}>
                          {isPositive ? '+' : '-'}{money(Math.abs(tx.amount))}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination */}
        <div className="p-4 border-t border-divider flex flex-col sm:flex-row items-center justify-between bg-subtle/50 gap-4">
          <div className="flex items-center gap-4 text-xs text-quiet">
            <span>Showing <span className="font-bold text-heading">{totalCount ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, totalCount)}</span> of <span className="font-bold text-heading">{totalCount}</span> transactions</span>
            <div className="hidden sm:flex items-center gap-1.5 border-l border-strong-outline pl-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Supabase Live Ledger Stream
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-secondary">
              Rows:
              <select 
                value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                className="bg-surface border border-outline rounded p-1 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded border border-outline bg-surface text-quiet hover:bg-subtle disabled:opacity-50">
                <ChevronLeft size={14} />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded border border-indigo-600 bg-indigo-600 text-white font-bold text-xs shadow-sm">
                {page + 1}
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded border border-outline bg-surface text-quiet hover:bg-subtle disabled:opacity-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* --- AI Report Modal --- */}
        {aiReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-indigo-tint animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] p-6 text-white flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight">Trackit AI Analysis</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-indigo-100 text-xs font-semibold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      Powered by {aiReport.provider}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setAiReport(null)} 
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 md:p-8">
                <p className="text-body leading-relaxed font-medium text-sm md:text-base">
                  {aiReport.insight}
                </p>
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 border-t border-divider bg-subtle flex justify-end">
                <button 
                  onClick={() => setAiReport(null)} 
                  className="px-6 py-2.5 bg-surface border border-outline text-body rounded-xl text-sm font-bold hover:bg-muted transition-colors shadow-sm"
                >
                  Dismiss Report
                </button>
              </div>
              
            </div>
          </div>
        )}
        {/* --- End AI Report Modal --- */}
    </div>
  );
}