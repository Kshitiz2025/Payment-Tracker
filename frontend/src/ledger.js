const palette = ['#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6'];

export const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2
}).format(value);

export function signedMoney(row) {
  const absFormatted = money(Math.abs(Number(row.amount) || 0));
  return isCredit(row) ? `+${absFormatted}` : `−${absFormatted}`;
}

export function isCredit(row) {
  return (
    row.transaction_type === 'income' ||
    row.type === 'income' ||
    row.category === 'Income / Allowance' ||
    row.category === 'Income / Refund' ||
    Number(row.amount) < 0
  );
}

export function total(rows) {
  return rows.reduce((sum, row) => sum + Math.round(Math.abs(Number(row.amount)) * 100), 0) / 100;
}

export function monthSummary(rows, budget, date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const payments = rows.filter(row => {
    const time = new Date(row.date || row.created_at);
    return time >= start && time < end;
  });
  const expenses = payments.filter(row => !isCredit(row));
  const spent = total(expenses);
  const credits = total(payments.filter(isCredit));
  return {
    payments,
    expenses,
    spent,
    credits,
    remaining: Math.round((budget + credits - spent) * 100) / 100,
    usage: budget > 0 ? spent / budget * 100 : 0,
  };
}

export function groupSpending(rows, getName) {
  const groups = new Map();
  for (const row of rows) {
    if (isCredit(row)) continue;
    const name = getName(row);
    if (!name) continue;
    const stamp = row.created_at || row.date || '';
    const group = groups.get(name) || { name, cents: 0, txCount: 0, lastUsed: stamp };
    group.cents += Math.round(Math.abs(Number(row.amount)) * 100);
    group.txCount++;
    if (stamp > group.lastUsed) group.lastUsed = stamp;
    groups.set(name, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.cents - a.cents)
    .map((group, index) => ({
      name: group.name,
      value: group.cents / 100,
      txCount: group.txCount,
      lastUsed: group.lastUsed,
      color: palette[index % palette.length],
    }));
}

export function newestFirst(a, b) {
  const timeA = new Date(a.created_at || a.date || 0).getTime();
  const timeB = new Date(b.created_at || b.date || 0).getTime();
  return (timeB - timeA) || String(b.id).localeCompare(String(a.id));
}

export function paymentTags(row) {
  return [...new Set((row.label || '').match(/#[\p{L}\p{N}_-]+/gu) || [])];
}