import { beforeEach, describe, expect, it } from 'vitest';
import { makeDemoState } from '../data/demoData.js';
import { calculateFinance, getGoalStats, getBillOccurrences, makeDecisionScenario } from './calculations.js';
import { financeReducer, createInitialFinanceState } from '../reducer/financeReducer.js';
import { filterTransactions, sortTransactions } from './transactionFilters.js';

const expense = (id, amount, date = '2026-10-11', category = 'Other') => ({ id, date, description: `Test ${id}`, category, amount, type: 'expense', status: 'cleared' });

describe('BrokeMode financial model', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts with the consistent day-12 ₹10,000 challenge scenario', () => {
    const state = makeDemoState();
    const summary = calculateFinance(state);
    expect(summary.startingBudget).toBe(10000);
    expect(summary.challengeDay).toBe(12);
    expect(summary.durationDays).toBe(30);
    expect(summary.recordedExpenses).toBe(3550);
    expect(summary.spendableBalance).toBe(6450);
    expect(summary.upcomingCommitments).toBe(999);
    expect(summary.dailyAllowance).toBe(286);
    expect(summary.projectedMonthEndBalance).toBe(651);
  });

  it('counts an expense once and reduces spendable balance once', () => {
    const state = makeDemoState();
    const next = financeReducer(state, { type: 'ADD_TRANSACTION', transaction: expense('tx-new', 250) });
    const summary = calculateFinance(next);
    expect(summary.recordedExpenses).toBe(3800);
    expect(summary.spendableBalance).toBe(6200);
  });

  it('income increases ledger and spendable balance', () => {
    const state = makeDemoState();
    const next = financeReducer(state, { type: 'ADD_TRANSACTION', transaction: { id: 'income-1', date: state.currentDate, description: 'Part-time shift', category: 'Income', amount: 1500, type: 'income' } });
    const summary = calculateFinance(next);
    expect(summary.income).toBe(1500);
    expect(summary.ledgerBalance).toBe(7950);
    expect(summary.spendableBalance).toBe(7950);
  });

  it('editing and deleting a transaction recalculate all totals', () => {
    const state = makeDemoState();
    const edited = financeReducer(state, { type: 'UPDATE_TRANSACTION', transaction: { ...state.transactions[0], amount: 700 } });
    expect(calculateFinance(edited).recordedExpenses).toBe(3630);
    expect(calculateFinance(edited).spendableBalance).toBe(6370);
    const deleted = financeReducer(edited, { type: 'DELETE_TRANSACTION', id: state.transactions[0].id });
    expect(calculateFinance(deleted).recordedExpenses).toBe(2930);
    expect(calculateFinance(deleted).spendableBalance).toBe(7070);
  });

  it('savings contributions grow goal progress without becoming consumption spending', () => {
    const state = makeDemoState();
    const next = financeReducer(state, { type: 'ADD_TRANSACTION', transaction: { id: 'save-1', date: state.currentDate, description: 'Emergency fund contribution', category: 'Savings transfer', amount: 400, type: 'transfer', goalId: 'goal-emergency' } });
    const summary = calculateFinance(next);
    expect(summary.recordedExpenses).toBe(3550);
    expect(summary.transfers).toBe(400);
    expect(summary.ledgerBalance).toBe(6450);
    expect(summary.spendableBalance).toBe(6050);
    expect(getGoalStats(next, next.goals[0]).saved).toBe(4600);
  });

  it('paying an upcoming bill records one expense and removes the paid due from commitments', () => {
    const state = makeDemoState();
    const phone = state.bills.find((bill) => bill.id === 'bill-phone');
    const next = financeReducer(state, { type: 'PAY_BILL', id: phone.id, transaction: { id: 'paid-phone', date: state.currentDate, description: phone.name, category: phone.category, amount: phone.amount, type: 'expense', billId: phone.id } });
    expect(calculateFinance(state).upcomingCommitments).toBe(999);
    expect(calculateFinance(next).upcomingCommitments).toBe(600);
    expect(calculateFinance(next).recordedExpenses).toBe(3949);
    const repeated = financeReducer(next, { type: 'PAY_BILL', id: phone.id, transaction: { id: 'paid-phone-duplicate', date: state.currentDate, description: phone.name, category: phone.category, amount: phone.amount, type: 'expense', billId: phone.id } });
    expect(repeated.transactions.filter((item) => item.billId === phone.id)).toHaveLength(1);
  });

  it('cancelling a subscription prevents future charges but keeps historical transactions', () => {
    const state = makeDemoState();
    const next = financeReducer(state, { type: 'CANCEL_BILL', id: 'bill-music' });
    expect(calculateFinance(state).upcomingCommitments).toBe(999);
    expect(calculateFinance(next).upcomingCommitments).toBe(850);
    expect(calculateFinance(next).monthlyCommitments).toBe(1200);
    expect(next.transactions).toHaveLength(state.transactions.length);
  });

  it('does not count a paid recurring transaction again as a future payment', () => {
    const state = makeDemoState();
    const summary = calculateFinance(state);
    expect(summary.recordedExpenses).toBe(3550); // includes the paid gym payment once
    expect(summary.upcomingCommitments).toBe(999); // gym renewal is after day 30
    expect(summary.monthlyCommitments).toBe(1349); // active subscriptions are shown separately
    expect(getBillOccurrences(state).some((item) => item.billId === 'bill-gym')).toBe(false);
  });

  it('keeps a Decision Lab preview separate from actual financial data', () => {
    const state = makeDemoState();
    const proposal = { decisionId: 'preview-1', kind: 'purchase', description: 'Headphones', category: 'Shopping', amount: 1200, recurrence: 'once', timing: 'now', firstPaymentDate: state.currentDate };
    const scenario = makeDecisionScenario(state, proposal);
    const preview = calculateFinance(state, scenario);
    expect(preview.spendableBalance).toBe(5250);
    expect(calculateFinance(state).spendableBalance).toBe(6450);
    expect(state.transactions).toHaveLength(13);
  });

  it('keeps the applied decision forecast aligned with its simulation preview', () => {
    const state = makeDemoState();
    const proposal = { decisionId: 'forecast-match', kind: 'purchase', description: 'Headphones', category: 'Shopping', amount: 1200, recurrence: 'once', timing: 'now', firstPaymentDate: state.currentDate };
    const preview = calculateFinance(state, makeDecisionScenario(state, proposal));
    const applied = financeReducer(state, { type: 'APPLY_DECISION', proposal });
    const committed = calculateFinance(applied);
    expect(committed.spendableBalance).toBe(preview.spendableBalance);
    expect(committed.projectedMonthEndBalance).toBe(preview.projectedMonthEndBalance);
    expect(committed.dailyAllowance).toBe(preview.dailyAllowance);
  });

  it('applies a decision once and blocks a duplicate submission', () => {
    const state = makeDemoState();
    const proposal = { decisionId: 'decision-once', kind: 'purchase', description: 'Headphones', category: 'Shopping', amount: 100, recurrence: 'once', timing: 'now', firstPaymentDate: state.currentDate };
    const applied = financeReducer(state, { type: 'APPLY_DECISION', proposal });
    const retried = financeReducer(applied, { type: 'APPLY_DECISION', proposal });
    expect(applied.transactions).toHaveLength(14);
    expect(retried).toBe(applied);
    expect(calculateFinance(applied).spendableBalance).toBe(6350);
  });

  it('discards a preview without changing actual balances, goals, or transaction history', () => {
    const state = makeDemoState();
    const before = JSON.stringify(state);
    const preview = calculateFinance(state, makeDecisionScenario(state, { kind: 'purchase', amount: 500, recurrence: 'once', timing: 'now', description: 'A preview' }));
    expect(preview.spendableBalance).toBe(5950);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.transactions).toHaveLength(13);
  });

  it('shows a negative forecast and a shortfall classification instead of clamping it', () => {
    const state = makeDemoState();
    const negative = { ...state, startingBudget: 2000 };
    const summary = calculateFinance(negative);
    expect(summary.projectedMonthEndBalance).toBeLessThan(0);
    expect(summary.risk.code).toBe('shortfall');
    expect(summary.risk.label).toBe('Shortfall risk');
  });

  it('filters by free-text search, type, category and date, then sorts', () => {
    const state = makeDemoState();
    const lunch = filterTransactions(state.transactions, { search: 'lunch', type: 'expense', challengeStartDate: state.challengeStartDate });
    expect(lunch.map((item) => item.id)).toEqual(['tx-02']);
    const groceries = filterTransactions(state.transactions, { category: 'Groceries', challengeStartDate: state.challengeStartDate });
    expect(groceries).toHaveLength(3);
    const recent = filterTransactions(state.transactions, { period: '7days', currentDate: state.currentDate, challengeStartDate: state.challengeStartDate });
    expect(recent.every((item) => item.date >= '2026-10-05')).toBe(true);
    expect(sortTransactions(state.transactions, 'highest')[0].amount).toBe(620);
  });

  it('restores versioned local data after refresh and falls back safely on corrupted JSON', () => {
    const state = makeDemoState();
    window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(state));
    expect(createInitialFinanceState().transactions).toHaveLength(13);
    window.localStorage.setItem('brokemode-finance:v1', '{broken');
    expect(createInitialFinanceState().startingBudget).toBe(10000);
  });

  it('reset restores the seeded day-12 demo scenario', () => {
    const state = { ...makeDemoState(), transactions: [] };
    const reset = financeReducer(state, { type: 'RESET_DEMO' });
    const summary = calculateFinance(reset);
    expect(summary.startingBudget).toBe(10000);
    expect(summary.recordedExpenses).toBe(3550);
    expect(summary.spendableBalance).toBe(6450);
    expect(summary.challengeDay).toBe(12);
  });
});
