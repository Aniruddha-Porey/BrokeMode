import { addDays, addFrequency, compareDates, daysBetween, getChallengeDay, getCycleEndDate } from './dates.js';

const sum = (items, pick = (item) => item.amount || 0) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getBillOccurrences(state, { cancelledBillIds = [] } = {}) {
  const endDate = getCycleEndDate(state);
  const currentDate = state.currentDate;
  const cancelled = new Set(cancelledBillIds);
  const occurrences = [];

  for (const bill of state.bills || []) {
    if (!bill || bill.status === 'cancelled' || bill.status === 'paid' || cancelled.has(bill.id)) continue;
    const recurring = bill.recurrence && bill.recurrence !== 'once';
    const recurrence = bill.recurrence || 'once';
    let due = bill.nextDueDate;
    if (!due || compareDates(due, endDate) > 0) continue;

    if (!recurring) {
      occurrences.push({
        id: `${bill.id}-${due}`,
        billId: bill.id,
        name: bill.name,
        category: bill.category || 'Bills & subscriptions',
        amount: Number(bill.amount) || 0,
        date: due,
        recurrence,
        kind: bill.kind || 'bill',
        isOverdue: compareDates(due, currentDate) < 0,
        scenario: false,
      });
      continue;
    }

    let count = 0;
    while (due && compareDates(due, endDate) <= 0 && count < 100) {
      {
        occurrences.push({
          id: `${bill.id}-${due}`,
          billId: bill.id,
          name: bill.name,
          category: bill.category || 'Bills & subscriptions',
          amount: Number(bill.amount) || 0,
          date: due,
          recurrence,
          kind: bill.kind || 'subscription',
          isOverdue: compareDates(due, currentDate) < 0,
          scenario: false,
        });
      }
      due = addFrequency(due, recurrence);
      count += 1;
    }
  }
  return occurrences.sort((a, b) => compareDates(a.date, b.date) || a.name.localeCompare(b.name));
}

export function monthlyCommitmentTotal(state) {
  return sum((state.bills || []).filter((bill) => bill.status !== 'cancelled' && bill.status !== 'paid' && bill.recurrence && bill.recurrence !== 'once'), (bill) => {
    const amount = Number(bill.amount) || 0;
    if (bill.recurrence === 'weekly') return Math.round(amount * 52 / 12);
    if (bill.recurrence === 'yearly') return Math.round(amount / 12);
    return amount;
  });
}

export function getGoalSaved(state, goalId) {
  const goal = (state.goals || []).find((item) => item.id === goalId);
  if (!goal) return 0;
  const contributions = sum((state.transactions || []).filter((item) => item.type === 'transfer' && item.goalId === goalId));
  return (Number(goal.savedAtStart) || 0) + contributions;
}

export function getGoalStats(state, goal) {
  const saved = getGoalSaved(state, goal.id);
  const target = Number(goal.target) || 0;
  const remaining = Math.max(0, target - saved);
  return {
    saved,
    target,
    remaining,
    progress: target > 0 ? clamp(saved / target * 100, 0, 100) : 0,
    contributionTotal: sum((state.transactions || []).filter((item) => item.type === 'transfer' && item.goalId === goal.id)),
  };
}

export function calculateFinance(state, scenario = null) {
  const transactions = state.transactions || [];
  const baseIncome = sum(transactions.filter((item) => item.type === 'income'));
  const baseExpenses = sum(transactions.filter((item) => item.type === 'expense'));
  const transfers = sum(transactions.filter((item) => item.type === 'transfer'));
  const immediateOutflow = Math.max(0, Number(scenario?.immediateOutflow) || 0);
  const additionalIncome = Math.max(0, Number(scenario?.additionalIncome) || 0);
  const income = baseIncome + additionalIncome;
  const expenses = baseExpenses + immediateOutflow;
  const ledgerBalance = (Number(state.startingBudget) || 0) + income - expenses;
  const spendableBalance = ledgerBalance - transfers;

  const baseOccurrences = getBillOccurrences(state, { cancelledBillIds: scenario?.cancelledBillIds || [] });
  const scenarioOccurrences = (scenario?.futureOutflows || []).map((item, index) => ({
    id: item.id || `scenario-${index}`,
    billId: item.billId || null,
    name: item.name || scenario?.label || 'Proposed purchase',
    category: item.category || 'Other',
    amount: Math.max(0, Number(item.amount) || 0),
    date: item.date,
    recurrence: item.recurrence || 'once',
    kind: item.kind || 'purchase',
    isOverdue: compareDates(item.date, state.currentDate) < 0,
    scenario: true,
  })).filter((item) => item.date && compareDates(item.date, getCycleEndDate(state)) <= 0);
  const upcomingOccurrences = [...baseOccurrences, ...scenarioOccurrences]
    .filter((item) => item.amount > 0)
    .sort((a, b) => compareDates(a.date, b.date) || a.name.localeCompare(b.name));
  const upcomingCommitments = sum(upcomingOccurrences);

  const challengeDay = getChallengeDay(state);
  const daysRemainingInclusive = Math.max(1, state.durationDays - challengeDay + 1);
  const daysRemainingAfterToday = Math.max(0, state.durationDays - challengeDay);
  const flexibleExpensesForPace = sum(transactions.filter((item) => item.type === 'expense' && item.category !== 'Bills & subscriptions' && !item.excludeFromForecastPace));
  const observedAverageSpending = challengeDay > 0 ? flexibleExpensesForPace / challengeDay : 0;
  const forecastMultiplier = state.preferences?.forecastStyle === 'conservative' ? 1.15 : state.preferences?.forecastStyle === 'optimistic' ? 0.9 : 1;
  const dailyAverageSpending = observedAverageSpending * forecastMultiplier;
  const projectedVariableSpend = dailyAverageSpending * daysRemainingAfterToday;
  const projectedMonthEndBalance = spendableBalance - upcomingCommitments - projectedVariableSpend;
  const availableAfterCommitments = spendableBalance - upcomingCommitments;
  const rawDailyAllowance = availableAfterCommitments / daysRemainingInclusive;
  const dailyAllowance = Math.max(0, Math.floor(rawDailyAllowance));
  const allowanceShortfall = Math.max(0, Math.ceil(-availableAfterCommitments));
  const categorySpending = {};
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const category = transaction.category || 'Other';
    categorySpending[category] = (categorySpending[category] || 0) + (Number(transaction.amount) || 0);
  }
  const totalBudgeted = sum(state.budgets || [], (item) => item.limit);
  const overallUtilization = totalBudgeted > 0 ? expenses / totalBudgeted * 100 : 0;
  const categoryBudgets = (state.budgets || []).map((budget) => {
    const spent = categorySpending[budget.category] || 0;
    return {
      ...budget,
      spent,
      remaining: Number(budget.limit) - spent,
      utilization: Number(budget.limit) > 0 ? spent / Number(budget.limit) * 100 : 0,
    };
  });

  const summary = {
    startingBudget: Number(state.startingBudget) || 0,
    income,
    recordedIncome: baseIncome,
    expenses,
    recordedExpenses: baseExpenses,
    transfers,
    ledgerBalance,
    spendableBalance,
    upcomingCommitments,
    upcomingOccurrences,
    monthlyCommitments: monthlyCommitmentTotal(state),
    challengeDay,
    durationDays: state.durationDays,
    daysRemainingInclusive,
    daysRemainingAfterToday,
    dailyAverageSpending,
    observedAverageSpending,
    flexibleExpensesForPace,
    forecastMultiplier,
    projectedVariableSpend,
    projectedMonthEndBalance,
    rawDailyAllowance,
    dailyAllowance,
    allowanceShortfall,
    overallUtilization,
    totalBudgeted,
    categorySpending,
    categoryBudgets,
    goalStats: Object.fromEntries((state.goals || []).map((goal) => [goal.id, getGoalStats(state, goal)])),
    scenario,
  };
  summary.risk = getRisk(summary);
  summary.health = getFinancialHealth(summary, state);
  return summary;
}

export function getRisk(summary) {
  const projected = summary.projectedMonthEndBalance;
  if (projected < 0) return { code: 'shortfall', label: 'Shortfall risk', tone: 'danger', explanation: `At the current pace, the forecast is ${Math.abs(Math.round(projected)).toLocaleString('en-IN')} rupees below zero by day ${summary.durationDays}.` };
  if (projected < 500) return { code: 'tight', label: 'Very tight', tone: 'warning', explanation: `Your estimated month-end buffer is ${Math.round(projected).toLocaleString('en-IN')} rupees after known commitments.` };
  if (projected < 1500) return { code: 'watch', label: 'Watch your buffer', tone: 'warning', explanation: `Your estimated month-end buffer is ${Math.round(projected).toLocaleString('en-IN')} rupees. Keep flexible spending deliberate.` };
  return { code: 'on-track', label: 'On track', tone: 'positive', explanation: `Your current pace leaves an estimated ${Math.round(projected).toLocaleString('en-IN')} rupees after known commitments.` };
}

export function getFinancialHealth(summary, state) {
  const projected = summary.projectedMonthEndBalance;
  const bufferScore = projected <= 0 ? 0 : Math.min(25, projected / 1500 * 25);
  const commitmentScore = summary.upcomingCommitments > 0
    ? Math.min(25, Math.max(0, summary.spendableBalance / (summary.upcomingCommitments * 2)) * 25)
    : 25;
  const paceRatio = summary.dailyAverageSpending > 0
    ? summary.dailyAllowance / summary.dailyAverageSpending
    : 1;
  const paceScore = Math.min(20, Math.max(0, paceRatio) * 20);
  const emergencyGoal = (state.goals || []).find((goal) => goal.id === 'goal-emergency') || (state.goals || []).find((goal) => /emergency/i.test(goal.name));
  const emergencyStats = emergencyGoal ? getGoalStats(state, emergencyGoal) : { progress: 0 };
  const reserveScore = Math.min(15, emergencyStats.progress / 100 * 15);
  const elapsedPace = summary.durationDays > 0 ? summary.challengeDay / summary.durationDays * 100 : 0;
  const budgetScore = summary.overallUtilization <= elapsedPace
    ? 15
    : Math.max(0, 15 * elapsedPace / Math.max(summary.overallUtilization, 1));
  const score = clamp(Math.round(bufferScore + commitmentScore + paceScore + reserveScore + budgetScore), 0, 100);
  const factors = [
    { id: 'buffer', label: 'Month-end buffer', score: Math.round(bufferScore), outOf: 25, detail: projected < 0 ? 'The current pace points to a shortfall.' : `${Math.round(projected).toLocaleString('en-IN')} rupees projected after commitments.` },
    { id: 'commitments', label: 'Commitment cover', score: Math.round(commitmentScore), outOf: 25, detail: `${Math.round(summary.spendableBalance).toLocaleString('en-IN')} rupees available vs. ${Math.round(summary.upcomingCommitments).toLocaleString('en-IN')} rupees due.` },
    { id: 'pace', label: 'Daily spending pace', score: Math.round(paceScore), outOf: 20, detail: summary.observedAverageSpending ? `About ${Math.round(summary.observedAverageSpending).toLocaleString('en-IN')} rupees/day of flexible spending; fixed bills are separate.` : 'No flexible spending trend yet.' },
    { id: 'reserve', label: 'Emergency fund', score: Math.round(reserveScore), outOf: 15, detail: emergencyGoal ? `${Math.round(emergencyStats.progress)}% of your emergency target.` : 'Add an emergency goal to track a reserve.' },
    { id: 'budget', label: 'Budget pace', score: Math.round(budgetScore), outOf: 15, detail: `${Math.round(summary.overallUtilization)}% of budget used vs. ${Math.round(elapsedPace)}% of days elapsed.` },
  ];
  const label = score >= 80 ? 'Strong footing' : score >= 60 ? 'Building momentum' : score >= 40 ? 'Needs attention' : 'At risk';
  return { score, label, factors, note: 'A budgeting signal based on this challenge — not a credit score or financial advice.' };
}

export function getRecommendations(state, summary) {
  const recommendations = [];
  if (summary.upcomingCommitments > 0) {
    recommendations.push({
      id: 'reserve-bills',
      title: 'Set aside what is already spoken for',
      description: `${summary.upcomingOccurrences.length} known payment${summary.upcomingOccurrences.length === 1 ? '' : 's'} add up to ${Math.round(summary.upcomingCommitments).toLocaleString('en-IN')} rupees before day ${summary.durationDays}.`,
      impact: 'Protects your month-end forecast',
      tone: 'violet',
      route: '/bills-subscriptions',
    });
  }
  const fastestCategory = [...summary.categoryBudgets].filter((item) => item.limit > 0).sort((a, b) => b.utilization - a.utilization)[0];
  if (fastestCategory && fastestCategory.utilization > summary.challengeDay / summary.durationDays * 100 + 8) {
    recommendations.push({
      id: 'category-pace',
      title: `${fastestCategory.category} is moving faster than the calendar`,
      description: `${Math.round(fastestCategory.utilization)}% of its budget is used with ${summary.daysRemainingInclusive} days left in the challenge.`,
      impact: `${Math.max(0, fastestCategory.remaining)} rupees remain`,
      tone: 'amber',
      route: '/budgets',
    });
  }
  const nextSubscription = (state.bills || []).filter((bill) => bill.status === 'active' && bill.kind === 'subscription' && bill.recurrence !== 'once' && bill.nextDueDate >= state.currentDate).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];
  if (nextSubscription) {
    recommendations.push({
      id: 'subscription-check',
      title: `Review ${nextSubscription.name} before it renews`,
      description: `The next ${nextSubscription.recurrence} charge is ${Math.round(nextSubscription.amount).toLocaleString('en-IN')} rupees on ${nextSubscription.nextDueDate}.`,
      impact: `Potential saving: ${Math.round(nextSubscription.amount).toLocaleString('en-IN')} rupees`,
      tone: 'lime',
      route: '/bills-subscriptions',
      billId: nextSubscription.id,
    });
  }
  if (summary.projectedMonthEndBalance < 1500) {
    recommendations.push({
      id: 'decision-lab',
      title: 'Run the next purchase through Decision Lab',
      description: 'Compare the cost today with waiting a week or choosing a lower-cost option.',
      impact: summary.projectedMonthEndBalance < 0 ? 'Avoid a projected shortfall' : 'Protect your remaining buffer',
      tone: 'violet',
      route: '/decision-lab',
    });
  }
  return recommendations.slice(0, 4);
}

export function buildDashboardForecast(state, summary = calculateFinance(state)) {
  const grouped = {};
  for (const transaction of state.transactions || []) {
    const change = transaction.type === 'income' ? Number(transaction.amount) : transaction.type === 'expense' || transaction.type === 'transfer' ? -Number(transaction.amount) : 0;
    grouped[transaction.date] = (grouped[transaction.date] || 0) + (change || 0);
  }
  const points = [];
  let actualBalance = Number(state.startingBudget) || 0;
  for (let day = 1; day <= state.durationDays; day += 1) {
    const date = addDays(state.challengeStartDate, day - 1);
    actualBalance += grouped[date] || 0;
    points.push({ day, date, actual: day <= summary.challengeDay ? actualBalance : null, forecast: null, pointType: day <= summary.challengeDay ? 'actual' : 'forecast' });
  }
  let projected = summary.spendableBalance;
  const occurrenceByDate = {};
  for (const occurrence of summary.upcomingOccurrences) occurrenceByDate[occurrence.date] = (occurrenceByDate[occurrence.date] || 0) + occurrence.amount;
  const currentPoint = points.find((point) => point.day === summary.challengeDay);
  if (currentPoint) currentPoint.forecast = projected;
  for (let day = summary.challengeDay + 1; day <= state.durationDays; day += 1) {
    const date = addDays(state.challengeStartDate, day - 1);
    projected -= summary.dailyAverageSpending;
    projected -= occurrenceByDate[date] || 0;
    const point = points.find((item) => item.day === day);
    if (point) point.forecast = projected;
  }
  return points;
}

export function buildDecisionForecast(state, proposedSummary, baseSummary = calculateFinance(state)) {
  const points = [];
  let base = baseSummary.spendableBalance;
  let proposed = proposedSummary.spendableBalance;
  const baseOccurrences = new Map();
  const proposedOccurrences = new Map();
  for (const item of baseSummary.upcomingOccurrences) baseOccurrences.set(item.date, (baseOccurrences.get(item.date) || 0) + item.amount);
  for (const item of proposedSummary.upcomingOccurrences) proposedOccurrences.set(item.date, (proposedOccurrences.get(item.date) || 0) + item.amount);
  const start = baseSummary.challengeDay;
  for (let day = start; day <= state.durationDays; day += 1) {
    const date = addDays(state.challengeStartDate, day - 1);
    if (day === start) {
      points.push({ day, date, current: base, proposed });
      continue;
    }
    base -= baseSummary.dailyAverageSpending + (baseOccurrences.get(date) || 0);
    proposed -= baseSummary.dailyAverageSpending + (proposedOccurrences.get(date) || 0);
    points.push({ day, date, current: base, proposed });
  }
  return points;
}

export function makeDecisionScenario(state, proposal) {
  if (!proposal) return null;
  if (proposal.kind === 'cancel') {
    return { cancelledBillIds: [proposal.billId], futureOutflows: [], immediateOutflow: 0, label: `Cancel ${proposal.name}` };
  }
  const amount = Math.max(0, Math.round(Number(proposal.amount) || 0));
  const recurring = proposal.recurrence && proposal.recurrence !== 'once';
  const firstDate = proposal.timing === 'wait' ? addDays(state.currentDate, 7) : (proposal.firstPaymentDate || state.currentDate);
  const isDueNow = compareDates(firstDate, state.currentDate) <= 0;
  const immediateOutflow = isDueNow ? amount : 0;
  const futureOutflows = [];
  if (!recurring) {
    if (!isDueNow) futureOutflows.push({ name: proposal.description || 'Proposed purchase', amount, date: firstDate, category: proposal.category, kind: 'purchase', recurrence: 'once' });
  } else {
    let date = isDueNow ? addFrequency(firstDate, proposal.recurrence) : firstDate;
    let count = 0;
    while (date && compareDates(date, getCycleEndDate(state)) <= 0 && count < 100) {
      futureOutflows.push({ name: proposal.description || 'Proposed subscription', amount, date, category: proposal.category, kind: 'subscription', recurrence: proposal.recurrence });
      date = addFrequency(date, proposal.recurrence);
      count += 1;
    }
  }
  return {
    immediateOutflow,
    futureOutflows,
    cancelledBillIds: [],
    label: proposal.description || 'Proposed purchase',
    goalId: proposal.goalId || null,
    timing: proposal.timing || 'now',
    firstPaymentDate: firstDate,
    amount,
    recurrence: proposal.recurrence || 'once',
  };
}

export function addDecisionToState(state, proposal) {
  if (!proposal || proposal.kind === 'cancel') return state;
  const amount = Math.max(1, Math.round(Number(proposal.amount) || 0));
  const recurrence = proposal.recurrence || 'once';
  const recurring = recurrence !== 'once';
  const description = String(proposal.description || 'Planned purchase').trim() || 'Planned purchase';
  const category = proposal.category || 'Other';
  const id = `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const firstDate = proposal.timing === 'wait' ? addDays(state.currentDate, 7) : (proposal.firstPaymentDate || state.currentDate);
  const dueNow = compareDates(firstDate, state.currentDate) <= 0;
  if (!dueNow) {
    return {
      ...state,
      bills: [...state.bills, {
        id,
        name: description,
        category,
        amount,
        recurrence,
        nextDueDate: firstDate,
        status: recurring ? 'active' : 'pending',
        kind: recurring ? 'subscription' : 'bill',
        lastPaidDate: null,
      }],
    };
  }
  const transaction = {
    id: `${id}-tx`,
    date: state.currentDate,
    description,
    category,
    amount,
    type: 'expense',
    status: 'cleared',
    excludeFromForecastPace: true,
    ...(proposal.goalId ? { goalId: proposal.goalId } : {}),
  };
  const bills = recurring ? [...state.bills, {
    id,
    name: description,
    category,
    amount,
    recurrence,
    nextDueDate: addFrequency(firstDate, recurrence),
    status: 'active',
    kind: 'subscription',
    lastPaidDate: state.currentDate,
  }] : state.bills;
  return { ...state, transactions: [transaction, ...state.transactions], bills };
}
