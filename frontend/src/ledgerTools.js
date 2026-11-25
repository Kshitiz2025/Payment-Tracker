import { isCredit } from './ledger';

export function monthKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), '01'].join('-');
}

// A budget change carries forward until the next recorded change.
export function budgetAt(plans, baseline, date) {
  const key = monthKey(date);
  const applicable = plans.find(plan => plan.month <= key && plan.budget != null);
  return Number(applicable?.budget ?? baseline);
}

function csvText(value) {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+@\-＝＋－＠]|^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function ledgerCsv(rows) {
  const lines = ['Date,Item,Category,Payment mode,UPI app,Note,Type,Amount (INR)'];
  for (const row of rows) {
    const credit = isCredit(row);
    const fields = [row.created_at, row.sub_category, row.category, row.payment_mode,
      row.upi_app, row.label, credit ? 'Credit' : 'Expense'];
    const amount = Math.abs(Number(row.amount)) * (credit ? 1 : -1);
    lines.push([...fields.map(csvText), amount.toFixed(2)].join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

export function exportLedger(rows) {
  const url = URL.createObjectURL(new Blob([ledgerCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trackit-payments.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
