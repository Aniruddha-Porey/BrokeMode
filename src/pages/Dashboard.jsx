import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Check, CircleAlert, Clock3,
  Coffee, CreditCard, ForkKnife, ShoppingBag, ShoppingCart, Sparkles, Target, TrainFront, ShieldCheck,
  TrendingDown, Wallet, Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { calculateFinance, buildDashboardForecast, getRecommendations, getGoalStats } from '../finance/calculations.js';
import { formatCurrency, formatDate, formatPercent } from '../finance/formatters.js';
import { CATEGORY_COLORS } from '../data/demoData.js';
import { Badge, PageHeading, Panel, ProgressBar, SectionHeading } from '../components/ui/Primitives.jsx';
import { CashflowChart } from '../components/charts/FinancialCharts.jsx';

const transactionIcon = (category) => {
  if (/grocer/i.test(category)) return ShoppingCart;
  if (/food|drink/i.test(category)) return Coffee;
  if (/transport/i.test(category)) return TrainFront;
  if (/shopping/i.test(category)) return ShoppingBag;
  if (/bill|subscription/i.test(category)) return CreditCard;
  return Wallet;
};

function DashboardStats({ summary }) {
  const metrics = [
    { label: 'Starting budget', value: formatCurrency(summary.startingBudget), detail: 'For this 30-day cycle' },
    { label: 'Income added', value: formatCurrency(summary.income), detail: summary.income ? 'Recorded this cycle' : 'No income recorded yet' },
    { label: 'Spent so far', value: formatCurrency(summary.expenses), detail: `${formatPercent(summary.overallUtilization)} of budget used`, tone: 'warning' },
    { label: 'Budget utilization', value: formatPercent(summary.overallUtilization), detail: `Day ${summary.challengeDay} of ${summary.durationDays}`, tone: 'violet' },
  ];
  return <div className="dashboard-stat-strip">
    {metrics.map((metric) => <div className="stat-cell" key={metric.label}>
      <div className="metric-topline"><span>{metric.label}</span></div>
      <div className="metric-number">{metric.value}</div>
      <div className="metric-foot">{metric.detail}</div>
    </div>)}
  </div>;
}

function BalanceCard({ summary }) {
  return <Panel className="balance-card">
    <div className="balance-overline"><span className="live-dot" />Available for the rest of the challenge <Badge tone="positive">LIVE BALANCE</Badge></div>
    <div className="hero-balance">{formatCurrency(summary.spendableBalance)}</div>
    <div className="balance-subline">From {formatCurrency(summary.startingBudget)} start + {formatCurrency(summary.income)} income <span>·</span> {formatCurrency(summary.expenses)} spent <span>·</span> {formatCurrency(summary.transfers)} moved to savings</div>
    <div className="balance-divider" />
    <div className="balance-footer">
      <div className="daily-allowance">
        <span className="allowance-icon"><Zap size={16} /></span>
        <div className="allowance-copy"><span>Safe to spend today</span><strong>{formatCurrency(summary.dailyAllowance)}<small style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}> / day</small></strong></div>
      </div>
      <div className="allowance-note">After reserving {formatCurrency(summary.upcomingCommitments)} for known payments · {summary.daysRemainingInclusive} days, including today.</div>
    </div>
    {summary.allowanceShortfall > 0 && <div className="inline-warning danger"><CircleAlert size={14} />Your known payments exceed available cash by {formatCurrency(summary.allowanceShortfall)}. There is no daily allowance after commitments; review upcoming bills.</div>}
  </Panel>;
}

function RiskCard({ summary }) {
  const Icon = summary.risk.code === 'shortfall' ? CircleAlert : summary.risk.code === 'on-track' ? Check : TrendingDown;
  return <Panel className="risk-card">
    <div className="risk-top"><span className="risk-title">Month-end outlook</span><Badge tone={summary.risk.tone}>{summary.risk.label}</Badge></div>
    <div className="risk-main"><span className={`risk-symbol ${summary.risk.tone}`}><Icon size={17} /></span><div><strong>{formatCurrency(summary.projectedMonthEndBalance)}</strong><span>estimated day-30 balance</span></div></div>
    <p className="risk-explanation">{summary.risk.explanation} Estimate extends your flexible day-to-day spending pace and subtracts known unpaid commitments.</p>
  </Panel>;
}

function UpcomingPanel({ summary }) {
  const next = summary.upcomingOccurrences.slice(0, 3);
  return <Panel>
    <SectionHeading title="Coming up" detail="Unpaid commitments · included in your forecast" action={<Link className="subtle-link" to="/bills-subscriptions">All bills <ArrowRight size={13} /></Link>} />
    {next.length === 0 ? <div className="tiny-note">No unpaid payments due before the end of this challenge.</div> : <div className="transaction-list">
      {next.map((bill) => <div className="transaction-item" key={bill.id}>
        <div className="transaction-info"><span className="transaction-symbol"><CalendarClock size={14} /></span><div className="transaction-info-copy"><strong>{bill.name}</strong><span>{bill.isOverdue ? 'Overdue' : formatDate(bill.date)} · {bill.recurrence === 'once' ? 'One-time' : bill.recurrence}</span></div></div>
        <div className="transaction-amount">{formatCurrency(bill.amount)}</div>
      </div>)}
    </div>}
    <div className="commitment-total"><span>Due by day {summary.durationDays}</span><strong>{formatCurrency(summary.upcomingCommitments)}</strong></div>
  </Panel>;
}

function HealthCard({ health }) {
  return <Panel className="health-card">
    <SectionHeading title="Financial health" detail="Budgeting signal · not a credit score" action={<Link className="subtle-link" to="/insights">Breakdown <ArrowRight size={13} /></Link>} />
    <div className="health-score-wrap">
      <div className="health-ring" style={{ '--score-angle': `${health.score}%` }}><span>{health.score}</span></div>
      <div><div className="health-score-title">{health.label}</div><div className="health-score-copy">5 factors · score out of 100</div></div>
    </div>
    <div>{health.factors.slice(0, 3).map((factor, index) => <div className="health-factor-line" key={factor.id}>
      <span>{factor.label}</span><ProgressBar value={factor.score / factor.outOf * 100} tone={index === 0 ? 'amber' : 'violet'} height={4} label={`${factor.label} score`} /><strong>{factor.score}</strong>
    </div>)}</div>
  </Panel>;
}

function InsightsPanel({ recommendations }) {
  return <Panel>
    <SectionHeading title="Your next moves" detail="Ranked by what can protect your month" action={<Link className="subtle-link" to="/insights">All insights <ArrowRight size={13} /></Link>} />
    <div className="compact-insight-list">
      {recommendations.slice(0, 3).map((item, index) => <Link to={item.route} className="insight-row" key={item.id}>
        <span className={`insight-rank ${item.tone}`}>{String(index + 1).padStart(2, '0')}</span>
        <span className="insight-copy"><strong>{item.title}</strong><p>{item.description}</p><span className="insight-impact">{item.impact}</span></span>
        <span className="insight-arrow"><ArrowRight size={14} /></span>
      </Link>)}
      {recommendations.length === 0 && <div className="tiny-note">Your plan is steady. Keep logging spending to sharpen the forecast.</div>}
    </div>
  </Panel>;
}

function CategorySpending({ summary }) {
  const rows = summary.categoryBudgets.filter((item) => item.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 5);
  return <Panel>
    <SectionHeading title="Where it’s going" detail="Actual spending by category" action={<Link className="subtle-link" to="/budgets">Budget details <ArrowRight size={13} /></Link>} />
    {rows.length === 0 ? <div className="tiny-note">Your category breakdown will appear after your first expense.</div> : <div className="category-list">
      {rows.map((item) => <div className="category-row" key={item.id}>
        <div className="category-name"><span className="category-dot" style={{ background: CATEGORY_COLORS[item.category] || '#9299AB' }} /><span>{item.category}</span></div>
        <div className="category-bar"><ProgressBar value={item.utilization} tone={item.utilization >= 85 ? 'amber' : 'violet'} height={5} label={`${item.category} budget used`} /></div>
        <div className="category-amount">{formatCurrency(item.spent)} <span>/ {formatCurrency(item.limit)}</span></div>
      </div>)}
    </div>}
  </Panel>;
}

function RecentActivity({ state, summary }) {
  const items = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const emergency = state.goals.find((goal) => /emergency/i.test(goal.name));
  const goalStats = emergency ? getGoalStats(state, emergency) : null;
  return <Panel>
    <SectionHeading title="Recent activity" detail="Every rupee, accounted for" action={<Link className="subtle-link" to="/transactions">All transactions <ArrowRight size={13} /></Link>} />
    {items.length === 0 ? <div className="tiny-note">No transactions yet. Add an entry to start your cash-flow story.</div> : <div className="transaction-list">
      {items.map((item) => {
        const Icon = transactionIcon(item.category);
        const sign = item.type === 'income' ? '+' : item.type === 'transfer' ? '↗' : '−';
        return <div className="transaction-item" key={item.id}>
          <div className="transaction-info"><span className="transaction-symbol"><Icon size={14} /></span><div className="transaction-info-copy"><strong>{item.description}</strong><span>{item.category} · {formatDate(item.date)}</span></div></div>
          <div className={`transaction-amount ${item.type === 'income' ? 'amount-income' : item.type === 'transfer' ? 'amount-transfer' : 'amount-expense'}`}>{sign}{formatCurrency(item.amount)}</div>
        </div>;
      })}
    </div>}
    {emergency && goalStats && <div className="goal-inline">
      <span className="goal-avatar"><ShieldCheck size={16} /></span>
      <span className="goal-inline-copy"><strong>{emergency.name}</strong><span>{formatCurrency(goalStats.saved)} saved · {Math.round(goalStats.progress)}% of {formatCurrency(goalStats.target)}</span></span>
      <ProgressBar value={goalStats.progress} tone="lime" height={5} label="Emergency fund progress" />
    </div>}
  </Panel>;
}

export default function Dashboard() {
  const { state, summary } = useFinance();
  const recommendations = useMemo(() => getRecommendations(state, summary), [state, summary]);
  const forecast = useMemo(() => buildDashboardForecast(state, summary), [state, summary]);
  return <>
    <div className="dashboard-welcome">
      <div className="dashboard-topline">
        <PageHeading eyebrow={`BROKE BUT FUNCTIONAL · DAY ${summary.challengeDay} OF ${summary.durationDays}`} title="Make your money count." description="Know where you stand today. Plan your next move." actions={<Link className="btn btn-primary btn-lg" to="/decision-lab"><Zap size={16} strokeWidth={1.8} /><span>Open Decision Lab</span><ArrowRight size={16} strokeWidth={1.8} /></Link>} />
        <div className="challenge-progress"><div className="challenge-progress-label"><span>Challenge progress</span><strong>{Math.round(summary.challengeDay / summary.durationDays * 100)}%</strong></div><ProgressBar value={summary.challengeDay / summary.durationDays * 100} tone="lime" height={5} label="Challenge days elapsed" /><div className="challenge-progress-label"><span>Day {summary.challengeDay}</span><span>Day {summary.durationDays}</span></div></div>
      </div>
    </div>
    <DashboardStats summary={summary} />
    <div className="dashboard-main-grid">
      <BalanceCard summary={summary} />
      <RiskCard summary={summary} />
      <Panel className="chart-panel">
        <div className="chart-head">
          <div><SectionHeading title="Your balance, through day 30" detail="Actual cash to date · forecast from today" /></div>
          <div className="chart-legend"><span className="legend-item"><i className="legend-line" />Actual</span><span className="legend-item"><i className="legend-line forecast" />Estimated</span></div>
        </div>
        <CashflowChart data={forecast} currentDay={summary.challengeDay} />
        <div className="tiny-note">Forecast extends your flexible day-to-day spending pace; fixed bills are added as dated commitments. Future values are estimates.</div>
      </Panel>
      <UpcomingPanel summary={summary} />
      <CategorySpending summary={summary} />
      <HealthCard health={summary.health} />
      <InsightsPanel recommendations={recommendations} />
      <RecentActivity state={state} summary={summary} />
    </div>
  </>;
}
