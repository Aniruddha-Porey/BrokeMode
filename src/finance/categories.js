import { CATEGORIES } from '../data/demoData.js';

export function categoriesForState(state) {
  const custom = [
    ...(state?.budgets || []).map((item) => item.category),
    ...(state?.bills || []).map((item) => item.category),
    ...(state?.transactions || []).filter((item) => item.type === 'expense').map((item) => item.category),
  ].filter((item) => typeof item === 'string' && item.trim());
  return [...new Set([...CATEGORIES, ...custom])];
}
