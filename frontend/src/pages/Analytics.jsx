import { chartTooltipProps } from '../chartTheme';
import { useOutletContext } from 'react-router-dom';
import { groupSpending, isCredit, money, paymentTags, total } from '../ledger';
import { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Sparkles, Calendar, 
  Tag, Smartphone, AlertCircle, 
  Settings2, X, Check
} from 'lucide-react';

export default function Analytics({aiTone, setAiTone}) {
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  
  // --- AI CONFIGURATION STATE ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  
  const aiPersonalities = [
    { id: 'Strict Financial Advisor', label: 'Strict Advisor', desc: 'No-nonsense, focuses on cutting unnecessary burn rate.' },
    { id: 'Friendly & Encouraging', label: 'Cheerleader', desc: 'Positive reinforcement, celebrates your savings.' },
    { id: 'Sarcastic & Roast Me', label: 'Roast Mode', desc: 'Aggressively roasts your terrible spending habits.' },
    { id: 'Analytical Data Scientist', label: 'Data Nerd', desc: 'Heavy focus on percentages, velocity, and trajectories.' }
  ];

  const { payments, getBudget } = useOutletContext();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), timeRange === 'This Month' ? 1 : today.getDate() - 29);
  const expenses = payments.filter(row => !isCredit(row) && new Date(row.created_at) >= start && new Date(row.created_at) <= today);
  const spent = total(expenses);
  const days = new Map();
  const dailySpendData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, cents: 0 }));
  for (const row of expenses) {
    const date = new Date(row.created_at);
    const cents = Math.round(Number(row.amount) * 100);
    days.set(date.toDateString(), (days.get(date.toDateString()) || 0) + cents);
    dailySpendData[(date.getDay() + 6) % 7].cents += cents;
  }
  let cumulative = 0;
  const burnRateData = [];
  for (const day = new Date(start); day <= today; day.setDate(day.getDate() + 1)) {
    cumulative += days.get(day.toDateString()) || 0;
    burnRateData.push({ day: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), spend: cumulative / 100, limit: getBudget(day) });
  }
  const paymentModeData = groupSpending(expenses, row => row.upi_app || row.payment_mode || 'Other');
  const topTags = groupSpending(expenses.flatMap(row => paymentTags(row).map(tag => ({ ...row, tag }))), row => row.tag).slice(0, 5);
  const weekend = (dailySpendData[5].cents + dailySpendData[6].cents) / 100;


  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-extrabold text-heading">Analytics & Insights</h1>
            <p className="text-quiet mt-1">Deep dive into your spending patterns and trends.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-surface border border-outline rounded-xl p-1 shadow-sm">
            <Calendar size={16} className="ml-3 text-indigo-ink" />
            <select aria-label="Analysis period" className="p-2" value={timeRange} onChange={event => setTimeRange(event.target.value)}>
              <option>Last 30 Days</option><option>This Month</option>
            </select>
          </div>
        </header>

        {/* PHASE 3 HOOK: AI Insights Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-1 shadow-lg shadow-brand-shadow/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 md:p-8 relative z-10 border border-white/10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Sparkles size={32} className="text-indigo-200" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Spending summary</h2>
                <span className="bg-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Overview</span>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed max-w-3xl">
                {expenses.length ? `You recorded ${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} totaling ${money(spent)} in this period.` : 'No expenses recorded in this period.'}
              </p>
            </div>
            
            {/* THIS BUTTON NOW OPENS THE MODAL */}
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="shrink-0 bg-surface text-indigo-ink px-6 py-3 rounded-xl font-bold hover:bg-indigo-wash transition-colors shadow-lg flex items-center gap-2"
            >
              <Settings2 size={18} /> Configure AI
            </button>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cumulative Burn Rate */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-heading">Cumulative Burn Rate</h3>
                <p className="text-sm text-hint">Cumulative spending and monthly budget reference</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-secondary">
                  <div className="w-3 h-3 rounded-full bg-indigo-600"></div> Actual Spend
                </div>
                <div className="flex items-center gap-1.5 text-secondary">
                  <div className="w-3 h-0.5 bg-red-400 border border-dashed"></div> Monthly Limit
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burnRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-indigo-ink)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-indigo-ink)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-quiet)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-quiet)' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip {...chartTooltipProps} formatter={(value, key) => [money(value), key === 'limit' ? 'Monthly budget' : 'Cumulative spending']} />
                  <Area type="monotone" dataKey="spend" stroke="var(--color-indigo-ink)" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" activeDot={{ r: 6, fill: '#4f46e5', stroke: 'var(--color-surface)', strokeWidth: 2 }} />
                  <Area type="step" dataKey="limit" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Tags Leaderboard */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-heading">Top Tags</h3>
                <p className="text-sm text-hint">Highest volume custom tags</p>
              </div>
              <Tag size={20} className="text-indigo-200" />
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {!topTags.length && <p className="text-sm text-quiet">No tagged expenses in this period.</p>}
              {topTags.map((tag, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-subtle border border-divider hover:border-indigo-tint transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-tint text-indigo-ink flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-heading group-hover:text-indigo-ink transition-colors">{tag.name}</p>
                      <p className="text-xs text-quiet">{tag.txCount} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-heading">₹{tag.value.toLocaleString()}</p>

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Spend Velocity */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-heading">Daily Spend Velocity</h3>
                <p className="text-sm text-hint">Activity breakdown by day of week</p>
              </div>

            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySpendData.map(entry => ({ ...entry, amount: entry.cents / 100 }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-quiet)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-quiet)' }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip {...chartTooltipProps} cursor={{ fill: 'var(--color-muted)' }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32}>
                    {dailySpendData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.day === 'Sat' || entry.day === 'Sun' ? '#8b5cf6' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-quiet bg-subtle p-3 rounded-lg border border-divider">
              <AlertCircle size={16} className="text-amber-ink shrink-0 mt-0.5" />
              <p>Weekend spending (purple) accounts for <span className="font-bold text-heading">{spent ? Math.round(weekend / spent * 100) : 0}%</span> of spending in this period.</p>
            </div>
          </div>

          {/* Payment Mode Distribution */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-bold text-heading">Payment Modes</h3>
                <p className="text-sm text-hint">Where your money moves</p>
              </div>
              <Smartphone size={20} className="text-indigo-200" />
            </div>

            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentModeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps} formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-hint uppercase tracking-widest">Top Mode</span>
                <span className="text-lg font-extrabold text-heading">{paymentModeData[0]?.name || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-divider">
              {paymentModeData.map((mode) => (
                <div key={mode.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mode.color }}></div>
                  <div>
                    <p className="text-xs font-medium text-quiet leading-none mb-1">{mode.name}</p>
                    <p className="text-sm font-bold text-heading leading-none">₹{mode.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- AI CONFIGURATION MODAL --- */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-indigo-tint animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-divider">
              <div className="flex items-center gap-2">
                <Settings2 className="text-indigo-ink" size={20} />
                <h3 className="text-lg font-bold text-heading">AI Configuration</h3>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="text-hint hover:text-secondary">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm font-semibold text-quiet uppercase tracking-wider mb-2">Select AI Persona</p>
              
              {aiPersonalities.map((persona) => (
                <div 
                  key={persona.id}
                  onClick={() => setAiTone(persona.id)}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex justify-between items-center ${
                    aiTone === persona.id 
                      ? 'border-indigo-600 bg-indigo-wash/50' 
                      : 'border-divider hover:border-indigo-tint hover:bg-subtle'
                  }`}
                >
                  <div>
                    <h4 className={`font-bold ${aiTone === persona.id ? 'text-indigo-ink' : 'text-heading'}`}>
                      {persona.label}
                    </h4>
                    <p className="text-xs text-quiet mt-1">{persona.desc}</p>
                  </div>
                  {aiTone === persona.id && (
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-subtle border-t border-divider flex justify-end">
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Save Preferences
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
