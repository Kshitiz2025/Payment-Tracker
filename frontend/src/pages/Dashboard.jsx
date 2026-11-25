import { chartTooltipProps } from '../chartTheme';
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { groupSpending, isCredit, money, monthSummary, total } from '../ledger';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  ChevronLeft, ChevronRight, Calendar, 
  Wallet, TrendingDown, LogOut, Receipt
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile, payments, getBudget, openPayment } = useOutletContext();
  const navigate = useNavigate();
  const userName = profile.name || user.email || 'User';
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const budget = getBudget(currentDate);
  const { expenses, payments: recentPayments, spent, remaining, usage } = monthSummary(payments, budget, currentDate);
  const categoryData = groupSpending(expenses, row => row.category || 'Other');
  const formattedMonth = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const monthOffset = offset => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
  const average = Array.from({ length: 6 }, (_, index) => monthSummary(payments, budget, monthOffset(-index)).spent)
    .reduce((sum, value) => sum + value, 0) / 6;

  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8 font-sans">
      
      {/* REQUIREMENT 1: BRANDING & HEADER */}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-900 text-white rounded-lg flex items-center justify-center font-bold text-xl">
              T
            </div>
            <div>
              <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
                Trackit <span className="bg-indigo-tint text-indigo-ink text-xs px-2 py-1 rounded-full font-semibold">Personal Vault</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={openPayment} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-brand-shadow transition-all flex items-center gap-2">
              + Log Payment
            </button>
            
            {/* REQUIREMENT 3: PROFILE DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold border-2 border-surface shadow-md"
              >
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-surface rounded-2xl shadow-xl border border-divider z-40 p-5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-divider">
                    <div className="w-12 h-12 bg-indigo-tint text-indigo-ink rounded-full flex items-center justify-center font-bold text-xl">
                      {userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-heading">{userName}</h4>
                      <p className="text-xs text-quiet">{user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-secondary">
                      <Wallet size={16} className="text-hint" />
                      <span>Monthly budget: {money(budget)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-secondary">
                      <TrendingDown size={16} className="text-hint" />
                      <span>Total Spent: {money(total(payments.filter(row => !isCredit(row))))}</span>
                    </div>
                  </div>
                  <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 text-sm text-red-ink font-semibold bg-red-wash py-2 rounded-lg hover:bg-red-tint">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Title & Date Filter */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-heading">Financial Overview</h2>
            <p className="text-quiet mt-1">Real-time payment telemetry, cash flow & budget surveillance.</p>
          </div>
          
          {/* REQUIREMENT 2: NAVIGATION & DATE FILTERING */}
          <div className="flex items-center bg-surface border border-outline rounded-xl p-1 shadow-sm mt-4 md:mt-0">
            <button onClick={() => setCurrentDate(monthOffset(-1))} className="p-2 hover:bg-muted rounded-lg text-secondary">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 font-semibold text-heading min-w-[140px] justify-center">
              <Calendar size={16} className="text-indigo-ink" />
              {formattedMonth}
            </div>
            <button onClick={() => setCurrentDate(monthOffset(1))} className="p-2 hover:bg-muted rounded-lg text-secondary">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* REQUIREMENT 4: METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Card 1: Balance */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-bold text-quiet tracking-wider uppercase mb-1">Monthly budget balance</p>
                <h3 className="text-3xl font-extrabold text-heading">{money(remaining)}</h3>
              </div>
              <span className="bg-emerald-wash text-emerald-ink px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-tint">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> {remaining < 0 ? 'Over budget' : 'Within budget'}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-secondary">Monthly Spending Limit: {money(budget)}</span>
                <span className="text-emerald-ink font-bold">{money(remaining)} remaining</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(usage, 100)}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-hint font-medium">
                <span>₹0</span>
                <span>{usage.toFixed(1)}% utilized</span>
                <span>Goal: {money(budget)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Average */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-bold text-quiet tracking-wider uppercase mb-1">Avg Monthly Spend</p>
                <h3 className="text-3xl font-extrabold text-heading">{money(average)}</h3>
                <p className="text-sm text-hint mt-1">Rolling 6-month average</p>
              </div>
              <div className="w-10 h-10 bg-indigo-wash rounded-lg flex items-center justify-center text-indigo-ink">
                <TrendingDown size={20} />
              </div>
            </div>

          </div>

          {/* Card 3: Current Spending */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-bold text-quiet tracking-wider uppercase mb-1">What I have spent till now</p>
                <h3 className="text-3xl font-extrabold text-heading">{money(spent)}</h3>
                <p className="text-sm text-hint mt-1">{recentPayments.length} payments in {formattedMonth}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-wash rounded-lg flex items-center justify-center text-emerald-ink">
                <Receipt size={20} />
              </div>
            </div>

          </div>
        </div>

        {/* REQUIREMENT 5: UNCHANGED ELEMENTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Spending by Category */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm lg:col-span-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-heading">Spending by Category</h3>
              <span className="bg-indigo-wash text-indigo-ink px-3 py-1 rounded-lg text-xs font-bold">{formattedMonth}</span>
            </div>
            
            <div className="h-48 w-full relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie stroke="var(--color-surface)" data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps} formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-hint uppercase tracking-wider">Total</span>
                <span className="text-xl font-extrabold text-heading">{money(spent)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              {categoryData.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.name}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-heading ml-3.5">₹{item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            
            <button onClick={() => navigate('/categories')} className="w-full mt-6 bg-indigo-wash text-indigo-ink font-bold py-3 rounded-xl text-xs hover:bg-indigo-tint transition-colors">
              VIEW DETAILED CATEGORY BREAKDOWN
            </button>
          </div>

          {/* Recent Payment Logs */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-heading">Recent Payment Logs</h3>
                <p className="text-sm text-hint">Recorded outflows with categorization & audit trail</p>
              </div>
              <button onClick={() => navigate('/transactions')} className="text-indigo-ink text-sm font-semibold hover:underline">
                Full Statement &gt;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-divider text-xs font-bold text-hint uppercase tracking-wider">
                    <th className="pb-3 font-medium">Payment & Item</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Mode</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {!recentPayments.length && <tr><td colSpan={4} className="py-6 text-quiet">No payments recorded for this month.</td></tr>}
                  {recentPayments.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-subtle/50 transition-colors group">
                      <td className="py-4 pr-4">
                        <p className="font-bold text-heading text-sm">{tx.sub_category || tx.category}</p>
                        <p className="text-xs text-hint mt-0.5">{tx.label && `${tx.label} • `}{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-wash text-indigo-ink`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-sm text-secondary font-medium">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          {tx.payment_mode}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <p className="font-extrabold text-heading text-sm">{isCredit(tx) ? '+' : '−'}{money(Math.abs(tx.amount))}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
