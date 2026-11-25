import { monthKey } from '../ledgerTools';
import { requestAI } from '../api';
import { useOutletContext } from 'react-router-dom';
import { groupSpending, monthSummary, paymentTags } from '../ledger';
import { useState } from 'react';
import {
  LayoutGrid, Tag, Plus, Sparkles, AlertCircle,
  Edit2, Check, X, ShieldAlert, ShieldCheck, Wallet, Trash2
} from 'lucide-react';

export default function Categories() {
  const { budget: globalLimit, payments, currentLimits, savePlan } = useOutletContext();
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [tempGlobal, setTempGlobal] = useState(globalLimit);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const limits = draft ?? currentLimits;
  const today = new Date();
  const { expenses, spent: globalSpent, remaining, usage } = monthSummary(payments, globalLimit, today);
  const daysLeftInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
  const totals = new Map(groupSpending(expenses, row => row.category || 'Other').map(group => [group.name, group.value]));
  const categories = [...new Set([...totals.keys(), ...Object.keys(limits)])].map(name => ({
    id: name, name, spent: totals.get(name) || 0, limit: Object.hasOwn(limits, name) ? limits[name] : null, icon: '₹'
  }));
  const tags = groupSpending(payments.flatMap(row => paymentTags(row).map(tag => ({ ...row, tag }))), row => row.tag);

  // --- AI HOOK: AUTO-SUGGEST LIMITS ---
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleAutoSuggest = async () => {
    setIsSuggesting(true);
    try {
      // Extract just the names to send to the AI (e.g., ['Food & Dining', 'Shopping', ...])
      const categoryNames = categories.map(cat => cat.name);

      const newLimits = await requestAI('suggest-limits', { masterLimit: globalLimit, categories: categoryNames });
      setDraft(newLimits);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  // --- LOGIC HELPERS ---
  const saveGlobalLimit = async () => {
    if (!Number.isFinite(tempGlobal) || tempGlobal < 0) return;
    try {
      await savePlan(monthKey(), { budget: tempGlobal });
      setDraft(null);
      setIsEditingGlobal(false);
    } catch {
      alert('Could not save your monthly budget.');
    }
  };

  async function saveLimits() {
    if (Object.values(draft).some(n => !Number.isFinite(n) || n < 0) ||
        Object.values(draft).reduce((sum,n) => sum + Math.round(n * 100), 0) > Math.round(globalLimit * 100)) {
      alert('Category limits must fit within the monthly budget.');
      return;
    }
    setSaving(true);
    try {
      await savePlan(monthKey(), { category_limits: draft });
      setDraft(null);
    } catch { alert('Unable to save category limits.'); }
    finally { setSaving(false); }
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = (percentage) => {
    if (percentage >= 100) return { text: 'Over Budget', color: 'text-red-ink', bg: 'bg-red-wash', icon: ShieldAlert };
    if (percentage >= 75) return { text: 'Nearing Limit', color: 'text-amber-ink', bg: 'bg-amber-wash', icon: AlertCircle };
    return { text: 'On Track', color: 'text-emerald-ink', bg: 'bg-emerald-wash', icon: ShieldCheck };
  };

  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-extrabold text-heading">Categories & Limits</h1>
            <p className="text-quiet mt-1">Manage this month’s budget and category limits. AI suggestions share the budget and category list with Gemini or Groq.</p>
          </div>

          <div className="relative">
            <span className="absolute -top-2.5 -right-2 bg-pink-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm z-10">AI HOOK</span>
            <button
              onClick={handleAutoSuggest}
              disabled={isSuggesting || !categories.length || globalLimit <= 0}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-brand-shadow transition-all flex items-center gap-2 text-sm disabled:opacity-75"
            >
              <Sparkles size={16} className={isSuggesting ? "animate-spin" : ""} />
              {isSuggesting ? 'Calculating Limits...' : 'Auto-Suggest Limits'}
            </button>
          </div>
        </header>

        {/* Master Budget Control */}
        <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-indigo-wash text-indigo-ink rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={32} />
          </div>

          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-bold text-quiet uppercase tracking-wider mb-1">Master Monthly Limit</p>
                {isEditingGlobal ? (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-heading">₹</span>
                    <input
                      type="number"
                      value={tempGlobal}
                      onChange={(e) => setTempGlobal(Number(e.target.value))}
                      className="text-3xl font-extrabold text-heading bg-subtle border border-outline rounded-lg w-40 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                    <button onClick={saveGlobalLimit} className="p-2 bg-emerald-wash text-emerald-ink rounded-lg hover:bg-emerald-tint transition-colors"><Check size={20} /></button>
                    <button onClick={() => setIsEditingGlobal(false)} className="p-2 bg-subtle text-quiet rounded-lg hover:bg-muted transition-colors"><X size={20} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-extrabold text-heading">₹{globalLimit.toLocaleString()}</h2>
                    <button
                      onClick={() => { setIsEditingGlobal(true); setTempGlobal(globalLimit); }}
                      className="p-1.5 text-hint hover:text-indigo-ink hover:bg-indigo-wash rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-quiet uppercase tracking-wider mb-1">Global Burn Rate</p>
                <p className="text-xl font-bold text-heading">{usage.toFixed(1)}%</p>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-3 mt-4">
              <div
                className={`h-3 rounded-full ${getProgressColor(usage)}`}
                style={{ width: `${Math.min(usage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm font-semibold">
              <span className="text-quiet">₹{globalSpent.toLocaleString()} spent</span>
              <span className="text-emerald-ink bg-emerald-wash px-2.5 py-0.5 rounded-md">₹{remaining.toLocaleString()} left</span>
            </div>
          </div>
        </div>

        {/* Envelope Budgets (Category Limits) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-heading flex items-center gap-2">
              <LayoutGrid size={20} className="text-indigo-ink" /> Category Envelopes
            </h3>
            <button className="text-sm font-bold text-indigo-ink hover:bg-indigo-wash px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              <Plus size={16} /> Add Category
            </button>
          </div>

          {draft && <div className="mb-3 flex gap-4">
            <button disabled={saving} onClick={saveLimits} className="text-indigo-ink font-bold">Save category limits</button>
            <button disabled={saving} onClick={() => setDraft(null)}>Discard</button>
          </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {!categories.length && <p className="text-sm text-quiet">No category spending this month.</p>}
            {categories.map((cat) => {
              const percentage = cat.limit > 0 ? cat.spent / cat.limit * 100 : 0;
              const remaining = Number(cat.limit ?? 0) - cat.spent;
              const status = getStatusText(percentage);
              const safeToSpend = Math.max(0, remaining / daysLeftInMonth);

              return (
                <div key={cat.id} className="bg-surface p-5 rounded-2xl border border-divider shadow-sm flex flex-col hover:border-indigo-tint hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-subtle rounded-xl flex items-center justify-center text-xl shadow-sm border border-divider">
                        {cat.icon}
                      </div>
                      <h4 className="font-bold text-heading">{cat.name}</h4>
                    </div>
                    <button aria-label={'Edit limit for ' + cat.name} disabled={saving} onClick={() => setDraft({ ...limits, [cat.name]: cat.limit ?? 0 })} className="text-hint hover:text-indigo-ink"><Edit2 size={14} /></button>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-extrabold text-heading">₹{cat.spent.toLocaleString()}</span>
                    <span className="text-sm font-medium text-hint">{draft ? <input aria-label={cat.name + ' limit'} className="w-24 rounded border bg-surface p-1" type="number" min="0" step="0.01" disabled={saving} value={draft[cat.name] ?? ''} onChange={e => setDraft({ ...draft, [cat.name]: Number(e.target.value) })} /> : cat.limit != null ? `/ ₹${cat.limit.toLocaleString()}` : 'spent'}</span>
                  </div>

                  {cat.limit != null && <><div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(percentage)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-divider">
                    <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md ${status.bg} ${status.color}`}>
                      <status.icon size={12} /> {status.text}
                    </div>
                    {remaining > 0 ? (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-hint uppercase">Safe to spend</p>
                        <p className="text-sm font-bold text-heading">₹{Math.floor(safeToSpend)} <span className="text-[10px] font-medium text-quiet">/day</span></p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-red-ink uppercase">Deficit</p>
                        <p className="text-sm font-bold text-red-ink">₹{Math.abs(remaining)}</p>
                      </div>
                    )}
                  </div></>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Tags Manager */}
        <div className="bg-surface rounded-2xl border border-divider shadow-sm overflow-hidden">
          <div className="p-6 border-b border-divider flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                <Tag size={20} className="text-indigo-ink" /> Custom Quick-Tags
              </h3>
              <p className="text-sm text-quiet mt-1">Manage tags used for rapid transaction labeling.</p>
            </div>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-sign-in-hover transition-all flex items-center gap-2 text-sm shadow-md">
              <Plus size={16} /> Create Tag
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-subtle/50 border-b border-divider text-xs font-bold text-hint uppercase tracking-wider">
                  <th className="py-3 px-6 font-medium">Tag Name</th>
                  <th className="py-3 px-6 font-medium">Usage Count</th>
                  <th className="py-3 px-6 font-medium">Last Used</th>
                  <th className="py-3 px-6 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {!tags.length && <tr><td colSpan={4} className="px-6 py-4 text-quiet">No tagged payments yet.</td></tr>}
                {tags.map((tag) => (
                  <tr key={tag.name} className="hover:bg-subtle/50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="bg-indigo-wash text-indigo-ink px-2.5 py-1 rounded-md text-sm font-bold border border-indigo-tint">
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-body">
                      {tag.txCount} transactions
                    </td>
                    <td className="py-4 px-6 text-sm text-quiet font-medium">
                      {new Date(tag.lastUsed).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 text-hint hover:text-indigo-ink transition-colors mr-1">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-hint hover:text-red-ink transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
