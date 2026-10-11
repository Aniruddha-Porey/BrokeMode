import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarClock, Check, CircleAlert, HeartPulse,
  ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFinance } from '../context/FinanceContext.jsx';
import { calculateFinance, getRecommendations, getGoalStats } from '../finance/calculations.js';
import { addDays } from '../finance/dates.js';
import { formatCurrency, formatDate, formatPercent } from '../finance/formatters.js';
import { Badge, Button, PageHeading, Panel, ProgressBar, SectionHeading } from '../components/ui/Primitives.jsx';
import { CashflowChart } from '../components/charts/FinancialCharts.jsx';
import { buildDashboardForecast } from '../finance/calculations.js';

const axisFormatter = (value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`;

function SpendingTrend({ data, average }) {
  const tooltip = ({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><div className="chart-tooltip-date">{label}</div><div className="chart-tooltip-row"><span>Actual spend</span><strong>{formatCurrency(payload[0].value)}</strong></div></div> : null;
  return <div className="chart-wrapper" style={{ height: 208 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 5, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 5" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 8 }} interval={1} />
        <YAxis width={43} tickLine={false} axisLine={false} tick={{ fill: '#7D8497', fontSize: 8 }} tickFormatter={axisFormatter} />
        <Tooltip content={tooltip} cursor={{ fill: 'rgba(155,135,245,.06)' }} />
        <ReferenceLine y={average} stroke="#F5BE62" strokeDasharray="4 4" />
        <Bar dataKey="spend" fill="#9B87F5" radius={[4, 4, 0, 0]} maxBarSize={23} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

function HealthOverview({ summary }) {
  return <Panel>
    <SectionHeading title="Financial health" detail="A budgeting signal for this 30-day challenge" />
    <div className="health-overview">
      <div className="health-ring" style={{ '--score-angle': `${summary.health.score}%` }}><span>{summary.health.score}</span></div>
      <div><Badge tone={summary.risk.tone}>{summary.risk.label}</Badge><div className="health-score-title" style={{ marginTop: 9 }}>{summary.health.label}</div><div className="health-score-copy">Out of 100 · calculated from five explainable factors</div></div>
    </div>
    <div className="divider" />
    <div className="health-breakdown">
      {summary.health.factors.map((factor) => <div className="health-breakdown-row" key={factor.id}>
        <span>{factor.label}</span><ProgressBar value={factor.score / factor.outOf * 100} tone={factor.score / factor.outOf < .4 ? 'amber' : 'violet'} height={5} label={`${factor.label} score`} /><strong>{factor.score}/{factor.outOf}</strong>
        <span className="tiny-note" style={{ gridColumn: '1 / -1', marginTop: -8 }}>{factor.detail}</span>
      </div>)}
    </div>
    <p className="tiny-note" style={{ marginTop: 15 }}>{summary.health.note}</p>
  </Panel>;
}

function SpendingConsistency({ state, summary }) {
  const data = useMemo(() => {
    const byDate = {};
    for (const item of state.transactions) if (item.type === 'expense') byDate[item.date] = (byDate[item.date] || 0) + item.amount;
    return Array.from({ length: summary.challengeDay }, (_, index) => {
      const date = addDays(state.challengeStartDate, index);
      return { date, label: `D${index + 1}`, spend: byDate[date] || 0 };
    });
  }, [state.transactions, state.challengeStartDate, summary.challengeDay]);
  const avg = data.length ? data.reduce((sum, item) => sum + item.spend, 0) / data.length : 0;
  const activeDays = data.filter((item) => item.spend > 0).length;
  const variance = data.length ? data.reduce((sum, item) => sum + (item.spend - avg) ** 2, 0) / data.length : 0;
  const coefficient = avg ? Math.sqrt(variance) / avg : 0;
  const consistency = Math.max(0, Math.round(100 - coefficient * 52));
  return <Panel>
    <SectionHeading title="Spending consistency" detail="Daily recorded expenses · actual" />
    <div className="row-between" style={{ alignItems: 'flex-end' }}><div><div className="metric-number">{formatCurrency(avg)}<span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0, fontWeight: 500 }}> / day</span></div><div className="metric-foot">Average across {summary.challengeDay} challenge days</div></div><Badge tone={consistency >= 70 ? 'positive' : consistency >= 45 ? 'warning' : 'neutral'}>{consistency}% steady</Badge></div>
    <SpendingTrend data={data} average={avg} />
    <div className="row-between" style={{ color: 'var(--muted)', fontSize: 9 }}><span>{activeDays} days with recorded spending</span><span>Amber line = daily average</span></div>
  </Panel>;
}

function CoveragePanel({ state, summary }) {
  const coverRatio = summary.upcomingCommitments > 0 ? summary.spendableBalance / summary.upcomingCommitments : 1;
  const allSaved = state.goals.reduce((total, goal) => total + getGoalStats(state, goal).saved, 0);
  const allTargets = state.goals.reduce((total, goal) => total + Number(goal.target || 0), 0);
  const savingsProgress = allTargets > 0 ? allSaved / allTargets * 100 : 0;
  const currentVsTime = summary.challengeDay / summary.durationDays * 100;
  return <Panel>
    <SectionHeading title="Resilience checks" detail="Context behind the month-end estimate" />
    <div className="settings-action-row">
      <div className="settings-action-copy"><strong>Commitment coverage</strong><span>{formatCurrency(summary.spendableBalance)} available against {formatCurrency(summary.upcomingCommitments)} due this cycle</span></div>
      <Badge tone={coverRatio >= 2 ? 'positive' : coverRatio >= 1 ? 'warning' : 'danger'}>{coverRatio.toFixed(1)}× covered</Badge>
    </div>
    <div style={{ padding: '10px 0' }}><ProgressBar value={Math.min(100, coverRatio / 3 * 100)} tone={coverRatio >= 1 ? 'lime' : 'danger'} height={5} label="Upcoming commitment coverage" /></div>
    <div className="settings-action-row">
      <div className="settings-action-copy"><strong>Savings goal progress</strong><span>{formatCurrency(allSaved)} saved across {state.goals.length} goals</span></div>
      <strong className="money">{Math.round(savingsProgress)}%</strong>
    </div>
    <div style={{ padding: '10px 0' }}><ProgressBar value={savingsProgress} tone="violet" height={5} label="Combined goal progress" /></div>
    <div className="settings-action-row">
      <div className="settings-action-copy"><strong>Spend vs. time elapsed</strong><span>{formatPercent(summary.overallUtilization)} of budget used · {formatPercent(currentVsTime)} of days elapsed</span></div>
      <Badge tone={summary.overallUtilization <= currentVsTime ? 'positive' : 'warning'}>{summary.overallUtilization <= currentVsTime ? 'On pace' : 'Faster than time'}</Badge>
    </div>
  </Panel>;
}

function Recommendations({ state, summary }) {
  const items = getRecommendations(state, summary);
  return <Panel>
    <SectionHeading title="Ranked recommendations" detail="Specific moves, with the reason behind each one" />
    {items.length === 0 ? <div className="tiny-note">Keep recording transactions for more useful recommendations.</div> : items.map((item, index) => <div className="recommendation-card" key={item.id}>
      <span className="recommendation-marker"><span style={{ fontSize: 9, fontWeight: 700 }}>{String(index + 1).padStart(2, '0')}</span></span>
      <div className="recommendation-content"><strong>{item.title}</strong><p>{item.description}</p><span className="recommendation-quant">{item.impact}</span></div>
      <Link className="icon-button" to={item.route} aria-label={`Open ${item.title}`}><ArrowRight size={15} /></Link>
    </div>)}
  </Panel>;
}

export default function Insights() {
  const { state, summary } = useFinance();
  const forecast = useMemo(() => buildDashboardForecast(state, summary), [state, summary]);
  const shortfall = summary.projectedMonthEndBalance < 0;
  return <>
    <PageHeading eyebrow="LOOK AHEAD · INSIGHTS & FINANCIAL HEALTH" title="The story behind your balance." description="Understand the patterns and commitments shaping your month-end estimate. Every score and forecast has a plain-language explanation." actions={<Badge tone="neutral" icon={ShieldCheck}>NOT A CREDIT SCORE</Badge>} />
    <div className="insights-layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <HealthOverview summary={summary} />
        <Panel>
          <SectionHeading title="Month-end forecast" detail="Actual to today · estimated after the dashed boundary" />
          <div className="row-between" style={{ margin: '3px 0 8px' }}><span className="panel-caption">Current spendable balance</span><strong className="money">{formatCurrency(summary.spendableBalance)}</strong></div>
          <CashflowChart data={forecast} currentDay={summary.challengeDay} height={180} />
          <div className={`inline-warning ${shortfall ? 'danger' : ''}`} style={{ marginTop: 4 }}><CircleAlert size={14} />{summary.risk.explanation} This estimate assumes no new income.</div>
          <p className="tiny-note" style={{ marginTop: 9 }}>Projection = current available cash − known unpaid payments − estimated flexible spending at the recorded pace. Fixed bills are handled separately; forecasts can change as new activity is added.</p>
        </Panel>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Panel>
          <SectionHeading title="Risk classification" detail="Based on estimated month-end cushion" />
          <div className="risk-main" style={{ marginTop: 14 }}><span className={`risk-symbol ${summary.risk.tone}`}><AlertTriangle size={18} /></span><div><strong>{summary.risk.label}</strong><span>{formatCurrency(summary.projectedMonthEndBalance)} estimated at day {summary.durationDays}</span></div></div>
          <p className="risk-explanation" style={{ marginTop: 7 }}>{summary.risk.explanation} Risk bands are deterministic: below ₹0 is shortfall risk, ₹0–₹499 is very tight, ₹500–₹1,499 is watch, and ₹1,500 or more is on track.</p>
          <Link className="btn btn-outline btn-sm" style={{ marginTop: 14 }} to="/decision-lab">Run a purchase simulation <ArrowRight size={13} /></Link>
        </Panel>
        <SpendingConsistency state={state} summary={summary} />
        <CoveragePanel state={state} summary={summary} />
      </div>
    </div>
    <div style={{ marginTop: 15 }}><Recommendations state={state} summary={summary} /></div>
    <div className="alert-strip" style={{ marginTop: 14 }}><HeartPulse size={15} /><span>This score is a simple budgeting signal for your BrokeMode challenge, not a credit score, financial guarantee, or professional financial advice. Forecasts are estimates from the information entered into this demo.</span></div>
  </>;
}
