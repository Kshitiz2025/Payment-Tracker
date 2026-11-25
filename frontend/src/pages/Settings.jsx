import { exportLedger } from '../ledgerTools';
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ThemePicker from '../components/ThemePicker';
import { 
  User, Sliders, Sparkles, Bell, HardDrive, 
  Save, LogOut, Trash2, Lock, Mail, CreditCard 
} from 'lucide-react';

// 1. Accept the aiTone and setAiTone props here
export default function Settings({ aiTone, setAiTone }) {

  const { profile, user, saveProfile, payments } = useOutletContext();
  const navigate = useNavigate();

  // 2. Add the Sign Out Function
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      // Redirect back to the login screen
      navigate('/'); 
    }
  };
  
  const [activeTab, setActiveTab] = useState('account');
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(profile.name || '');

  // NEW: Master Budget State
  const [newBudget, setNewBudget] = useState(profile.monthly_budget || '');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // NEW: Update Budget Function
  const handleUpdateBudget = async () => {
    if (!newBudget) return;
    setIsUpdatingBudget(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('profiles')
      .update({ monthly_budget: parseInt(newBudget) })
      .eq('id', user.id);

    setIsUpdatingBudget(false);

    if (error) {
      alert("Failed to update budget: " + error.message);
    } else {
      alert("Budget successfully updated to ₹" + newBudget);
      // Optional: If you want to automatically sync context, you could call saveProfile here too
    }
  };

  // 2. Define the exact personas expected by your backend
  const aiPersonalities = [
    { id: 'Strict Financial Advisor', label: 'Strict Financial Advisor (Focuses on limits and cuts)' },
    { id: 'Friendly & Encouraging', label: 'Friendly & Encouraging (Celebrates your savings)' },
    { id: 'Sarcastic & Roast Me', label: 'Sarcastic & Roast Me (Aggressively roasts your spending)' },
    { id: 'Analytical Data Scientist', label: 'Analytical Data Scientist (Heavy focus on velocity)' }
  ];

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await saveProfile({ name: name.trim() });
      setName(name.trim());
    } catch {
      alert('Unable to save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account & Profile', icon: User },
    { id: 'preferences', label: 'App Preferences', icon: Sliders },
    { id: 'ai', label: 'AI Configuration', icon: Sparkles, badge: 'Phase 3' },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: HardDrive },
  ];

  
  return (
    <div className="min-h-screen bg-canvas p-4 md:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-heading">Settings</h1>
            <p className="text-quiet mt-1">Manage your account, preferences, and Trackit AI.</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-brand-shadow transition-all flex items-center gap-2 text-sm disabled:opacity-70"
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left Sidebar Tabs */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-surface text-indigo-ink shadow-sm border border-indigo-tint' 
                      : 'text-quiet hover:text-heading hover:bg-surface/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-ink' : 'text-hint'} />
                    {tab.label}
                  </div>
                  {tab.badge && (
                    <span className="bg-pink-tint text-pink-ink text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            
           <div className="mt-6 pt-6 border-t border-divider">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-body bg-surface border border-outline py-3 rounded-2xl hover:bg-subtle transition-colors shadow-sm"
            >
              <LogOut size={18} className="text-secondary" />
              Sign Out
            </button>
          </div>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 space-y-6">
            
            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Profile Information</h3>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-indigo-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <button className="bg-subtle text-body border border-outline px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors mb-2">
                      Change Avatar
                    </button>
                    <p className="text-xs text-hint">JPG, GIF or PNG. Max size of 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-body">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-subtle border border-outline rounded-xl px-4 py-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-body">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-hint" />
                      <input 
                        type="email" 
                        disabled
                        value={user.email}
                        className="w-full bg-muted border border-outline rounded-xl pl-10 pr-4 py-3 text-sm text-quiet cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* NEW: Financial Settings Block */}
                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Financial Settings</h3>
                <div className="flex items-center justify-between p-5 bg-subtle rounded-xl border border-divider mb-8">
                  <div className="flex-1 mr-4">
                    <h4 className="text-sm font-bold text-heading mb-1">Master Monthly Budget</h4>
                    <p className="text-xs text-quiet mb-3">Adjust your base monthly limit. Used for AI calculations.</p>
                    <div className="relative max-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hint font-medium">₹</span>
                      <input 
                        type="number" 
                        placeholder="e.g. 8000" 
                        value={newBudget}
                        onChange={(e) => setNewBudget(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-surface border border-outline rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdateBudget} 
                    disabled={isUpdatingBudget || !newBudget}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors self-end"
                  >
                    {isUpdatingBudget ? 'Saving...' : 'Update Budget'}
                  </button>
                </div>

                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Security</h3>
                <div className="flex items-center justify-between p-4 bg-subtle rounded-xl border border-divider mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center text-quiet shadow-sm border border-divider">
                      <Lock size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-heading">Password</p>
                      <p className="text-xs text-quiet">Account sign-in password</p>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-indigo-ink hover:text-indigo-ink">Update</button>
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Application Settings</h3>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-body">Default Currency</label>
                      <select className="w-full bg-subtle border border-outline rounded-xl px-4 py-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none">
                        <option value="INR">₹ Indian Rupee (INR)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-body">Linked Primary Bank</label>
                      <input 
                        type="text" 
                        placeholder="Bank name"
                        className="w-full bg-subtle border border-outline rounded-xl px-4 py-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-body">Default Payment Mode</label>
                    <div className="flex gap-4">
                      {['PhonePe', 'GPay', 'Amazon Pay'].map((mode) => (
                        <label key={mode} className="flex-1 relative cursor-pointer group">
                          <input type="radio" name="paymentMode" className="peer sr-only" defaultChecked={mode === 'PhonePe'} />
                          <div className="p-4 bg-surface border-2 border-divider rounded-xl text-center hover:border-indigo-tint peer-checked:border-indigo-600 peer-checked:bg-indigo-wash transition-all">
                            <CreditCard size={20} className="mx-auto mb-2 text-hint peer-checked:text-indigo-ink" />
                            <span className="text-sm font-bold text-body peer-checked:text-indigo-ink">{mode}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <ThemePicker />
                </div>
              </div>
            )}

            {/* AI CONFIGURATION TAB */}
            {activeTab === 'ai' && (
              <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3 mb-6 border-b border-divider pb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-heading">Trackit AI Engine</h3>
                    <p className="text-xs font-bold text-pink-ink uppercase tracking-wider">Node.js Microservice (Phase 3)</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-indigo-wash/50 border border-indigo-tint rounded-xl flex items-start gap-4">
                    <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-indigo-ink rounded border-strong-outline focus:ring-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-indigo-ink">Auto-Categorization</h4>
                      <p className="text-xs text-indigo-ink/70 mt-1">Allow AI to automatically guess the category and tags based on your transaction labels and historical data.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-body">AI Personality & Tone</label>
                    <select 
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-subtle border border-outline rounded-xl px-4 py-3 text-sm font-medium text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    >
                      {aiPersonalities.map(persona => (
                        <option key={persona.id} value={persona.id}>
                          {persona.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Email & Alerts</h3>
                
                <div className="space-y-4">
                  {[
                    { title: 'Weekly AI Spending Digest', desc: 'Sent via trackitnoreply2026@gmail.com every Sunday morning.', default: true },
                    { title: 'Monthly Limit Warning', desc: 'Alert me when I reach 80% of my master budget.', default: true },
                    { title: 'Category Envelope Overdraft', desc: 'Alert me when a specific category exceeds its limit.', default: false },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-divider rounded-xl hover:bg-subtle transition-colors">
                      <div>
                        <h4 className="text-sm font-bold text-heading">{item.title}</h4>
                        <p className="text-xs text-quiet mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.default} />
                        <div className="w-11 h-6 bg-track peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-strong-outline after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DATA TAB (DANGER ZONE) */}
            {activeTab === 'data' && (
              <div className="bg-surface rounded-2xl border border-divider shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-bold text-heading mb-6 border-b border-divider pb-4">Data Management</h3>
                
                <div className="flex items-center justify-between p-4 bg-subtle rounded-xl border border-divider mb-8">
                  <div>
                    <h4 className="text-sm font-bold text-heading">Export Full Ledger</h4>
                    <p className="text-xs text-quiet mt-0.5">Download all your transactions as a CSV file.</p>
                  </div>
                  <button onClick={() => exportLedger(payments)} disabled={!payments.length} className="bg-surface border border-outline text-body px-4 py-2 rounded-lg text-sm font-bold hover:bg-subtle shadow-sm transition-colors">
                    Download CSV
                  </button>
                </div>

                <div className="border border-red-tint rounded-xl overflow-hidden">
                  <div className="bg-red-wash p-4 border-b border-red-tint">
                    <h4 className="text-sm font-bold text-red-ink flex items-center gap-2">
                      <Trash2 size={16} /> Danger Zone
                    </h4>
                  </div>
                  <div className="p-4 bg-surface flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-heading">Delete Account & Data</h4>
                      <p className="text-xs text-quiet mt-0.5">Permanently erase all Supabase transactions and auth records.</p>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm shadow-danger-shadow transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}