import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, CircleAlert,
  Clock3, Info, RotateCcw, ShieldCheck, Sparkles, Target, Wallet, X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { calculateFinance, buildDecisionForecast, getBillOccurrences, getGoalStats, makeDecisionScenario } from '../finance/calculations.js';
import { addDays } from '../finance/dates.js';
import { formatCurrency, formatDate, formatSignedCurrency } from '../finance/formatters.js';
import { categoriesForState } from '../finance/categories.js';
import { makeId } from '../utils/id.js';
import { Badge, Button, Field, PageHeading, Panel, ProgressBar, SectionHeading, SelectField } from '../components/ui/Primitives.jsx';
import { DecisionForecastChart } from '../components/charts/FinancialCharts.jsx';

function evaluateProposal(state, proposal) {
  const scenario = makeDecisionScenario(state, proposal);
  const summary = calculateFinance(state, scenario);
  return { proposal, scenario, summary };
}

function deltaLabel(current, next, format = (value) => formatCurrency(value), positiveIsGood = false) {
  const delta = next - current;
  const good = positiveIsGood ? delta > 0 : delta < 0;
  const bad = positiveIsGood ? delta < 0 : delta > 0;
  return { text: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${format(Math.abs(delta))}`, tone: good ? 'good' : bad ? 'bad' : 'neutral' };
}

function ImpactMetric({ label, before, after, delta, tone = 'default' }) {
  return <div className="impact-metric">
    <span className="impact-metric-label">{label}</span>
    <div className="impact-metric-values"><strong>{after}</strong><span className={`impact-delta ${delta?.tone || tone}`}>{delta?.text || 'No change'}</span></div>
    <div className="tiny-note" style={{ marginTop: 5 }}>Was {before}</div>
  </div>;
}

function getDecisionHealthTone(base, next) {
  if (next < base) return 'bad';
  if (next > base) return 'good';
  return 'neutral';
}

function decisionAssessment(summary) {
  if (summary.spendableBalance < 0 || summary.projectedMonthEndBalance < 0) return {
    key: 'risky', label: 'Risky', tone: 'danger', icon: AlertTriangle,
    text: `This leaves an estimated ${formatCurrency(Math.abs(Math.min(summary.projectedMonthEndBalance, summary.spendableBalance)))} shortfall by day ${summary.durationDays}. The projection extends your recorded spend and known payments; it is an estimate, not a guarantee.`,
  };
  if (summary.projectedMonthEndBalance < 1500) return {
    key: 'borderline', label: 'Borderline', tone: 'warning', icon: CircleAlert,
    text: `This keeps the forecast above zero, but leaves less than ₹1,500 of estimated month-end buffer. A smaller amount or a later decision may create more room.`,
  };
  return {
    key: 'safe', label: 'Safe by current rules', tone: 'positive', icon: ShieldCheck,
    text: `The estimate remains non-negative and above the ₹1,500 buffer threshold after known payments. Keep checking the forecast as real expenses change.`,
  };
}

function DecisionBuilder({ state, onSimulate }) {
  const [form, setForm] = useState({
    description: 'New headphones', category: 'Shopping', amount: '1200', recurrence: 'once', frequency: 'monthly',
    firstPaymentDate: state.currentDate, goalId: 'goal-emergency',
  });
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const amount = Math.round(Number(form.amount));
    if (!form.description.trim()) { setError('Give this purchase a short description.'); return; }
    if (!Number.isFinite(amount) || amount < 1) { setError('Enter a purchase amount greater than zero.'); return; }
    if (amount > 1000000) { setError('For this demo, a single proposal must be below ₹10,00,000.'); return; }
    setError('');
    onSimulate({
      kind: 'purchase', description: form.description.trim(), category: form.category, amount,
      recurrence: form.recurrence === 'once' ? 'once' : form.frequency,
      firstPaymentDate: form.recurrence === 'once' ? state.currentDate : form.firstPaymentDate,
      goalId: form.goalId || null, timing: 'now',
    }, 'custom');
  };
  const max = Math.max(5000, Math.min(50000, Math.ceil((Number(form.amount) || 2000) / 1000) * 1000));
  return <div className="decision-builder">
    <Panel>
      <div className="panel-title-row"><div><h2><span className="decision-step">01</span>Build your decision</h2><p>Try it here first. Nothing is recorded until you apply.</p></div><Badge tone="violet">PREVIEW ONLY</Badge></div>
      <form onSubmit={submit}>
        <Field label="What are you thinking of buying?" placeholder="e.g. Headphones" value={form.description} onChange={(event) => set('description', event.target.value)} required />
        <div style={{ height: 12 }} />
        <SelectField label="Category" value={form.category} onChange={(event) => set('category', event.target.value)} options={categoriesForState(state)} />
        <div style={{ height: 13 }} />
        <div className="purchase-amount-control">
          <Field label="Purchase amount" type="number" min="1" step="1" inputMode="numeric" value={form.amount} onChange={(event) => set('amount', event.target.value)} required>
            <span className="input-with-prefix"><span className="input-prefix">₹</span><input className="input tabular" type="number" min="1" max="1000000" step="1" inputMode="numeric" value={form.amount} onChange={(event) => set('amount', event.target.value)} aria-label="Purchase amount in rupees" /></span>
          </Field>
          <input className="amount-slider" type="range" min="0" max={max} step="50" value={Math.max(0, Math.min(max, Number(form.amount) || 0))} onChange={(event) => set('amount', event.target.value)} aria-label="Adjust purchase amount" />
          <div className="amount-range-labels"><span>₹0</span><span>{formatCurrency(max)}</span></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>How often?</div>
          <div className="segmented-control segmented-full" role="group" aria-label="Purchase recurrence">
            <button type="button" className={form.recurrence === 'once' ? 'selected' : ''} onClick={() => set('recurrence', 'once')}>One-time</button>
            <button type="button" className={form.recurrence === 'repeat' ? 'selected' : ''} onClick={() => set('recurrence', 'repeat')}>Recurring</button>
          </div>
        </div>
        {form.recurrence === 'repeat' && <div className="modal-form-grid" style={{ marginTop: 13 }}>
          <SelectField label="Frequency" value={form.frequency} onChange={(event) => set('frequency', event.target.value)} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
          <Field label="First payment" type="date" min={state.currentDate} value={form.firstPaymentDate} onChange={(event) => set('firstPaymentDate', event.target.value)} required />
        </div>}
        <div style={{ marginTop: 13 }}><SelectField label="Goal this could affect (optional)" value={form.goalId} onChange={(event) => set('goalId', event.target.value)} options={[{ value: '', label: 'No goal selected' }, ...state.goals.map((goal) => ({ value: goal.id, label: goal.name }))]} /></div>
        {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
        <Button type="submit" className="simulate-button" icon={Sparkles} iconRight={ArrowRight}>Simulate this purchase</Button>
      </form>
      <div className="decision-summary-note"><Info size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />Your real balance, transaction history, and savings goals stay untouched until you choose <strong>Apply decision</strong>.</div>
    </Panel>
  </div>;
}

function ImpactPanel({ state, baseSummary, simulation, onApply, onDiscard, applying }) {
  if (!simulation) return <Panel className="no-simulation"><span className="empty-icon"><Sparkles size={20} /></span><h2>Make the next move with your eyes open.</h2><p>Shape a purchase on the left, then compare the balance, daily allowance, and month-end forecast before anything is committed.</p></Panel>;
  const { proposal, scenario, summary } = simulation;
  const assessment = decisionAssessment(summary);
  const currentAllowance = baseSummary.dailyAllowance;
  const currentGoal = proposal.goalId ? state.goals.find((goal) => goal.id === proposal.goalId) : null;
  const currentGoalStats = currentGoal ? getGoalStats(state, currentGoal) : null;
  const balanceDelta = deltaLabel(baseSummary.spendableBalance, summary.spendableBalance);
  const allowanceDelta = deltaLabel(currentAllowance, summary.dailyAllowance);
  const forecastDelta = deltaLabel(baseSummary.projectedMonthEndBalance, summary.projectedMonthEndBalance);
  const healthDelta = deltaLabel(baseSummary.health.score, summary.health.score, (value) => `${Math.round(value)} pts`);
  const riskDeltaText = baseSummary.risk.label === summary.risk.label ? `Still ${summary.risk.label.toLowerCase()}` : `${baseSummary.risk.label} → ${summary.risk.label}`;
  const riskDeltaTone = summary.risk.tone === 'danger' ? 'bad' : summary.risk.tone === 'warning' ? 'warn' : 'good';
  const forecastData = buildDecisionForecast(state, summary, baseSummary);
  const timeline = [...summary.upcomingOccurrences].slice(0, 5);
  const isImmediate = Number(scenario?.immediateOutflow) > 0 && proposal.kind !== 'cancel';
  const applyLabel = proposal.kind === 'cancel' ? 'Apply cancellation' : 'Apply decision';
  return <>
    <Panel className="decision-impact-panel">
      <div className="decision-impact-head">
        <div><Badge tone="violet">SIMULATION · NOT SAVED</Badge><h2 style={{ marginTop: 9 }}>{proposal.kind === 'cancel' ? proposal.name : proposal.description}</h2><p>{proposal.kind === 'cancel' ? 'Subscription cancellation preview' : `${proposal.category} · ${proposal.recurrence === 'once' ? 'One-time' : `${proposal.recurrence} recurring`} · ${proposal.timing === 'wait' ? 'starts in 7 days' : proposal.firstPaymentDate && proposal.firstPaymentDate > state.currentDate ? `first payment ${formatDate(proposal.firstPaymentDate)}` : 'starting today'}`}</p></div>
        <Badge tone={assessment.tone} icon={assessment.icon}>{assessment.label}</Badge>
      </div>
      <div className="impact-grid">
        <ImpactMetric label="Available balance" before={formatCurrency(baseSummary.spendableBalance)} after={formatCurrency(summary.spendableBalance)} delta={balanceDelta} />
        <ImpactMetric label="Safe to spend / day" before={formatCurrency(currentAllowance)} after={formatCurrency(summary.dailyAllowance)} delta={allowanceDelta} />
        <ImpactMetric label="Day-30 estimate" before={formatCurrency(baseSummary.projectedMonthEndBalance)} after={formatCurrency(summary.projectedMonthEndBalance)} delta={forecastDelta} />
        <div className="impact-metric"><span className="impact-metric-label">Financial health</span><div className="impact-metric-values"><span className="impact-score"><strong>{summary.health.score}</strong><span className="muted">/ 100</span></span><span className={`impact-delta ${getDecisionHealthTone(baseSummary.health.score, summary.health.score)}`}>{healthDelta.text}</span></div><div className="tiny-note" style={{ marginTop: 5 }}>{baseSummary.health.score} before · {summary.health.label}</div></div>
      </div>
      <div className={`impact-explanation ${assessment.key}`}><assessment.icon size={15} /><span><strong>{assessment.label}:</strong> {assessment.text}</span></div>
      <div className="row-between" style={{ padding: '11px 2px 0', gap: 12 }}>
        <div className="tiny-note"><strong style={{ color: 'var(--text)' }}>Risk rules:</strong> safe ≥ ₹1,500 forecast buffer · borderline ₹0–₹1,499 · risky below ₹0.</div>
        <Badge tone={riskDeltaTone === 'bad' ? 'danger' : riskDeltaTone === 'warn' ? 'warning' : 'positive'}>{riskDeltaText}</Badge>
      </div>
      {currentGoal && currentGoalStats && <div className="goal-inline" style={{ marginTop: 13 }}>
        <span className="goal-avatar"><Target size={15} /></span><span className="goal-inline-copy"><strong>{currentGoal.name} · {formatCurrency(currentGoalStats.saved)} saved</strong><span>{Math.round(currentGoalStats.progress)}% of {formatCurrency(currentGoalStats.target)} · goal progress does not change in a preview</span></span>
        <span className="tiny-note" style={{ maxWidth: 160, textAlign: 'right' }}>Available cash after proposal: {formatCurrency(summary.spendableBalance)}</span>
      </div>}
      <div className="impact-actions">
        <Button variant="subtle" icon={RotateCcw} onClick={onDiscard}>Discard simulation</Button>
        <Button variant="primary" icon={Check} loading={applying} disabled={applying} onClick={onApply}>{applyLabel}</Button>
      </div>
    </Panel>

    <Panel className="scenario-timeline">
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 7 }}>
        <SectionHeading title="The rest of your month" detail="Actual balance today, then two estimates" />
        <div className="decision-legend"><span className="legend-item"><i className="legend-line forecast" />Current plan</span><span className="legend-item"><i className="legend-line proposed" />With decision</span></div>
      </div>
      <DecisionForecastChart data={forecastData} currentDay={baseSummary.challengeDay} />
      <div className="timeline-events">
        {isImmediate && <div className="timeline-event"><span className="timeline-date">Today · D{baseSummary.challengeDay}</span><span className="timeline-dot proposed" /><span className="timeline-name">{proposal.description} <span className="timeline-note">· proposed</span></span><span className="timeline-amount">−{formatCurrency(scenario.immediateOutflow)}</span></div>}
        {timeline.map((item) => <div className="timeline-event" key={item.id}><span className="timeline-date">{formatDate(item.date)} · D{Math.max(1, Math.round((new Date(`${item.date}T00:00:00Z`) - new Date(`${state.challengeStartDate}T00:00:00Z`)) / 86400000) + 1)}</span><span className={`timeline-dot ${item.scenario ? 'proposed' : ''}`} /><span className="timeline-name">{item.name}{item.scenario && <span className="timeline-note"> · proposed</span>}{item.isOverdue && <span className="timeline-note"> · overdue</span>}</span><span className="timeline-amount">−{formatCurrency(item.amount)}</span></div>)}
        <div className="timeline-event"><span className="timeline-date">Day {summary.durationDays}</span><span className="timeline-dot proposed" /><span className="timeline-name">Estimated balance after spending & commitments</span><span className="timeline-amount">{formatCurrency(summary.projectedMonthEndBalance)}</span></div>
      </div>
      <div className="tiny-note" style={{ marginTop: 9 }}>The estimate extends your recorded flexible day-to-day spending rate through the remaining days and adds each unpaid payment due before the cycle ends. A recurring proposal only adds charges within this 30-day horizon.</div>
    </Panel>
  </>;
}

function AlternativePanel({ state, formProposal, selectedKey, onSelect }) {
  const summary = calculateFinance(state);
  const eligible = getBillOccurrences(state).filter((item) => item.kind === 'subscription' && item.billId);
  const subscription = eligible[0] ? state.bills.find((bill) => bill.id === eligible[0].billId) : null;
  const formAmount = Math.max(0, Math.round(Number(formProposal.amount) || 0));
  const lowerAmount = Math.max(1, Math.round(formAmount * 0.7 / 10) * 10);
  const cancelAmount = subscription ? eligible.filter((item) => item.billId === subscription.id).reduce((total, item) => total + item.amount, 0) : 0;
  const items = [
    { key: 'buy', title: 'Buy now', description: `Pay ${formatCurrency(formAmount)} today.`, proposal: { ...formProposal, kind: 'purchase', timing: 'now', firstPaymentDate: state.currentDate } },
    { key: 'wait', title: 'Wait seven days', description: `Keep today’s cash; ${formAmount ? formatCurrency(formAmount) : 'the purchase'} moves to ${formatDate(addDays(state.currentDate, 7))}.`, proposal: { ...formProposal, kind: 'purchase', timing: 'wait' } },
    { key: 'lower', title: 'Choose a lower-cost option', description: `Model ${formatCurrency(lowerAmount)} instead — ${formatCurrency(formAmount - lowerAmount)} less.`, proposal: { ...formProposal, kind: 'purchase', amount: lowerAmount, timing: 'now', firstPaymentDate: state.currentDate } },
    { key: 'cancel', title: subscription ? `Cancel ${subscription.name}` : 'Cancel a subscription', description: subscription ? `Remove ${formatCurrency(cancelAmount)} of charges in this cycle.` : 'No upcoming active subscription to cancel.', proposal: subscription ? { kind: 'cancel', billId: subscription.id, name: subscription.name, amount: cancelAmount } : null, disabled: !subscription },
  ];
  return <Panel>
    <SectionHeading title="Try a different move" detail="Each option recalculates the same model — no changes are saved" />
    <div className="alternatives-grid">
      {items.map((item) => <button key={item.key} className={`alternative-button ${selectedKey === item.key ? 'selected' : ''}`} disabled={item.disabled} onClick={() => item.proposal && onSelect(item.proposal, item.key)}>
        <strong>{item.title}</strong><span>{item.description}</span>
      </button>)}
    </div>
  </Panel>;
}

export default function DecisionLab() {
  const { state, summary: baseSummary, dispatch } = useFinance();
  const toast = useToast();
  const initialProposal = { kind: 'purchase', decisionId: makeId('decision'), description: 'New headphones', category: 'Shopping', amount: 1200, recurrence: 'once', timing: 'now', firstPaymentDate: state.currentDate, goalId: 'goal-emergency' };
  const [lastPurchase, setLastPurchase] = useState(initialProposal);
  const [simulation, setSimulation] = useState(() => evaluateProposal(state, initialProposal));
  const [selectedKey, setSelectedKey] = useState('buy');
  const [applying, setApplying] = useState(false);
  const appliedRef = useRef(false);
  const formProposal = lastPurchase;
  const handleSimulate = (proposal, key = 'custom') => {
    appliedRef.current = false;
    const nextProposal = { ...proposal, decisionId: makeId('decision') };
    if (proposal.kind === 'purchase' && (key === 'custom' || key === 'buy')) setLastPurchase(proposal);
    setSelectedKey(key);
    setSimulation(evaluateProposal(state, nextProposal));
  };
  const apply = () => {
    if (!simulation || applying || appliedRef.current) return;
    if (simulation.proposal.kind === 'cancel') {
      const bill = state.bills.find((item) => item.id === simulation.proposal.billId);
      if (!bill || bill.status === 'cancelled') { toast('That subscription is no longer active. Re-run the simulation.', 'error'); setSimulation(null); return; }
    } else if (!simulation.proposal.description?.trim() || Number(simulation.proposal.amount) <= 0) {
      toast('This proposal is no longer valid. Update the details and simulate again.', 'error'); return;
    }
    appliedRef.current = true;
    setApplying(true);
    dispatch({ type: 'APPLY_DECISION', proposal: simulation.proposal });
    toast(simulation.proposal.kind === 'cancel' ? `${simulation.proposal.name} cancellation recorded.` : `${simulation.proposal.description} added to your plan.`);
    setSimulation(null);
    setApplying(false);
  };
  const discard = () => {
    setSimulation(null);
    setSelectedKey('');
    appliedRef.current = false;
    toast('Simulation discarded. Your money data is unchanged.', 'info');
  };
  const simulateAlt = (proposal, key) => handleSimulate(proposal, key);
  return <>
    <PageHeading eyebrow="DECISION LAB · PREVIEW BEFORE YOU SPEND" title="Before you spend, see what changes." description="A small decision now can change how the rest of your month feels. Run the numbers before you commit." actions={<Badge tone="violet" icon={Sparkles}>SIGNATURE EXPERIENCE</Badge>} />
    <div className="decision-layout">
      <DecisionBuilder state={state} onSimulate={handleSimulate} />
      <div className="decision-results">
        <ImpactPanel state={state} baseSummary={baseSummary} simulation={simulation} onApply={apply} onDiscard={discard} applying={applying} />
        <AlternativePanel state={state} formProposal={formProposal} selectedKey={selectedKey} onSelect={simulateAlt} />
      </div>
    </div>
    <div className="tiny-note" style={{ marginTop: 14, textAlign: 'center' }}>A preview never updates the ledger. Applying a one-time purchase adds one expense; applying a recurring purchase records today’s first charge and creates only future charges inside the forecast window.</div>
  </>;
}
