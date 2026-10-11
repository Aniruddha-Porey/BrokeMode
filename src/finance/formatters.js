const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatCurrency(value, options = {}) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  const rounded = Math.round(amount);
  if (options.compact) {
    const absolute = Math.abs(rounded);
    const compact = absolute >= 100000 ? `${(absolute / 100000).toFixed(1).replace(/\.0$/, '')}L` : absolute >= 1000 ? `${(absolute / 1000).toFixed(absolute >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : number.format(absolute);
    return `${rounded < 0 ? '−' : ''}₹${compact}`;
  }
  const result = inr.format(Math.abs(rounded));
  return rounded < 0 ? `−${result}` : result;
}

export function formatNumber(value) {
  return number.format(Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '—';
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: options.long ? 'long' : 'short',
    ...(options.year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date);
}

export function formatPercent(value, digits = 0) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${safe.toFixed(digits)}%`;
}

export function formatSignedCurrency(value) {
  const amount = Math.round(Number(value) || 0);
  if (amount === 0) return formatCurrency(0);
  return `${amount > 0 ? '+' : '−'}${formatCurrency(Math.abs(amount))}`;
}

export function formatMonthYear(value) {
  if (!value) return '—';
  const [year, month] = String(value).slice(0, 7).split('-').map(Number);
  if (!year || !month) return '—';
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}
