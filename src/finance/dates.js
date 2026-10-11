const DAY_MS = 24 * 60 * 60 * 1000;

export function parseISODate(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date(Date.UTC(2026, 0, 1));
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISODate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(value, amount) {
  const date = parseISODate(value);
  date.setUTCDate(date.getUTCDate() + Number(amount || 0));
  return toISODate(date);
}

export function addFrequency(value, frequency) {
  if (frequency === 'weekly') return addDays(value, 7);
  if (frequency === 'yearly') {
    const [year, month, day] = String(value).split('-').map(Number);
    const targetYear = year + 1;
    const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
    return `${targetYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') {
    const [year, month, day] = String(value).split('-').map(Number);
    const target = new Date(Date.UTC(year, month, 0));
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
  }
  return addDays(value, 1);
}

export function compareDates(a, b) {
  return String(a || '').slice(0, 10).localeCompare(String(b || '').slice(0, 10));
}

export function daysBetween(start, end) {
  return Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / DAY_MS);
}

export function getChallengeDay(state) {
  return Math.max(1, Math.min(Number(state.durationDays) || 30, daysBetween(state.challengeStartDate, state.currentDate) + 1));
}

export function getCycleEndDate(state) {
  return addDays(state.challengeStartDate, Math.max(0, Number(state.durationDays) - 1));
}

export function formatISOInputToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
