import { addDays } from './dates.js';

const MAX_AMOUNT = 1_000_000_000;
const MAX_ID_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 120;
const MAX_CATEGORY_LENGTH = 64;
const MAX_NAME_LENGTH = 80;

// Intentional sanitizer: these control and bidirectional-format characters are stripped from untrusted text.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const TRANSACTION_TYPES = new Set(['expense', 'income', 'transfer']);
const RECURRENCES = new Set(['once', 'weekly', 'monthly', 'yearly']);
const BILL_STATUSES = new Set(['active', 'pending', 'paid', 'cancelled']);
const BILL_KINDS = new Set(['bill', 'subscription']);
const GOAL_ICONS = new Set(['shield', 'smartphone', 'sparkles']);

export const MAX_CHALLENGE_DAYS = 366;
export const MAX_TRANSACTIONS = 5000;
export const MAX_BUDGETS = 100;
export const MAX_GOALS = 100;
export const MAX_BILLS = 500;
export const MAX_APPLIED_DECISIONS = 1000;
export const MAX_FINANCIAL_AMOUNT = MAX_AMOUNT;
export const MAX_PERSISTED_CHARS = 2_000_000;

export function sanitizeText(value, maxLength = MAX_DESCRIPTION_LENGTH) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeId(value) {
  if (typeof value !== 'string') return '';
  const id = value.trim();
  return id.length <= MAX_ID_LENGTH && ID_PATTERN.test(id) ? id : '';
}

export function parseMoney(value, { min = 0, max = MAX_AMOUNT } = {}) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}

export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function sanitizeEmail(value, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (!email && allowEmpty) return '';
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : '';
}

export function sanitizeProfile(value, fallback = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const fallbackName = sanitizeText(fallback.name, MAX_NAME_LENGTH);
  const fallbackEmail = sanitizeEmail(fallback.email, { allowEmpty: true });
  const name = sanitizeText(input.name, MAX_NAME_LENGTH) || fallbackName;
  const hasEmail = typeof input.email === 'string';
  const parsedEmail = hasEmail ? sanitizeEmail(input.email, { allowEmpty: true }) : fallbackEmail;
  const email = parsedEmail || (hasEmail && input.email.trim() === '' ? '' : fallbackEmail);
  return { name, email };
}

export function sanitizeTransaction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = sanitizeId(value.id);
  const description = sanitizeText(value.description, MAX_DESCRIPTION_LENGTH);
  const category = sanitizeText(value.category, MAX_CATEGORY_LENGTH);
  const amount = parseMoney(value.amount, { min: 1 });
  if (!id || !description || !category || amount === null || !TRANSACTION_TYPES.has(value.type) || !isISODate(value.date)) return null;

  const transaction = { id, date: value.date, description, category, amount, type: value.type, status: 'cleared' };
  const goalId = sanitizeId(value.goalId);
  const billId = sanitizeId(value.billId);
  if (goalId) transaction.goalId = goalId;
  if (billId) transaction.billId = billId;
  if (isISODate(value.billDueDate)) transaction.billDueDate = value.billDueDate;
  if (value.excludeFromForecastPace === true) transaction.excludeFromForecastPace = true;
  return transaction;
}

export function sanitizeBudget(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = sanitizeId(value.id);
  const category = sanitizeText(value.category, MAX_CATEGORY_LENGTH);
  const limit = parseMoney(value.limit);
  if (!id || !category || limit === null) return null;
  return { id, category, limit };
}

export function sanitizeGoal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = sanitizeId(value.id);
  const name = sanitizeText(value.name, MAX_NAME_LENGTH);
  const target = parseMoney(value.target, { min: 1 });
  const savedAtStart = parseMoney(value.savedAtStart);
  if (!id || !name || target === null || savedAtStart === null || !isISODate(value.targetDate)) return null;
  const icon = GOAL_ICONS.has(value.icon) ? value.icon : 'sparkles';
  return { id, name, target, savedAtStart, targetDate: value.targetDate, icon };
}

export function sanitizeBill(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = sanitizeId(value.id);
  const name = sanitizeText(value.name, MAX_NAME_LENGTH);
  const category = sanitizeText(value.category, MAX_CATEGORY_LENGTH) || 'Bills & subscriptions';
  const amount = parseMoney(value.amount, { min: 1 });
  if (!id || !name || amount === null || !isISODate(value.nextDueDate) || !RECURRENCES.has(value.recurrence) || !BILL_STATUSES.has(value.status)) return null;
  const bill = {
    id,
    name,
    category,
    amount,
    recurrence: value.recurrence,
    nextDueDate: value.nextDueDate,
    status: value.status,
    kind: BILL_KINDS.has(value.kind) ? value.kind : 'bill',
    lastPaidDate: isISODate(value.lastPaidDate) ? value.lastPaidDate : null,
  };
  if (isISODate(value.cancelledDate)) bill.cancelledDate = value.cancelledDate;
  return bill;
}

export function uniqueById(values, maxItems, sanitizer) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const result = [];
  for (const item of values.slice(0, maxItems)) {
    const safe = sanitizer(item);
    if (!safe || seen.has(safe.id)) continue;
    seen.add(safe.id);
    result.push(safe);
  }
  return result;
}

export function sanitizeStoredFinanceState(candidate, defaults) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || candidate.version !== 1) return null;
  if (!Array.isArray(candidate.transactions) || !Array.isArray(candidate.budgets) || !Array.isArray(candidate.goals) || !Array.isArray(candidate.bills)) return null;

  const startingBudget = parseMoney(candidate.startingBudget);
  const durationDays = Number(candidate.durationDays);
  const challengeStartDate = candidate.challengeStartDate;
  const currentDate = candidate.currentDate;
  if (startingBudget === null || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_CHALLENGE_DAYS || !isISODate(challengeStartDate) || !isISODate(currentDate)) return null;
  const challengeEndDate = addDays(challengeStartDate, durationDays - 1);
  if (currentDate < challengeStartDate || currentDate > challengeEndDate) return null;

  const rawPreferences = candidate.preferences && typeof candidate.preferences === 'object' && !Array.isArray(candidate.preferences) ? candidate.preferences : {};
  const appearance = rawPreferences.appearance === 'light' ? 'light' : rawPreferences.appearance === 'dark' ? 'dark' : defaults.preferences.appearance;
  const forecastStyle = ['steady', 'conservative', 'optimistic'].includes(rawPreferences.forecastStyle) ? rawPreferences.forecastStyle : defaults.preferences.forecastStyle;
  const notifications = typeof rawPreferences.notifications === 'boolean' ? rawPreferences.notifications : defaults.preferences.notifications;
  const rawProfile = candidate.profile && typeof candidate.profile === 'object' && !Array.isArray(candidate.profile) ? candidate.profile : {};
  const profile = sanitizeProfile(rawProfile, defaults.profile);
  const appliedDecisionIds = [...new Set((Array.isArray(candidate.appliedDecisionIds) ? candidate.appliedDecisionIds : [])
    .map(sanitizeId).filter(Boolean))].slice(0, MAX_APPLIED_DECISIONS);
  const scenario = candidate.scenario === 'new' || candidate.scenario === 'demo' ? candidate.scenario : defaults.scenario;
  const priority = typeof candidate.priority === 'string' && ['emergency', 'everyday', 'subscriptions', 'purchase'].includes(candidate.priority) ? candidate.priority : defaults.priority;

  return {
    ...defaults,
    version: 1,
    scenario,
    startingBudget,
    durationDays,
    challengeStartDate,
    currentDate,
    transactions: uniqueById(candidate.transactions, MAX_TRANSACTIONS, sanitizeTransaction),
    appliedDecisionIds,
    budgets: uniqueById(candidate.budgets, MAX_BUDGETS, sanitizeBudget),
    goals: uniqueById(candidate.goals, MAX_GOALS, sanitizeGoal),
    bills: uniqueById(candidate.bills, MAX_BILLS, sanitizeBill),
    priority,
    profile,
    preferences: { appearance, currency: 'INR', forecastStyle, notifications },
    onboardingComplete: typeof candidate.onboardingComplete === 'boolean' ? candidate.onboardingComplete : defaults.onboardingComplete,
  };
}

export const ALLOWED_PRIORITIES = new Set(['emergency', 'everyday', 'subscriptions', 'purchase']);
export const ALLOWED_APPEARANCES = new Set(['dark', 'light']);
export const ALLOWED_FORECAST_STYLES = new Set(['steady', 'conservative', 'optimistic']);
export const ALLOWED_TRANSACTION_TYPES = TRANSACTION_TYPES;
export const ALLOWED_RECURRENCES = RECURRENCES;
