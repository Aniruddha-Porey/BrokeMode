import { addDays, compareDates } from './dates.js';

export function filterTransactions(transactions, filters = {}) {
  const { search = '', type = 'all', category = 'all', period = 'challenge', currentDate, challengeStartDate } = filters;
  const minDate = period === '7days' && currentDate ? addDays(currentDate, -6) : challengeStartDate;
  const query = String(search).trim().toLowerCase();
  return (transactions || []).filter((item) => {
    const haystack = `${item.description || ''} ${item.category || ''} ${item.date || ''}`.toLowerCase();
    return (!query || haystack.includes(query))
      && (type === 'all' || item.type === type)
      && (category === 'all' || item.category === category)
      && (!minDate || compareDates(item.date, minDate) >= 0);
  });
}

export function sortTransactions(transactions, sort = 'newest') {
  return [...(transactions || [])].sort((a, b) => {
    if (sort === 'oldest') return compareDates(a.date, b.date) || a.description.localeCompare(b.description);
    if (sort === 'highest') return b.amount - a.amount;
    if (sort === 'lowest') return a.amount - b.amount;
    return compareDates(b.date, a.date) || String(b.id).localeCompare(String(a.id));
  });
}
