import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDemoState } from '../data/demoData.js';
import { MAX_APPLIED_DECISIONS, MAX_BILLS, MAX_BUDGETS, MAX_GOALS, MAX_TRANSACTIONS } from '../finance/validation.js';
import { createInitialFinanceState, financeReducer } from './financeReducer.js';

const testBill = (overrides = {}) => ({
  id: 'bill-test',
  name: 'Test payment',
  category: 'Bills & subscriptions',
  amount: 240,
  recurrence: 'once',
  nextDueDate: '2026-10-11',
  status: 'active',
  kind: 'bill',
  lastPaidDate: null,
  ...overrides,
});

const testTransaction = (overrides = {}) => ({
  id: 'tx-test-bill',
  date: '2026-10-11',
  description: 'Test payment',
  category: 'Bills & subscriptions',
  amount: 240,
  type: 'expense',
  billId: 'bill-test',
  billDueDate: '2026-10-11',
  ...overrides,
});

describe('finance reducer actions', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('restores valid persisted state, discards oversized data and supports server rendering', () => {
    const state = makeDemoState();
    state.startingBudget = 8200;
    window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(state));
    expect(createInitialFinanceState().startingBudget).toBe(8200);

    window.localStorage.setItem('brokemode-finance:v1', 'x'.repeat(2_000_001));
    expect(createInitialFinanceState().startingBudget).toBe(10000);
    expect(window.localStorage.getItem('brokemode-finance:v1')).toBeNull();

    vi.stubGlobal('window', undefined);
    expect(createInitialFinanceState().scenario).toBe('demo');
  });

  it('fails closed for malformed or unknown actions and resets only on request', () => {
    const state = makeDemoState();
    expect(financeReducer(null, { type: 'RESET_DEMO' })).toBeNull();
    expect(financeReducer(state, null)).toBe(state);
    expect(financeReducer(state, {})).toBe(state);
    expect(financeReducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
    const reset = financeReducer(state, { type: 'RESET_DEMO' });
    expect(reset).not.toBe(state);
    expect(reset.scenario).toBe('demo');
    expect(reset.transactions).toHaveLength(state.transactions.length);
  });

  it('rejects malformed decision proposals, invalid bill states and already-full decision history', () => {
    const state = makeDemoState();
    const invalidProposals = [
      null,
      [],
      { decisionId: 'decision-unsupported', kind: 'other' },
      { decisionId: 'decision-no-bill', kind: 'cancel', billId: 'missing-bill' },
      { decisionId: 'decision-cancelled-bill', kind: 'cancel', billId: 'bill-stream' },
      { decisionId: 'decision-invalid-purchase', kind: 'purchase', description: '', amount: 0, recurrence: 'once' },
    ];
    invalidProposals.forEach((proposal) => {
      expect(financeReducer(state, { type: 'APPLY_DECISION', proposal })).toBe(state);
    });

    const paidState = { ...state, bills: [...state.bills, testBill({ id: 'bill-paid-proposal', status: 'paid' })] };
    expect(financeReducer(paidState, { type: 'APPLY_DECISION', proposal: { decisionId: 'decision-paid-bill', kind: 'cancel', billId: 'bill-paid-proposal' } })).toBe(paidState);

    const fullHistory = { ...state, appliedDecisionIds: Array(MAX_APPLIED_DECISIONS).fill('old-decision') };
    expect(financeReducer(fullHistory, { type: 'APPLY_DECISION', proposal: { decisionId: 'decision-history-full', kind: 'purchase', description: 'Book', amount: 100, recurrence: 'once' } })).toBe(fullHistory);
  });

  it('enforces transaction, budget, goal and bill collection limits before writing', () => {
    const transaction = { id: 'tx-limit-check', date: '2026-10-11', description: 'Small item', category: 'Other', amount: 1, type: 'expense' };
    const fullTransactions = { ...makeDemoState(), transactions: Array(MAX_TRANSACTIONS).fill({ id: 'existing-transaction' }) };
    expect(financeReducer(fullTransactions, { type: 'ADD_TRANSACTION', transaction })).toBe(fullTransactions);
    expect(financeReducer(fullTransactions, { type: 'APPLY_DECISION', proposal: { decisionId: 'decision-tx-cap', kind: 'purchase', description: 'Book', amount: 100, recurrence: 'once' } })).toBe(fullTransactions);

    const fullBudgets = { ...makeDemoState(), budgets: Array(MAX_BUDGETS).fill({ id: 'existing-budget', category: 'Other', limit: 100 }) };
    expect(financeReducer(fullBudgets, { type: 'ADD_BUDGET', budget: { id: 'budget-over-cap', category: 'Books', limit: 100 } })).toBe(fullBudgets);
    const fullGoals = { ...makeDemoState(), goals: Array(MAX_GOALS).fill({ id: 'existing-goal' }) };
    expect(financeReducer(fullGoals, { type: 'UPSERT_GOAL', goal: { id: 'goal-over-cap', name: 'Trip', target: 1000, savedAtStart: 0, targetDate: '2027-01-01' } })).toBe(fullGoals);
    const fullBills = { ...makeDemoState(), bills: Array(MAX_BILLS).fill({ id: 'existing-bill' }) };
    expect(financeReducer(fullBills, { type: 'ADD_BILL', bill: testBill({ id: 'bill-over-cap' }) })).toBe(fullBills);
    expect(financeReducer(fullBills, { type: 'APPLY_DECISION', proposal: { decisionId: 'decision-bill-cap', kind: 'purchase', description: 'Waited purchase', amount: 100, recurrence: 'once', timing: 'wait' } })).toBe(fullBills);
  });

  it('starts a clean challenge, sanitizes its profile and validates onboarding priorities', () => {
    const state = makeDemoState();
    const fresh = financeReducer(state, {
      type: 'START_NEW_CHALLENGE',
      priority: 'unsupported',
      profile: { name: '  Priya Sen  ', email: 'PRIYA@example.com' },
    });
    expect(fresh.scenario).toBe('new');
    expect(fresh.priority).toBe('emergency');
    expect(fresh.profile).toEqual({ name: 'Priya Sen', email: 'priya@example.com' });
    expect(fresh.transactions).toEqual([]);
    expect(fresh.onboardingComplete).toBe(false);

    const selected = financeReducer(fresh, { type: 'COMPLETE_ONBOARDING', priority: 'purchase' });
    expect(selected.onboardingComplete).toBe(true);
    expect(selected.priority).toBe('purchase');
    const retained = financeReducer(selected, { type: 'COMPLETE_ONBOARDING', priority: 'invalid' });
    expect(retained.priority).toBe('purchase');
  });

  it('bounds budget/date writes and accepts only supported profile, priority and preference values', () => {
    const state = makeDemoState();
    const budgeted = financeReducer(state, { type: 'SET_STARTING_BUDGET', amount: 7500 });
    expect(budgeted.startingBudget).toBe(7500);
    expect(financeReducer(budgeted, { type: 'SET_STARTING_BUDGET', amount: 1e20 })).toBe(budgeted);

    const dated = financeReducer(state, { type: 'SET_CHALLENGE_DAY', date: '2026-10-14' });
    expect(dated.currentDate).toBe('2026-10-14');
    expect(financeReducer(dated, { type: 'SET_CURRENT_DATE', date: '2028-01-01' })).toBe(dated);

    expect(financeReducer(state, { type: 'SET_PROFILE', profile: { name: ' Alex ', email: 'alex@example.com' } }).profile).toEqual({ name: 'Alex', email: 'alex@example.com' });
    expect(financeReducer(state, { type: 'SET_PRIORITY', priority: 'everyday' }).priority).toBe('everyday');
    expect(financeReducer(state, { type: 'SET_PRIORITY', priority: 'root' })).toBe(state);
    expect(financeReducer(state, { type: 'SET_PREFERENCE', key: 'appearance', value: 'light' }).preferences.appearance).toBe('light');
    expect(financeReducer(state, { type: 'SET_PREFERENCE', key: 'forecastStyle', value: 'conservative' }).preferences.forecastStyle).toBe('conservative');
    expect(financeReducer(state, { type: 'SET_PREFERENCE', key: 'notifications', value: false }).preferences.notifications).toBe(false);
  });

  it('adds and updates budgets while rejecting duplicate IDs and category conflicts', () => {
    const state = makeDemoState();
    const budget = { id: 'budget-books', category: 'Books', limit: 500 };
    const added = financeReducer(state, { type: 'ADD_BUDGET', budget });
    expect(added.budgets.at(-1)).toEqual(budget);
    expect(financeReducer(added, { type: 'ADD_BUDGET', budget: { ...budget, category: 'Reading' } })).toBe(added);
    expect(financeReducer(added, { type: 'ADD_BUDGET', budget: { ...budget, id: 'budget-other', category: 'Books' } })).toBe(added);

    const first = state.budgets[0];
    const updated = financeReducer(state, { type: 'UPDATE_BUDGET', budget: { ...first, limit: 2250 } });
    expect(updated.budgets[0].limit).toBe(2250);
    expect(financeReducer(state, { type: 'UPDATE_BUDGET', budget: { ...first, id: 'missing-budget' } })).toBe(state);
  });

  it('upserts and deletes goals, retaining the current state for invalid IDs', () => {
    const state = makeDemoState();
    const goal = { id: 'goal-trip', name: 'Trip', target: 6000, savedAtStart: 0, targetDate: '2027-01-01', icon: 'sparkles' };
    const added = financeReducer(state, { type: 'UPSERT_GOAL', goal });
    expect(added.goals.at(-1).name).toBe('Trip');
    const updated = financeReducer(added, { type: 'UPSERT_GOAL', goal: { ...goal, name: 'Summer trip', target: 7000 } });
    expect(updated.goals.at(-1)).toMatchObject({ name: 'Summer trip', target: 7000 });
    const deleted = financeReducer(updated, { type: 'DELETE_GOAL', id: 'goal-trip' });
    expect(deleted.goals.some((item) => item.id === 'goal-trip')).toBe(false);
    expect(financeReducer(deleted, { type: 'DELETE_GOAL', id: 'bad/id' })).toBe(deleted);
  });

  it('adds, edits, cancels and deletes bills through sanitized reducer actions', () => {
    const state = makeDemoState();
    const added = financeReducer(state, { type: 'ADD_BILL', bill: testBill() });
    expect(added.bills[0]).toMatchObject({ id: 'bill-test', amount: 240, status: 'active' });
    expect(financeReducer(added, { type: 'ADD_BILL', bill: testBill() })).toBe(added);

    const updated = financeReducer(added, { type: 'UPDATE_BILL', bill: testBill({ amount: 360, name: 'Updated payment' }) });
    expect(updated.bills.find((bill) => bill.id === 'bill-test')).toMatchObject({ amount: 360, name: 'Updated payment' });
    expect(financeReducer(updated, { type: 'UPDATE_BILL', bill: testBill({ id: 'unknown-bill' }) })).toBe(updated);

    const cancelled = financeReducer(updated, { type: 'CANCEL_BILL', id: 'bill-test' });
    expect(cancelled.bills.find((bill) => bill.id === 'bill-test')).toMatchObject({ status: 'cancelled', cancelledDate: state.currentDate });
    expect(financeReducer(cancelled, { type: 'CANCEL_BILL', id: 'bill-test' })).toBe(cancelled);
    expect(financeReducer(cancelled, { type: 'DELETE_BILL', id: 'bill-test' }).bills.some((bill) => bill.id === 'bill-test')).toBe(false);
    expect(financeReducer(cancelled, { type: 'DELETE_BILL', id: 'bad/id' })).toBe(cancelled);
  });

  it('records one-time and recurring payments exactly once', () => {
    const state = makeDemoState();
    state.bills = [testBill(), testBill({ id: 'bill-monthly', recurrence: 'monthly' })];
    const once = financeReducer(state, { type: 'PAY_BILL', id: 'bill-test', transaction: { id: 'tx-once' } });
    expect(once.transactions[0]).toMatchObject({ id: 'tx-once', billId: 'bill-test', date: state.currentDate });
    expect(once.bills.find((bill) => bill.id === 'bill-test').status).toBe('paid');
    expect(financeReducer(once, { type: 'PAY_BILL', id: 'bill-test', transaction: { id: 'tx-once-repeat' } })).toBe(once);

    const monthly = financeReducer(state, { type: 'PAY_BILL', id: 'bill-monthly', transaction: { id: 'tx-monthly' } });
    expect(monthly.bills.find((bill) => bill.id === 'bill-monthly')).toMatchObject({ nextDueDate: '2026-11-11', lastPaidDate: state.currentDate, status: 'active' });
    expect(financeReducer(state, { type: 'PAY_BILL', id: 'bill-test', transaction: { id: 'bad/id' } })).toBe(state);
  });

  it('reverses linked bill state when a payment transaction is edited or deleted', () => {
    const state = makeDemoState();
    const paid = testBill({ status: 'paid', lastPaidDate: state.currentDate });
    state.bills = [...state.bills, paid];
    state.transactions = [testTransaction(), ...state.transactions];

    const deleted = financeReducer(state, { type: 'DELETE_TRANSACTION', id: 'tx-test-bill' });
    expect(deleted.bills.find((bill) => bill.id === 'bill-test')).toMatchObject({ status: 'pending', lastPaidDate: null });

    const recurringState = makeDemoState();
    recurringState.bills = [...recurringState.bills, testBill({ recurrence: 'monthly', status: 'active', nextDueDate: '2026-11-11', lastPaidDate: '2026-10-10' })];
    recurringState.transactions = [testTransaction({ date: '2026-10-10' }), ...recurringState.transactions];
    const changedDate = financeReducer(recurringState, { type: 'UPDATE_TRANSACTION', transaction: testTransaction({ date: '2026-10-11' }) });
    expect(changedDate.bills.find((bill) => bill.id === 'bill-test').lastPaidDate).toBe('2026-10-11');

    const changedType = financeReducer(state, { type: 'UPDATE_TRANSACTION', transaction: testTransaction({ type: 'income', category: 'Income' }) });
    expect(changedType.bills.find((bill) => bill.id === 'bill-test').status).toBe('pending');

    const recurringPaidState = makeDemoState();
    recurringPaidState.bills = [...recurringPaidState.bills, testBill({ recurrence: 'monthly', nextDueDate: '2026-11-11', lastPaidDate: recurringPaidState.currentDate })];
    recurringPaidState.transactions = [testTransaction(), ...recurringPaidState.transactions];
    const restoredRecurring = financeReducer(recurringPaidState, { type: 'DELETE_TRANSACTION', id: 'tx-test-bill' });
    expect(restoredRecurring.bills.find((bill) => bill.id === 'bill-test')).toMatchObject({ status: 'active', nextDueDate: '2026-10-11', lastPaidDate: null });

    const regularTransactionDelete = financeReducer(state, { type: 'DELETE_TRANSACTION', id: state.transactions[0].id });
    expect(regularTransactionDelete.transactions).toHaveLength(state.transactions.length - 1);
    expect(financeReducer(state, { type: 'DELETE_TRANSACTION', id: 'missing-tx' })).toBe(state);
  });

  it('applies valid wait and cancellation decisions once and rejects malformed proposals', () => {
    const state = makeDemoState();
    const wait = financeReducer(state, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'decision-wait-test', kind: 'purchase', description: 'A planned purchase', category: 'Shopping', amount: 400, recurrence: 'once', timing: 'wait',
    } });
    expect(wait.appliedDecisionIds).toContain('decision-wait-test');
    expect(wait.transactions).toHaveLength(state.transactions.length);
    expect(wait.bills.find((bill) => bill.id === 'decision-wait-test')).toMatchObject({ status: 'pending', nextDueDate: '2026-10-18' });

    const cancelled = financeReducer(state, { type: 'APPLY_DECISION', proposal: { decisionId: 'decision-cancel-test', kind: 'cancel', billId: 'bill-music' } });
    expect(cancelled.bills.find((bill) => bill.id === 'bill-music').status).toBe('cancelled');
    expect(financeReducer(state, { type: 'APPLY_DECISION', proposal: { decisionId: 'bad/id', kind: 'purchase' } })).toBe(state);

    const scheduled = financeReducer(state, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'decision-future-test', kind: 'purchase', description: 'Later purchase', amount: 250, recurrence: 'once', firstPaymentDate: '2026-10-18',
    } });
    expect(scheduled.transactions).toHaveLength(state.transactions.length);
    expect(scheduled.bills.find((bill) => bill.id === 'decision-future-test').nextDueDate).toBe('2026-10-18');

    const recurring = financeReducer(state, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'decision-recurring-test', kind: 'purchase', description: 'Weekly plan', amount: 150, recurrence: 'weekly', timing: 'now',
    } });
    expect(recurring.transactions).toHaveLength(state.transactions.length + 1);
    expect(recurring.bills.find((bill) => bill.id === 'decision-recurring-test')).toMatchObject({ status: 'active', nextDueDate: '2026-10-18' });

    const billCollision = { ...state, bills: [...state.bills, testBill({ id: 'decision-bill-collision' })] };
    expect(financeReducer(billCollision, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'decision-bill-collision', kind: 'purchase', description: 'Waited purchase', amount: 100, recurrence: 'once', timing: 'wait',
    } })).toBe(billCollision);
    const transactionCollision = { ...state, transactions: [...state.transactions, { id: 'decision-tx-collision-tx' }] };
    expect(financeReducer(transactionCollision, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'decision-tx-collision', kind: 'purchase', description: 'Book', amount: 100, recurrence: 'once', timing: 'now',
    } })).toBe(transactionCollision);
    expect(financeReducer(state, { type: 'APPLY_DECISION', proposal: {
      decisionId: 'x'.repeat(80), kind: 'purchase', description: 'Book', amount: 100, recurrence: 'once', timing: 'now',
    } })).toBe(state);
  });
});
