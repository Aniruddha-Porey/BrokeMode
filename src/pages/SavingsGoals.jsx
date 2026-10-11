import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Edit2, Plus, ShieldCheck, Smartphone, Sparkles, Target, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getGoalStats } from '../finance/calculations.js';
import { daysBetween } from '../finance/dates.js';
import { formatCurrency, formatDate } from '../finance/formatters.js';
import { makeId } from '../utils/id.js';
import { Badge, Button, ConfirmDialog, Field, Modal, PageHeading, Panel, ProgressBar, SectionHeading } from '../components/ui/Primitives.jsx';

const goalIcon = (goal, fallback = ShieldCheck) => goal.icon === 'smartphone' ? Smartphone : goal.icon === 'sparkles' ? Sparkles : fallback;
const toneFor = (index) => index === 0 ? 'lime' : index === 1 ? 'violet' : 'amber';

function GoalForm({ open, goal, onClose, onSave }) {
  const [name, setName] = useState(goal?.name || '');
  const [target, setTarget] = useState(String(goal?.target || ''));
  const [targetDate, setTargetDate] = useState(goal?.targetDate || '');
  const [error, setError] = useState('');
  const save = (event) => {
    event.preventDefault();
    const amount = Math.round(Number(target));
    if (!name.trim()) { setError('Give this goal a name.'); return; }
    if (!Number.isFinite(amount) || amount < 1) { setError('Set a target greater than ₹0.'); return; }
    if (!targetDate) { setError('Choose a target date.'); return; }
    onSave({ ...goal, id: goal?.id || makeId('goal'), name: name.trim(), target: amount, targetDate, savedAtStart: Number(goal?.savedAtStart) || 0, icon: goal?.icon || 'sparkles' });
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={goal?.id ? 'Edit savings goal' : 'Create a savings goal'} subtitle="A goal is a plan, not a separate bank account in this demo." width={480} footer={<><Button variant="subtle" onClick={onClose}>Cancel</Button><Button type="submit" form="goal-form">Save goal</Button></>}>
    <form id="goal-form" onSubmit={save}>
      <div className="modal-form-grid">
        <Field className="span-2" label="Goal name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. A weekend away" required />
        <Field label="Target amount (INR)" type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0" required />
        <Field label="Target date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required />
      </div>
      {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  </Modal>;
}

function ContributionModal({ open, goal, state, onClose, onContribute }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < 1) { setError('Enter a contribution greater than ₹0.'); return; }
    onContribute(value);
  };
  const close = () => { setError(''); setAmount(''); onClose(); };
  return <Modal open={open} onClose={close} title={`Add to ${goal?.name || 'your goal'}`} subtitle="This moves money out of everyday spendable cash and into goal progress — it is not an expense." width={450} footer={<><Button variant="subtle" onClick={close}>Cancel</Button><Button type="submit" form="contribution-form">Confirm contribution</Button></>}>
    <form id="contribution-form" onSubmit={submit}>
      <div className="alert-strip" style={{ marginBottom: 14 }}><ShieldCheck size={15} /><span>Spendable balance today: <strong>{formatCurrency(state.startingBudget + state.transactions.filter((item) => item.type === 'income').reduce((total, item) => total + item.amount, 0) - state.transactions.filter((item) => item.type === 'expense' || item.type === 'transfer').reduce((total, item) => total + item.amount, 0))}</strong></span></div>
      <Field label="Contribution amount (INR)" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required />
      {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  </Modal>;
}

function GoalCard({ goal, stats, index, today, onContribute, onEdit, onDelete }) {
  const Icon = goalIcon(goal);
  const months = Math.max(1, Math.ceil(Math.max(0, daysBetween(today, goal.targetDate)) / 30));
  const monthlyNeeded = Math.ceil(stats.remaining / months);
  return <article className={`goal-card ${index === 0 ? 'goal-card-featured' : ''}`}>
    <div className="goal-main">
      <div className="goal-top"><span className={`goal-icon ${index === 1 ? 'violet' : index > 1 ? 'amber' : ''}`}><Icon size={18} /></span><div><h3>{goal.name}{index === 0 && <Badge tone="positive" style={{ marginLeft: 7 }}>PRIORITY</Badge>}</h3><p>Target {formatDate(goal.targetDate, { year: true })} · {Math.max(0, daysBetween(today, goal.targetDate))} days away</p></div></div>
      <div className="goal-progress-line"><strong>{formatCurrency(stats.saved)} <span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 500 }}>saved</span></strong><span>{formatCurrency(stats.target)} target</span></div>
      <ProgressBar value={stats.progress} tone={toneFor(index)} height={7} label={`${goal.name} progress`} />
      <div className="goal-meta"><span>{formatCurrency(stats.remaining)} to go</span><span>{Math.round(stats.progress)}% funded</span><span>About {formatCurrency(monthlyNeeded)}/mo to target</span></div>
    </div>
    <div className="goal-actions">
      <div className="goal-impact-note">Only confirmed contributions change this progress. A Decision Lab preview never moves money.</div>
      <div className="flex-wrap"><Button size="sm" icon={Plus} onClick={() => onContribute(goal)}>Contribute</Button><button className="icon-button" onClick={() => onEdit(goal)} aria-label={`Edit ${goal.name}`}><Edit2 size={14} /></button><button className="icon-button" onClick={() => onDelete(goal)} aria-label={`Delete ${goal.name}`}><Trash2 size={14} /></button></div>
    </div>
  </article>;
}

export default function SavingsGoals() {
  const { state, summary, dispatch } = useFinance();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const goalStats = useMemo(() => Object.fromEntries(state.goals.map((goal) => [goal.id, getGoalStats(state, goal)])), [state]);
  const featured = state.goals.find((goal) => /emergency/i.test(goal.name)) || state.goals[0];
  const totalSaved = Object.values(goalStats).reduce((total, item) => total + item.saved, 0);
  const totalTarget = Object.values(goalStats).reduce((total, item) => total + item.target, 0);

  const saveGoal = (goal) => {
    dispatch({ type: 'UPSERT_GOAL', goal });
    toast(`${goal.name} saved.`);
  };
  const contribute = (amount) => {
    if (!contributing) return;
    if (amount > summary.spendableBalance) { toast('That contribution is larger than your spendable balance.', 'error'); return; }
    dispatch({ type: 'ADD_TRANSACTION', transaction: { id: makeId('tx'), date: state.currentDate, description: `Contribution to ${contributing.name}`, category: 'Savings transfer', amount, type: 'transfer', goalId: contributing.id, status: 'cleared' } });
    toast(`${formatCurrency(amount)} added to ${contributing.name}.`);
    setContributing(null);
  };
  const deleteGoal = () => {
    if (!deleting) return;
    dispatch({ type: 'DELETE_GOAL', id: deleting.id });
    toast(`${deleting.name} removed from your goals.`, 'info');
    setDeleting(null);
  };

  return <>
    <PageHeading eyebrow="PLAN FOR YOUR NEXT CHAPTER · SAVINGS" title="Small steps. Real momentum." description="Track what you’re building toward. Contributions move money from spendable cash into a goal; they aren’t counted as consumption." actions={<Button icon={Plus} onClick={() => setEditing({ name: '', target: '', targetDate: '', savedAtStart: 0, icon: 'sparkles' })}>New goal</Button>} />
    <div className="overview-cards">
      <div className="overview-stat"><div className="metric-topline"><span>Across all goals</span><Target size={15} color="var(--violet)" /></div><div className="metric-number">{formatCurrency(totalSaved)}</div><div className="metric-foot">{formatCurrency(totalTarget)} total target</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Goal progress</span></div><div className="metric-number">{formatCurrency(Math.max(0, totalTarget - totalSaved))}</div><div className="metric-foot">Left to fund across {state.goals.length} goals</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Transferred this challenge</span></div><div className="metric-number">{formatCurrency(summary.transfers)}</div><div className="metric-foot">Contributions recorded as transfers</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Money still spendable</span></div><div className="metric-number">{formatCurrency(summary.spendableBalance)}</div><div className="metric-foot">After expenses and goal contributions</div></div>
    </div>
    <Panel style={{ marginBottom: 15, borderColor: 'rgba(196,243,107,.23)' }}>
      <div className="row-between" style={{ gap: 22, alignItems: 'flex-start' }}>
        <div className="goal-top"><span className="goal-icon"><ShieldCheck size={19} /></span><div><div className="eyebrow" style={{ marginBottom: 4, color: 'var(--lime)' }}>YOUR SAFETY NET</div><h3 style={{ margin: 0, fontSize: 15 }}>{featured?.name || 'Emergency fund'}</h3><p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 10 }}>A little buffer can make a hard month feel more manageable.</p></div></div>
        <div style={{ minWidth: 180, textAlign: 'right' }}><div className="money" style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-.04em' }}>{featured ? formatCurrency(goalStats[featured.id]?.saved || 0) : formatCurrency(0)} <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>of {featured ? formatCurrency(featured.target) : formatCurrency(10000)}</span></div><div style={{ marginTop: 8 }}><ProgressBar value={featured ? goalStats[featured.id]?.progress || 0 : 0} tone="lime" height={6} label="Emergency fund progress" /></div></div>
      </div>
    </Panel>
    <Panel>
      <SectionHeading title="Your goals" detail="Goal balances update only after you confirm a contribution" />
      {state.goals.length === 0 ? <div className="empty-state"><span className="empty-icon"><Target size={20} /></span><h3>No goals yet</h3><p>Set one small target to give your spare money somewhere purposeful to go.</p><Button size="sm" onClick={() => setEditing({ name: '', target: '', targetDate: '', savedAtStart: 0, icon: 'sparkles' })}>Create your first goal</Button></div> : state.goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} stats={goalStats[goal.id]} index={index} today={state.currentDate} onContribute={setContributing} onEdit={setEditing} onDelete={setDeleting} />)}
    </Panel>
    <div className="alert-strip" style={{ marginTop: 14 }}><Sparkles size={15} /><span>Thinking about a purchase? <Link to="/decision-lab" style={{ color: 'var(--violet)', fontWeight: 650 }}>Decision Lab</Link> shows how a proposal changes your available cash before you apply it. Existing goal progress stays put until a real transfer is recorded.</span></div>
    <GoalForm key={editing?.id || (editing ? 'new-goal' : 'closed')} open={Boolean(editing)} goal={editing} onClose={() => setEditing(null)} onSave={saveGoal} />
    <ContributionModal key={contributing?.id || 'contribution-closed'} open={Boolean(contributing)} goal={contributing} state={state} onClose={() => setContributing(null)} onContribute={contribute} />
    <ConfirmDialog open={Boolean(deleting)} title="Remove this savings goal?" description={`${deleting?.name || 'This goal'} will be removed. Contributions already in your ledger remain recorded as transfers.`} confirmLabel="Remove goal" danger onCancel={() => setDeleting(null)} onConfirm={deleteGoal} />
  </>;
}
