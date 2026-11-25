import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Receipt, X, Utensils, QrCode, CreditCard, Banknote, Tag, Check, Calendar } from 'lucide-react';

export default function PaymentModal({ userId, payment, onClose, onSaved }) {
  const [transactionType, setTransactionType] = useState(payment?.transaction_type || 'expense');
  const pending = useRef(null);
  const submitting = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: payment ? String(Math.abs(Number(payment.amount))) : '',
    category: payment?.category || 'Food & Dining',
    paymentMode: payment?.payment_mode || 'UPI',
    upiApp: payment?.upi_app || 'PhonePe', 
    subCategory: payment?.sub_category || '',
    label: payment?.label || '',
    date: payment?.created_at ? payment.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10)
  });

  const upiApps = ['PhonePe', 'Google Pay', 'Paytm', 'Amazon Pay', 'Cred Pay', 'Other'];

  const quickAdd = (val) => {
    const current = parseFloat(formData.amount) || 0;
    setFormData({ ...formData, amount: (current + val).toString() });
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData({ ...formData, subCategory: suggestion });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg('Enter a positive amount.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setErrorMsg('');
    try {
      // Preserve time if date is unchanged, otherwise set to noon on the selected date
      const timestamp = payment?.created_at && payment.created_at.startsWith(formData.date) 
        ? payment.created_at 
        : new Date(`${formData.date}T12:00:00Z`).toISOString();

      const fields = {
        amount: amount, // Master amount is always positive now
        transaction_type: transactionType,
        category: formData.category,
        sub_category: formData.subCategory.trim(), 
        label: formData.label.trim(),
        payment_mode: formData.paymentMode, 
        upi_app: formData.paymentMode === 'UPI' ? formData.upiApp : null,
        created_at: timestamp
      };

      if (payment) {
        const { data, error } = await supabase.from('transactions').update(fields)
          .eq('id', payment.id).eq('user_id', userId).eq('revision', payment.revision)
          .is('deleted_at', null).select().maybeSingle();
        if (error) throw error;
        if (!data) { setErrorMsg('This payment changed. Close the form and reopen the latest entry.'); return; }
        onSaved(data);
        return;
      }

      const storageKey = 'trackit.pending-payment.' + userId;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      let previous = pending.current;
      try { previous ??= JSON.parse(sessionStorage.getItem(storageKey)); } catch { }
      const requestId = previous?.fingerprint === fingerprint ? previous.requestId : crypto.randomUUID();
      pending.current = { fingerprint, requestId };
      try { sessionStorage.setItem(storageKey, JSON.stringify(pending.current)); } catch { }
      
      const table = supabase.from('transactions');
      const result = await table.upsert({ ...fields, user_id: userId, request_id: requestId },
        { onConflict: 'user_id,request_id', ignoreDuplicates: true }).select().maybeSingle();
      if (result.error) throw result.error;
      let saved = result.data;
      if (!saved) {
        const existing = await table.select().eq('user_id', userId).eq('request_id', requestId).single();
        if (existing.error) throw existing.error;
        saved = existing.data;
      }
      try { sessionStorage.removeItem(storageKey); } catch { }
      pending.current = null;
      onSaved(saved);
    } catch {
      setErrorMsg('Unable to save the payment. Check your connection and transaction history before retrying.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-divider flex items-start justify-between relative">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-indigo-wash text-indigo-ink rounded-xl flex items-center justify-center">
              <Receipt size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-heading">{payment ? 'Edit Payment' : 'Add New Payment'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${transactionType === 'income' ? 'bg-green-tint text-green-ink' : 'bg-red-tint text-red-ink'}`}>
                  {transactionType === 'income' ? 'Income' : 'Expense'}
                </span>
              </div>
              <p className="text-quiet text-sm">Record an entry for tracking and balance management</p>
            </div>
          </div>
          <button disabled={loading} onClick={onClose} className="text-hint hover:text-secondary bg-subtle hover:bg-muted p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="expense"
                checked={transactionType === 'expense'}
                onChange={(e) => setTransactionType(e.target.value)}
                className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-sm font-bold text-gray-700">Spent Money (Expense)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="income"
                checked={transactionType === 'income'}
                onChange={(e) => setTransactionType(e.target.value)}
                className="text-emerald-500 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-sm font-bold text-gray-700">Received Money (Income)</span>
            </label>
          </div>
          
          {/* Amount & Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-body tracking-wider uppercase">Amount (₹) <span className="text-red-ink">*</span></label>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-heading">₹</span>
                <input
                  type="number" min="0.01" step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full bg-subtle/50 border border-outline rounded-xl py-3 pl-10 pr-4 text-2xl font-medium text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-hint"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-body tracking-wider uppercase mb-2">Date <span className="text-red-ink">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-hint w-5 h-5 pointer-events-none" />
                <input
                  type="date"
                  required
                  className="w-full bg-subtle/50 border border-outline rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-medium text-quiet">Quick add:</span>
            {[100, 500, 1000, 5000].map(val => (
              <button
                key={val} type="button" onClick={() => quickAdd(val)}
                className="bg-muted hover:bg-track text-body px-3 py-1 rounded-full text-sm font-medium transition-colors"
              >
                +₹{val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Category & Payment Mode Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-body tracking-wider uppercase mb-2">Category <span className="text-red-ink">*</span></label>
              <div className="relative">
                <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-ink w-5 h-5" />
                <select
                  className="w-full bg-surface border border-outline rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {payment?.category && !['Food & Dining', 'Entertainment', 'Groceries', 'Travel'].includes(payment.category) && <option>{payment.category}</option>}
                  <option>Food & Dining</option>
                  <option>Entertainment</option>
                  <option>Groceries</option>
                  <option>Travel</option>
                  <option>Income / Allowance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-body tracking-wider uppercase mb-2">Payment Mode</label>
              <div className="flex bg-subtle p-1 rounded-xl border border-outline">
                {[
                  { id: 'UPI', icon: QrCode },
                  { id: 'Card', icon: CreditCard },
                  { id: 'Cash', icon: Banknote }
                ].map(mode => (
                  <button
                    key={mode.id} type="button"
                    onClick={() => setFormData({ ...formData, paymentMode: mode.id })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${formData.paymentMode === mode.id ? 'bg-surface text-indigo-ink shadow-sm border border-divider' : 'text-quiet hover:text-body'}`}
                  >
                    <mode.icon size={16} /> {mode.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic UPI App Selector */}
          {formData.paymentMode === 'UPI' && (
            <div className="bg-indigo-wash/50 p-4 rounded-xl border border-indigo-tint animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-indigo-ink tracking-wider uppercase mb-2">Select UPI App</label>
              <div className="flex flex-wrap gap-2">
                {upiApps.map(app => (
                  <button
                    key={app} type="button"
                    onClick={() => setFormData({ ...formData, upiApp: app })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.upiApp === app ? 'bg-indigo-600 text-white shadow-md' : 'bg-surface text-secondary border border-indigo-tint hover:bg-indigo-wash'}`}
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Item */}
          <div>
            <label className="block text-xs font-bold text-body tracking-wider uppercase mb-2">Sub-Item <span className="text-hint normal-case font-normal">(e.g., maggi, pizza)</span></label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-hint w-4 h-4" />
              <input
                type="text"
                placeholder="e.g., Maggi, Pizza, Allowance"
                className="w-full bg-surface border border-outline rounded-xl py-3 pl-9 pr-4 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-quiet">Suggestions:</span>
              {['Maggi', 'Pizza', 'Coffee'].map(item => (
                <button
                  key={item} type="button" onClick={() => handleSuggestionClick(item)}
                  className="bg-muted hover:bg-track text-secondary px-2 py-0.5 rounded text-xs font-medium transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Label / Note */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-body tracking-wider uppercase">Label / Note</label>
              <span className="text-xs font-medium text-hint">{formData.label.length}/150</span>
            </div>
            <textarea
              maxLength={150}
              placeholder="e.g., apply given money to Glimpse Kumar"
              className="w-full bg-surface border border-outline rounded-xl p-4 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            />
            <p className="text-xs text-hint mt-2">Add reference context, settlement name, or transaction tags.</p>
          </div>

          {errorMsg && <p role="alert" className="text-red-ink">{errorMsg}</p>}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-divider mt-2">
            <button type="button" disabled={loading} onClick={onClose} className="px-6 py-3 border border-outline text-body font-medium rounded-xl hover:bg-subtle transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-[#4f46e5] text-white font-medium rounded-xl hover:bg-[#4338ca] transition-colors flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-shadow">
              {loading ? 'Saving...' : <><Check size={18} /> Save Payment</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}