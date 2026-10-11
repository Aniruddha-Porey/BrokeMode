import { addFrequency } from '../finance/dates.js';
import { makeDemoState, makeFreshChallenge } from '../data/demoData.js';
import { addDecisionToState } from '../finance/calculations.js';

export function createInitialFinanceState() {
  if (typeof window === 'undefined') return makeDemoState();
  try {
    const raw = window.localStorage.getItem('brokemode-finance:v1');
    if (!raw) return makeDemoState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets) || !Array.isArray(parsed.goals) || !Array.isArray(parsed.bills)) return makeDemoState();
    if (!Number.isFinite(Number(parsed.startingBudget)) || Number(parsed.startingBudget) < 0 || !isISODate(parsed.challengeStartDate) || !isISODate(parsed.currentDate) || parsed.currentDate < parsed.challengeStartDate || !Number.isInteger(Number(parsed.durationDays)) || Number(parsed.durationDays) < 1) return makeDemoState();
    if (!parsed.transactions.every(validTransaction) || !parsed.budgets.every(validBudget) || !parsed.goals.every(validGoal) || !parsed.bills.every(validBill)) return makeDemoState();
    const defaults = makeDemoState();
    const preferences = { ...defaults.preferences, ...(parsed.preferences && typeof parsed.preferences === 'object' ? parsed.preferences : {}) };
    if (!['dark', 'light'].includes(preferences.appearance) || !['steady', 'conservative', 'optimistic'].includes(preferences.forecastStyle) || typeof preferences.notifications !== 'boolean') return makeDemoState();
    return {
      ...defaults,
      ...parsed,
      appliedDecisionIds: Array.isArray(parsed.appliedDecisionIds) ? parsed.appliedDecisionIds.filter((id) => typeof id === 'string') : [],
      profile: { ...defaults.profile, ...(parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {}) },
      preferences,
    };
  } catch {
    try { window.localStorage.removeItem('brokemode-finance:v1'); } catch { /* storage may be unavailable */ }
    return makeDemoState();
  }
}

const withArray = (list, item) => [...(list || []), item];
const isISODate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validTransaction = (item) => item && typeof item.id === 'string' && typeof item.description === 'string' && typeof item.category === 'string' && ['expense', 'income', 'transfer'].includes(item.type) && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 && isISODate(item.date);
const validBudget = (item) => item && typeof item.id === 'string' && typeof item.category === 'string' && Number.isFinite(Number(item.limit)) && Number(item.limit) >= 0;
const validGoal = (item) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(Number(item.target)) && Number(item.target) >= 0 && Number.isFinite(Number(item.savedAtStart)) && isISODate(item.targetDate);
const validBill = (item) => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 && isISODate(item.nextDueDate) && ['once', 'weekly', 'monthly', 'yearly'].includes(item.recurrence) && ['active', 'pending', 'paid', 'cancelled'].includes(item.status);

function reverseLinkedBillPayment(bills, transaction) {
  if (!transaction?.billId || transaction.type !== 'expense') return bills;
  return bills.map((bill) => {
    if (bill.id !== transaction.billId || bill.status === 'cancelled') return bill;
    const recurring = bill.recurrence && bill.recurrence !== 'once';
    if (!recurring) return { ...bill, status: 'pending', lastPaidDate: null };
    if (bill.lastPaidDate !== transaction.date) return bill;
    return { ...bill, status: 'active', nextDueDate: transaction.billDueDate || bill.nextDueDate, lastPaidDate: null };
  });
}

export function financeReducer(state, action) {
  switch (action.type) {
    case 'RESET_DEMO':
      return makeDemoState();
    case 'START_NEW_CHALLENGE': {
      const fresh = makeFreshChallenge(action.priority || 'emergency');
      return { ...fresh, profile: { ...fresh.profile, ...(action.profile || {}) } };
    }
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true, priority: action.priority || state.priority, scenario: 'new' };
    case 'SET_STARTING_BUDGET':
      return { ...state, startingBudget: Math.max(0, Math.round(Number(action.amount) || 0)) };
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.date };
    case 'SET_CHALLENGE_DAY':
      return { ...state, currentDate: action.date };
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...(action.profile || {}) } };
    case 'SET_PRIORITY':
      return { ...state, priority: action.priority };
    case 'SET_PREFERENCE':
      return { ...state, preferences: { ...state.preferences, [action.key]: action.value } };
    case 'APPLY_DECISION': {
      const decisionId = action.proposal?.decisionId;
      if (decisionId && (state.appliedDecisionIds || []).includes(decisionId)) return state;
      let nextState;
      if (action.proposal?.kind === 'cancel') {
        nextState = { ...state, bills: state.bills.map((bill) => bill.id === action.proposal.billId ? { ...bill, status: 'cancelled', cancelledDate: state.currentDate } : bill) };
      } else {
        nextState = addDecisionToState(state, action.proposal);
      }
      return decisionId ? { ...nextState, appliedDecisionIds: [...(state.appliedDecisionIds || []), decisionId] } : nextState;
    }
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.transaction, ...state.transactions] };
    case 'UPDATE_TRANSACTION': {
      const previous = state.transactions.find((item) => item.id === action.transaction.id);
      const updated = previous ? { ...previous, ...action.transaction } : action.transaction;
      let bills = state.bills;
      if (previous?.billId && previous.type === 'expense' && updated.type !== 'expense') bills = reverseLinkedBillPayment(bills, previous);
      else if (previous?.billId && previous.type === 'expense' && previous.date !== updated.date) {
        bills = bills.map((bill) => bill.id === previous.billId && bill.lastPaidDate === previous.date ? { ...bill, lastPaidDate: updated.date } : bill);
      }
      return { ...state, bills, transactions: state.transactions.map((item) => item.id === action.transaction.id ? updated : item) };
    }
    case 'DELETE_TRANSACTION': {
      const removed = state.transactions.find((item) => item.id === action.id);
      return { ...state, bills: reverseLinkedBillPayment(state.bills, removed), transactions: state.transactions.filter((item) => item.id !== action.id) };
    }
    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map((item) => item.id === action.budget.id ? { ...item, ...action.budget } : item) };
    case 'ADD_BUDGET':
      return { ...state, budgets: withArray(state.budgets, action.budget) };
    case 'UPSERT_GOAL': {
      const exists = state.goals.some((goal) => goal.id === action.goal.id);
      return { ...state, goals: exists ? state.goals.map((goal) => goal.id === action.goal.id ? { ...goal, ...action.goal } : goal) : withArray(state.goals, action.goal) };
    }
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((goal) => goal.id !== action.id) };
    case 'ADD_BILL':
      return { ...state, bills: [action.bill, ...state.bills] };
    case 'UPDATE_BILL':
      return { ...state, bills: state.bills.map((bill) => bill.id === action.bill.id ? { ...bill, ...action.bill } : bill) };
    case 'DELETE_BILL':
      return { ...state, bills: state.bills.filter((bill) => bill.id !== action.id) };
    case 'CANCEL_BILL':
      return { ...state, bills: state.bills.map((bill) => bill.id === action.id ? { ...bill, status: 'cancelled', cancelledDate: state.currentDate } : bill) };
    case 'PAY_BILL': {
      const bill = state.bills.find((item) => item.id === action.id);
      if (!bill || bill.status === 'cancelled' || bill.status === 'paid' || bill.lastPaidDate === state.currentDate) return state;
      const transaction = { ...action.transaction, billDueDate: action.transaction?.billDueDate || bill.nextDueDate || state.currentDate };
      const isRecurring = bill.recurrence && bill.recurrence !== 'once';
      const nextBills = state.bills.map((item) => item.id !== action.id ? item : isRecurring
        ? { ...item, nextDueDate: addFrequency(item.nextDueDate || state.currentDate, item.recurrence), lastPaidDate: state.currentDate, status: 'active' }
        : { ...item, status: 'paid', lastPaidDate: state.currentDate });
      return { ...state, transactions: [transaction, ...state.transactions], bills: nextBills };
    }
    default:
      return state;
  }
}
