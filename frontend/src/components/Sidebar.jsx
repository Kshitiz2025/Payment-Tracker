import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { money } from '../ledger';
import ThemePicker from './ThemePicker';
import { Menu, X, Home, List, PieChart, LayoutGrid, Settings, Plus } from 'lucide-react';

export default function Sidebar({ onOpenPaymentModal, userName, count, budget, summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/home' },
    { name: 'Transactions', icon: List, path: '/transactions', badge: `${count} logs` },
    { name: 'Analytics', icon: PieChart, path: '/analytics' },
    { name: 'Categories & Limits', icon: LayoutGrid, path: '/categories' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <>
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-6 left-6 z-40 p-3 bg-surface text-heading rounded-xl shadow-sm border border-outline hover:bg-subtle transition-all duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open Menu"
        aria-expanded={isOpen}
        aria-controls="sidebar-menu"
      >
        <Menu size={24} strokeWidth={2.5} />
      </button>

      {/* Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Panel - Light Theme matching the Dashboard */}
      <aside id="sidebar-menu" inert={!isOpen}
        className={`fixed top-0 left-0 h-full w-[300px] bg-surface text-heading z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-r border-divider ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header: Logo and Close Button */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl">
              T
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">Trackit</h2>
              <span className="text-[10px] font-bold text-indigo-ink bg-indigo-wash px-2 py-0.5 rounded-full uppercase tracking-wider">Payment Tracker</span>
            </div>
          </div>
          <button 
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="p-2 text-hint hover:text-body hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile Card[cite: 22] */}
        <div className="px-6 mb-6">
          <div className="bg-subtle border border-divider rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-950 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm text-heading">{userName}</p>
              <p className="text-xs text-quiet font-medium">
                Personal Vault
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links[cite: 22] */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              replace // <-- ADD THIS WORD HERE
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => 
                `flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-brand-shadow' 
                    : 'text-secondary hover:text-heading hover:bg-subtle'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="transition-transform duration-200" />
                <span className="text-sm">{item.name}</span>
              </div>
              {/* Badge for specific items (like Transactions)[cite: 22] */}
              {item.badge && (
                <span className="text-[10px] font-bold bg-muted text-secondary px-2 py-1 rounded-full group-hover:bg-white/20 group-[.active]:bg-white/20 group-[.active]:text-white transition-colors">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
          <div className="mt-3 border-t border-divider pt-3 pb-2">
            <ThemePicker compact />
          </div>
        </nav>

        {/* Bottom Section: Limits & CTA[cite: 22] */}
        <div className="p-6 border-t border-divider bg-surface">
          
          {/* Monthly Limit Progress Card[cite: 22] */}
          <div className="bg-surface border border-divider rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-2 text-xs font-bold text-secondary">
              <span>Monthly Limit</span>
              <span className="text-heading">{money(budget)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(summary.usage, 100)}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-indigo-ink">{summary.usage.toFixed(1)}% spent</span>
              <span className="text-emerald-ink bg-emerald-wash px-2 py-0.5 rounded-md">{money(summary.remaining)} left</span>
            </div>
          </div>

          {/* New Payment Button[cite: 22] */}
          <button 
            onClick={() => {
              setIsOpen(false);
              if (onOpenPaymentModal) onOpenPaymentModal();
            }}
            className="w-full bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/20 py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-200"
          >
            <Plus size={20} strokeWidth={3} />
            New Payment
          </button>
        </div>
      </aside>
    </>
  );
}
