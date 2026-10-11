import { beforeEach, describe, expect, it } from 'vitest';
import { makeDemoState } from '../data/demoData.js';
import { financeReducer, createInitialFinanceState } from '../reducer/financeReducer.js';
import { buildCsv } from '../utils/csv.js';
import {
  isISODate,
  parseMoney,
  sanitizeEmail,
  sanitizeText,
  sanitizeStoredFinanceState,
} from './validation.js';

describe('input and persistence safeguards', () => {
  beforeEach(() => window.localStorage.clear());

  it('normalizes visible text, removes control and bidi override characters, and enforces a length cap', () => {
    expect(sanitizeText('  Cafe\u0301\u202E\n snack  ', 20)).toBe('Café snack');
    expect(sanitizeText('x'.repeat(200), 80)).toHaveLength(80);
  });

  it('accepts prototype email addresses and rejects markup/control injection', () => {
    expect(sanitizeEmail('  Alex@BrokeMode.demo ')).toBe('alex@brokemode.demo');
    expect(sanitizeEmail('<img>@example.com')).toBe('');
    expect(sanitizeEmail('alex@example.com\n<script>')).toBe('');
  });

  it('parses only bounded whole-rupee values and strict calendar dates', () => {
    expect(parseMoney('1.4', { min: 1 })).toBeNull();
    expect(parseMoney('1', { min: 1 })).toBe(1);
    expect(parseMoney('1000000001')).toBeNull();
    expect(parseMoney('Infinity')).toBeNull();
    expect(parseMoney('0', { min: 1 })).toBeNull();
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
  });

  it('drops malformed and duplicate ledger records while returning plain, whitelisted state', () => {
    const defaults = makeDemoState();
    const candidate = structuredClone(defaults);
    candidate.transactions.push({ ...candidate.transactions[0], description: '<img src=x onerror=alert(1)>', id: 'tx-01' });
    candidate.transactions.push({ id: 'bad/identifier', date: '2026-10-11', description: 'Injected', category: 'Other', amount: 1, type: 'expense' });
    candidate.profile = { name: '  Alex\u202E Morgan  ', email: 'alex@example.com', __proto__: { polluted: true } };
    const safe = sanitizeStoredFinanceState(candidate, defaults);
    expect(safe.transactions).toHaveLength(defaults.transactions.length);
    expect(safe.transactions[0].description).toBe('Weekly grocery run');
    expect(safe.profile.name).toBe('Alex Morgan');
    expect(Object.getPrototypeOf(safe.profile)).toBe(Object.prototype);
    expect(safe.preferences.currency).toBe('INR');
    expect(safe).not.toHaveProperty('unexpectedInjectedProperty');
  });

  it('rejects oversized challenge durations and resets malformed persisted data', () => {
    const candidate = makeDemoState();
    candidate.durationDays = Number.MAX_SAFE_INTEGER;
    expect(sanitizeStoredFinanceState(candidate, makeDemoState())).toBeNull();

    window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(candidate));
    expect(createInitialFinanceState().durationDays).toBe(30);
    expect(window.localStorage.getItem('brokemode-finance:v1')).toBeNull();
  });

  it('rejects invalid reducer writes and unsupported preference keys', () => {
    const state = makeDemoState();
    expect(financeReducer(state, { type: 'SET_STARTING_BUDGET', amount: 1e300 })).toBe(state);
    expect(financeReducer(state, { type: 'SET_PREFERENCE', key: 'unexpected', value: '<script>' })).toBe(state);
    expect(financeReducer(state, { type: 'ADD_TRANSACTION', transaction: { id: 'bad/id', date: state.currentDate, description: 'bad', category: 'Other', amount: 100, type: 'expense' } })).toBe(state);
  });

  it('sanitizes goal updates before adding them to state', () => {
    const state = makeDemoState();
    const next = financeReducer(state, {
      type: 'UPSERT_GOAL',
      goal: { id: 'goal-travel', name: '  Weekend trip  ', target: 5000, savedAtStart: 0, targetDate: state.currentDate, icon: 'sparkles' },
    });
    expect(next.goals).toHaveLength(state.goals.length + 1);
    expect(next.goals.at(-1)).toEqual({ id: 'goal-travel', name: 'Weekend trip', target: 5000, savedAtStart: 0, targetDate: state.currentDate, icon: 'sparkles' });

    const rejected = financeReducer(state, { type: 'UPSERT_GOAL', goal: { id: 'goal-invalid', name: 'Missing target date', target: 5000, savedAtStart: 0, icon: 'sparkles' } });
    expect(rejected).toBe(state);
  });

  it('escapes CSV syntax and neutralizes spreadsheet-formula cells', () => {
    const csv = buildCsv(['Description', 'Amount'], [['=HYPERLINK("https://evil.example")', 123]], { bom: false });
    expect(csv).toContain('"\'=HYPERLINK(""https://evil.example"")"');
    expect(csv).toContain('"123"');
    expect(csv).not.toContain(',"=HYPERLINK');
  });
});
