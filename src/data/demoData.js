export const INITIAL_BUDGET = 10000;
export const CHALLENGE_DAYS = 30;
export const DATA_VERSION = 1;

const baseBudgets = [
  { id: 'budget-groceries', category: 'Groceries', limit: 2500 },
  { id: 'budget-food', category: 'Food & drink', limit: 1400 },
  { id: 'budget-transport', category: 'Transport', limit: 1100 },
  { id: 'budget-shopping', category: 'Shopping', limit: 1200 },
  { id: 'budget-bills', category: 'Bills & subscriptions', limit: 1800 },
  { id: 'budget-wellbeing', category: 'Wellbeing', limit: 1000 },
  { id: 'budget-other', category: 'Other', limit: 1000 },
];

const baseGoals = [
  { id: 'goal-emergency', name: 'Emergency fund', savedAtStart: 4200, target: 10000, targetDate: '2027-03-31', icon: 'shield' },
  { id: 'goal-phone', name: 'New phone', savedAtStart: 1850, target: 24000, targetDate: '2027-02-15', icon: 'smartphone' },
  { id: 'goal-personal', name: 'Personal goal', savedAtStart: 600, target: 5000, targetDate: '2026-12-30', icon: 'sparkles' },
];

const demoTransactions = [
  { id: 'tx-01', date: '2026-10-01', description: 'Weekly grocery run', category: 'Groceries', amount: 620, type: 'expense', status: 'cleared' },
  { id: 'tx-02', date: '2026-10-02', description: 'Lunch near campus', category: 'Food & drink', amount: 240, type: 'expense', status: 'cleared' },
  { id: 'tx-03', date: '2026-10-02', description: 'Household essentials', category: 'Shopping', amount: 320, type: 'expense', status: 'cleared' },
  { id: 'tx-04', date: '2026-10-03', description: 'Metro card top-up', category: 'Transport', amount: 240, type: 'expense', status: 'cleared' },
  { id: 'tx-05', date: '2026-10-04', description: 'Coffee & a snack', category: 'Food & drink', amount: 120, type: 'expense', status: 'cleared' },
  { id: 'tx-06', date: '2026-10-05', description: 'Market basket', category: 'Groceries', amount: 410, type: 'expense', status: 'cleared' },
  { id: 'tx-07', date: '2026-10-06', description: 'Ride share', category: 'Transport', amount: 190, type: 'expense', status: 'cleared' },
  { id: 'tx-08', date: '2026-10-06', description: 'Gym membership', category: 'Bills & subscriptions', amount: 350, type: 'expense', status: 'cleared', billId: 'bill-gym', billDueDate: '2026-10-06' },
  { id: 'tx-09', date: '2026-10-07', description: 'Dinner with friends', category: 'Food & drink', amount: 380, type: 'expense', status: 'cleared' },
  { id: 'tx-10', date: '2026-10-08', description: 'Notebook & supplies', category: 'Shopping', amount: 200, type: 'expense', status: 'cleared' },
  { id: 'tx-11', date: '2026-10-09', description: 'Bus pass', category: 'Transport', amount: 130, type: 'expense', status: 'cleared' },
  { id: 'tx-12', date: '2026-10-10', description: 'Produce run', category: 'Groceries', amount: 250, type: 'expense', status: 'cleared' },
  { id: 'tx-13', date: '2026-10-11', description: 'Weekend takeout', category: 'Food & drink', amount: 100, type: 'expense', status: 'cleared' },
];

const demoBills = [
  { id: 'bill-phone', name: 'Mobile plan', category: 'Bills & subscriptions', amount: 399, recurrence: 'monthly', nextDueDate: '2026-10-15', status: 'active', kind: 'subscription', lastPaidDate: null },
  { id: 'bill-music', name: 'Music plan', category: 'Bills & subscriptions', amount: 149, recurrence: 'monthly', nextDueDate: '2026-10-18', status: 'active', kind: 'subscription', lastPaidDate: null },
  { id: 'bill-internet', name: 'Home internet', category: 'Bills & subscriptions', amount: 451, recurrence: 'monthly', nextDueDate: '2026-10-24', status: 'active', kind: 'bill', lastPaidDate: null },
  { id: 'bill-gym', name: 'Gym membership', category: 'Bills & subscriptions', amount: 350, recurrence: 'monthly', nextDueDate: '2026-11-06', status: 'active', kind: 'subscription', lastPaidDate: '2026-10-06' },
  { id: 'bill-stream', name: 'Video streaming', category: 'Bills & subscriptions', amount: 299, recurrence: 'monthly', nextDueDate: '2026-10-16', status: 'cancelled', kind: 'subscription', lastPaidDate: null },
];

export function makeDemoState() {
  return {
    version: DATA_VERSION,
    scenario: 'demo',
    startingBudget: INITIAL_BUDGET,
    durationDays: CHALLENGE_DAYS,
    challengeStartDate: '2026-09-30',
    currentDate: '2026-10-11',
    transactions: demoTransactions.map((item) => ({ ...item })),
    appliedDecisionIds: [],
    budgets: baseBudgets.map((item) => ({ ...item })),
    goals: baseGoals.map((item) => ({ ...item })),
    bills: demoBills.map((item) => ({ ...item })),
    priority: 'everyday',
    profile: { name: 'Alex Morgan', email: 'alex@brokemode.demo' },
    preferences: { appearance: 'dark', currency: 'INR', forecastStyle: 'steady', notifications: true },
    onboardingComplete: true,
  };
}

export function makeFreshChallenge(priority = 'emergency') {
  return {
    version: DATA_VERSION,
    scenario: 'new',
    startingBudget: INITIAL_BUDGET,
    durationDays: CHALLENGE_DAYS,
    challengeStartDate: '2026-10-11',
    currentDate: '2026-10-11',
    transactions: [],
    appliedDecisionIds: [],
    budgets: baseBudgets.map((item) => ({ ...item })),
    goals: baseGoals.map((goal) => ({ ...goal, savedAtStart: 0 })),
    bills: [],
    priority,
    profile: { name: 'Your profile', email: '' },
    preferences: { appearance: 'dark', currency: 'INR', forecastStyle: 'steady', notifications: true },
    onboardingComplete: false,
  };
}

export const CATEGORIES = [
  'Groceries', 'Food & drink', 'Transport', 'Shopping', 'Bills & subscriptions', 'Wellbeing', 'Other',
];

export const CATEGORY_COLORS = {
  'Groceries': '#C4F36B',
  'Food & drink': '#9B87F5',
  'Transport': '#79B8FF',
  'Shopping': '#F5BE62',
  'Bills & subscriptions': '#6ED8C4',
  'Wellbeing': '#E99AD7',
  'Other': '#9299AB',
};
