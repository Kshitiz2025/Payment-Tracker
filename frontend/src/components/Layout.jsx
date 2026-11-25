import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { monthSummary, newestFirst } from '../ledger';
import { budgetAt, monthKey } from '../ledgerTools';
import PaymentModal from './PaymentModal';
import Sidebar from './Sidebar';

async function loadPayments(userId) {
  const rows = [];
  let lastId;
  for (;;) {
    let query = supabase.from('transactions').select('*').eq('user_id', userId).order('id').limit(500);
    if (lastId != null) query = query.gt('id', lastId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    lastId = data[data.length - 1].id;
  }
  return rows.sort(newestFirst);
}

function AccountLayout({ user }) {
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const channel = useRef(null);

  useEffect(() => {
    if ('BroadcastChannel' in window) channel.current = new BroadcastChannel('trackit-ledger-' + user.id);
    const refresh = () => { setError(''); setAttempt(previous => previous + 1); };
    if (channel.current) channel.current.onmessage = refresh;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      channel.current?.close();
      channel.current = null;
    };
  }, [user.id]);

  function notifyChange() {
    // Reconcile any reads already in flight, including in other open tabs.
    setAttempt(previous => previous + 1);
    channel.current?.postMessage('refresh');
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('profiles').select('id,name,monthly_budget').eq('id', user.id).single().throwOnError(),
      loadPayments(user.id),
      supabase.from('monthly_plans').select('month,budget,category_limits').eq('user_id', user.id).order('month', { ascending: false }).throwOnError()
    ]).then(([result, rows, history]) => {
      if (active) {
        setError('');
        setProfile(result.data);
        setPayments(rows);
        setPlans(history.data);
      }
    }).catch(() => { if (active) setError('Could not load your profile and payments.'); });
    return () => { active = false; };
  }, [user.id, attempt]);

  async function saveProfile(changes) {
    const { data, error } = await supabase.from('profiles').update(changes)
      .eq('id', user.id).select('id,name,monthly_budget').single();
    if (error) throw error;
    setProfile(current => ({ ...current, ...Object.fromEntries(Object.keys(changes).map(key => [key, data[key]])) }));
    notifyChange();
  }

  async function savePlan(month, changes) {
    const { data, error } = await supabase.from('monthly_plans').upsert({
      user_id: user.id, month, ...changes
    }, { onConflict: 'user_id,month', defaultToNull: false }).select('month,budget,category_limits').single();
    if (error) throw error;
    setPlans(current => [data, ...current.filter(p => p.month !== month)].sort((a,b) => b.month.localeCompare(a.month)));
    notifyChange();
  }

  async function changeDeleted(ids, restore, expectedDeletion) {
    const stamp = restore ? null : new Date().toISOString();
    let query = supabase.from('transactions').update({ deleted_at: stamp }).eq('user_id', user.id).in('id', ids);
    if (!restore) query = query.is('deleted_at', null);
    else if (expectedDeletion) query = query.eq('deleted_at', expectedDeletion);
    else query = query.not('deleted_at', 'is', null);
    const { data, error } = await query.select();
    if (error) throw error;
    const changed = new Map(data.map(row => [row.id, row]));
    setPayments(current => current.map(row => changed.get(row.id) || row));
    notifyChange();
    return { ids: data.map(row => row.id), stamp };
  }

  if (error) return <div role="alert" className="p-8">{error} <button onClick={() => { setError(''); setAttempt(a => a + 1); }}>Retry</button></div>;
  if (!profile) return <p className="p-8">Loading your account…</p>;

  const getBudget = date => budgetAt(plans, profile.monthly_budget, date);
  const budget = getBudget(new Date());
  const currentLimits = plans.find(plan => plan.month === monthKey())?.category_limits || {};
  const activePayments = payments.filter(row => !row.deleted_at);
  const deletedPayments = payments.filter(row => row.deleted_at);
  const openPayment = () => { setEditing(null); setModalOpen(true); };
  const editPayment = row => { setEditing(row); setModalOpen(true); };
  return (
    <div className="flex h-screen bg-subtle overflow-hidden">
      <Sidebar userName={profile.name || user.email} count={activePayments.length} budget={budget}
        summary={monthSummary(activePayments, budget)} onOpenPaymentModal={openPayment} />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet context={{ user, profile, payments: activePayments, deletedPayments, budget, getBudget, currentLimits, saveProfile, savePlan, openPayment, editPayment, changeDeleted }} />
      </main>
      {modalOpen && <PaymentModal payment={editing} userId={user.id} onClose={() => setModalOpen(false)} onSaved={row => {
        setPayments(current => [row, ...current.filter(item => item.id !== row.id)].sort(newestFirst));
        setModalOpen(false);
        notifyChange();
      }} />}
    </div>
  );
}

export default function Layout() {
  const [user, setUser] = useState(undefined);
  const inactivityTimerRef = useRef(null);

  // 1. Existing Auth State Listener
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);

  // 2. NEW: 1-Hour Inactivity Timer
  useEffect(() => {
    // Only track inactivity if the user is actually logged in
    if (!user) return;

    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour in milliseconds

    const logoutUser = async () => {
      console.log("Inactive for 1 hour. Logging out...");
      await supabase.auth.signOut();
      // This triggers the auth listener above, sets user to null, and safely kicks you to Login
    };

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(logoutUser, INACTIVITY_LIMIT);
    };

    // Start the timer
    resetTimer();

    // Listen for mouse movement, clicks, typing, or scrolling
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));

    // Cleanup listeners if the component unmounts
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

    useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  if (user === undefined) return <p className="p-8">Loading your account…</p>;
  if (!user) return <Navigate to="/" replace />;

  return <AccountLayout key={user.id} user={user} />;
}
