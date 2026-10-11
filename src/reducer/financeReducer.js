import { addDays, addFrequency } from '../finance/dates.js';
import { makeDemoState, makeFreshChallenge } from '../data/demoData.js';
import { addDecisionToState } from '../finance/calculations.js';
import {
  ALLOWED_APPEARANCES,
  ALLOWED_FORECAST_STYLES,
  ALLOWED_PRIORITIES,
  ALLOWED_RECURRENCES,
  MAX_APPLIED_DECISIONS,
  MAX_BILLS,
  MAX_BUDGETS,
  MAX_FINANCIAL_AMOUNT,
  MAX_GOALS,
  MAX_PERSISTED_CHARS,
  MAX_TRANSACTIONS,
  isISODate,
  parseMoney,
  sanitizeBill,
  sanitizeBudget,
  sanitizeGoal,
  sanitizeId,
  sanitizeProfile,
  sanitizeStoredFinanceState,
  sanitizeText,
  sanitizeTransaction,
} from '../finance/validation.js';

const FINANCE_KEY = 'brokemode-finance:v1';
const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
const withinStateDates = (value, state) => isISODate(value)
  && value >= state.challengeStartDate
  && value <= addDays(state.challengeStartDate, state.durationDays - 1);

export function createInitialFinanceState() {
  const fallback = makeDemoState();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(FINANCE_KEY);
    if (!raw) return fallback;
    if (raw.length > MAX_PERSISTED_CHARS) {
      window.localStorage.removeItem(FINANCE_KEY);
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const restored = sanitizeStoredFinanceState(parsed, fallback);
    if (restored) return restored;
    try { window.localStorage.removeItem(FINANCE_KEY); } catch { /* Storage may be unavailable. */ }
    return fallback;
  } catch {
    try { window.localStorage.removeItem(FINANCE_KEY); } catch { /* Storage may be unavailable. */ }
    return fallback;
  }
}

const withArray = (list, item) => [...(Array.isArray(list) ? list : []), item];
const hasId = (list, id) => list.some((item) => item.id === id);
const categoryConflict = (list, item) => list.some((existing) => existing.id !== item.id && existing.category.toLocaleLowerCase() === item.category.toLocaleLowerCase());

function sanitizeDecisionProposal(proposal, state) {
  if (!isRecord(proposal)) return null;
  const decisionId = sanitizeId(proposal.decisionId);
  if (!decisionId) return null;

  if (proposal.kind === 'cancel') {
    const billId = sanitizeId(proposal.billId);
    const bill = state.bills.find((item) => item.id === billId);
    if (!bill || bill.status === 'cancelled' || bill.status === 'paid') return null;
    return { kind: 'cancel', decisionId, billId, name: bill.name };
  }
  if (proposal.kind !== 'purchase') return null;

  const description = sanitizeText(proposal.description, 120);
  const category = sanitizeText(proposal.category, 64) || 'Other';
  const amount = parseMoney(proposal.amount, { min: 1, max: 1_000_000 });
  const recurrence = ALLOWED_RECURRENCES.has(proposal.recurrence) ? proposal.recurrence : null;
  if (!description || amount === null || !recurrence) return null;

  const timing = proposal.timing === 'wait' ? 'wait' : 'now';
  const firstPaymentDate = timing === 'wait'
    ? addDays(state.currentDate, 7)
    : (isISODate(proposal.firstPaymentDate) && proposal.firstPaymentDate >= state.currentDate ? proposal.firstPaymentDate : state.currentDate);
  const goalId = sanitizeId(proposal.goalId);
  return {
    kind: 'purchase',
    decisionId,
    description,
    category,
    amount,
    recurrence,
    timing,
    firstPaymentDate,
    goalId: state.goals.some((goal) => goal.id === goalId) ? goalId : null,
  };
}

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
  if (!state || !action || typeof action.type !== 'string') return state;
  switch (action.type) {
    case 'RESET_DEMO':
      return makeDemoState();
    case 'START_NEW_CHALLENGE': {
      const priority = ALLOWED_PRIORITIES.has(action.priority) ? action.priority : 'emergency';
      const fresh = makeFreshChallenge(priority);
      return { ...fresh, profile: sanitizeProfile(action.profile, fresh.profile) };
    }
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true, priority: ALLOWED_PRIORITIES.has(action.priority) ? action.priority : state.priority, scenario: 'new' };
    case 'SET_STARTING_BUDGET': {
      const amount = parseMoney(action.amount, { max: MAX_FINANCIAL_AMOUNT });
      return amount === null ? state : { ...state, startingBudget: amount };
    }
    case 'SET_CURRENT_DATE':
    case 'SET_CHALLENGE_DAY':
      return withinStateDates(action.date, state) ? { ...state, currentDate: action.date } : state;
    case 'SET_PROFILE':
      return { ...state, profile: sanitizeProfile(action.profile, state.profile) };
    case 'SET_PRIORITY':
      return ALLOWED_PRIORITIES.has(action.priority) ? { ...state, priority: action.priority } : state;
    case 'SET_PREFERENCE': {
      const { key, value } = action;
      const valid = (key === 'appearance' && ALLOWED_APPEARANCES.has(value))
        || (key === 'forecastStyle' && ALLOWED_FORECAST_STYLES.has(value))
        || (key === 'notifications' && typeof value === 'boolean');
      return valid ? { ...state, preferences: { ...state.preferences, [key]: value } } : state;
    }
    case 'APPLY_DECISION': {
      const proposal = sanitizeDecisionProposal(action.proposal, state);
      if (!proposal || (state.appliedDecisionIds || []).includes(proposal.decisionId)) return state;
      if ((state.appliedDecisionIds || []).length >= MAX_APPLIED_DECISIONS) return state;
      let nextState;
      if (proposal.kind === 'cancel') {
        nextState = { ...state, bills: state.bills.map((bill) => bill.id === proposal.billId ? { ...bill, status: 'cancelled', cancelledDate: state.currentDate } : bill) };
      } else {
        const firstDate = proposal.timing === 'wait' ? addDays(state.currentDate, 7) : proposal.firstPaymentDate;
        const dueNow = firstDate <= state.currentDate;
        const createsBill = !dueNow || proposal.recurrence !== 'once';
        const transactionId = `${proposal.decisionId}-tx`;
        if (dueNow && state.transactions.length >= MAX_TRANSACTIONS) return state;
        if (createsBill && (state.bills.length >= MAX_BILLS || hasId(state.bills, proposal.decisionId))) return state;
        if (dueNow && (!sanitizeId(transactionId) || hasId(state.transactions, transactionId))) return state;
        nextState = addDecisionToState(state, proposal);
      }
      return { ...nextState, appliedDecisionIds: [...(state.appliedDecisionIds || []), proposal.decisionId] };
    }
    case 'ADD_TRANSACTION': {
      if (state.transactions.length >= MAX_TRANSACTIONS) return state;
      const transaction = sanitizeTransaction(action.transaction);
      if (!transaction || hasId(state.transactions, transaction.id)) return state;
      return { ...state, transactions: [transaction, ...state.transactions] };
    }
    case 'UPDATE_TRANSACTION': {
      const transaction = sanitizeTransaction(action.transaction);
      const previous = transaction && state.transactions.find((item) => item.id === transaction.id);
      if (!transaction || !previous) return state;
      let bills = state.bills;
      if (previous.billId && previous.type === 'expense' && (transaction.type !== 'expense' || transaction.billId !== previous.billId)) bills = reverseLinkedBillPayment(bills, previous);
      else if (previous.billId && previous.type === 'expense' && previous.date !== transaction.date) {
        bills = bills.map((bill) => bill.id === previous.billId && bill.lastPaidDate === previous.date ? { ...bill, lastPaidDate: transaction.date } : bill);
      }
      return { ...state, bills, transactions: state.transactions.map((item) => item.id === transaction.id ? transaction : item) };
    }
    case 'DELETE_TRANSACTION': {
      const id = sanitizeId(action.id);
      const removed = state.transactions.find((item) => item.id === id);
      if (!removed) return state;
      return { ...state, bills: reverseLinkedBillPayment(state.bills, removed), transactions: state.transactions.filter((item) => item.id !== id) };
    }
    case 'UPDATE_BUDGET': {
      const budget = sanitizeBudget(action.budget);
      if (!budget || !hasId(state.budgets, budget.id) || categoryConflict(state.budgets, budget)) return state;
      return { ...state, budgets: state.budgets.map((item) => item.id === budget.id ? budget : item) };
    }
    case 'ADD_BUDGET': {
      if (state.budgets.length >= MAX_BUDGETS) return state;
      const budget = sanitizeBudget(action.budget);
      if (!budget || hasId(state.budgets, budget.id) || categoryConflict(state.budgets, budget)) return state;
      return { ...state, budgets: withArray(state.budgets, budget) };
    }
    case 'UPSERT_GOAL': {
      const goal = sanitizeGoal(action.goal);
      if (!goal) return state;
      const exists = hasId(state.goals, goal.id);
      if (!exists && state.goals.length >= MAX_GOALS) return state;
      return { ...state, goals: exists ? state.goals.map((item) => item.id === goal.id ? goal : item) : withArray(state.goals, goal) };
    }
    case 'DELETE_GOAL': {
      const id = sanitizeId(action.id);
      return id ? { ...state, goals: state.goals.filter((goal) => goal.id !== id) } : state;
    }
    case 'ADD_BILL': {
      if (state.bills.length >= MAX_BILLS) return state;
      const bill = sanitizeBill(action.bill);
      if (!bill || hasId(state.bills, bill.id)) return state;
      return { ...state, bills: [bill, ...state.bills] };
    }
    case 'UPDATE_BILL': {
      const bill = sanitizeBill(action.bill);
      if (!bill || !hasId(state.bills, bill.id)) return state;
      return { ...state, bills: state.bills.map((item) => item.id === bill.id ? bill : item) };
    }
    case 'DELETE_BILL': {
      const id = sanitizeId(action.id);
      return id ? { ...state, bills: state.bills.filter((bill) => bill.id !== id) } : state;
    }
    case 'CANCEL_BILL': {
      const id = sanitizeId(action.id);
      const bill = state.bills.find((item) => item.id === id);
      if (!bill || bill.status === 'cancelled' || bill.status === 'paid') return state;
      return { ...state, bills: state.bills.map((item) => item.id === id ? { ...item, status: 'cancelled', cancelledDate: state.currentDate } : item) };
    }
    case 'PAY_BILL': {
      const id = sanitizeId(action.id);
      const bill = state.bills.find((item) => item.id === id);
      if (!bill || bill.status === 'cancelled' || bill.status === 'paid' || bill.lastPaidDate === state.currentDate || state.transactions.length >= MAX_TRANSACTIONS) return state;
      const transaction = sanitizeTransaction({
        id: action.transaction?.id,
        date: state.currentDate,
        description: bill.name,
        category: bill.category,
        amount: bill.amount,
        type: 'expense',
        billId: bill.id,
        billDueDate: bill.nextDueDate,
      });
      if (!transaction || hasId(state.transactions, transaction.id)) return state;
      const recurring = bill.recurrence !== 'once';
      const bills = state.bills.map((item) => item.id !== id ? item : recurring
        ? { ...item, nextDueDate: addFrequency(item.nextDueDate || state.currentDate, item.recurrence), lastPaidDate: state.currentDate, status: 'active' }
        : { ...item, status: 'paid', lastPaidDate: state.currentDate });
      return { ...state, transactions: [transaction, ...state.transactions], bills };
    }
    default:
      return state;
  }
}
