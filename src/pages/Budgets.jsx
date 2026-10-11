import React, { useMemo, useState } from 'react';
import { ArrowRight, CircleAlert, Edit2, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatPercent } from '../finance/formatters.js';
import { parseMoney } from '../finance/validation.js';
import { CATEGORY_COLORS } from '../data/demoData.js';
import { makeId } from '../utils/id.js';
import { Button, Field, Modal, PageHeading, Panel, ProgressBar, SectionHeading } from '../components/ui/Primitives.jsx';

function estimateCategory(state, summary, category) {
  const elapsed = Math.max(1, summary.challengeDay);
  const actual = summary.categorySpending[category] || 0;
  const paceActual = category === 'Bills & subscriptions' ? 0 : state.transactions.filter((item) => item.type === 'expense' && item.category === category && !item.excludeFromForecastPace).reduce((total, item) => total + item.amount, 0);
  const futureVariable = paceActual / elapsed * summary.daysRemainingAfterToday;
  const futureCommitments = summary.upcomingOccurrences.filter((item) => item.category === category).reduce((total, item) => total + item.amount, 0);
  return Math.round(actual + futureVariable + futureCommitments);
}

function BudgetEditor({ open, budget, onClose, onSave, existingCategories = [] }) {
  const [amount, setAmount] = useState(String(budget?.limit || ''));
  const [category, setCategory] = useState(budget?.category || '');
  const [error, setError] = useState('');
  const save = (event) => {
    event.preventDefault();
    const limit = parseMoney(amount, { min: 1 });
    if (limit === null) { setError('Set a whole-rupee budget between ₹1 and ₹1,00,00,00,000.'); return; }
    const cleanCategory = category.trim().slice(0, 64);
    if (budget?.isNew && !cleanCategory) { setError('Add a name for this category.'); return; }
    if (budget?.isNew && existingCategories.some((item) => item.toLocaleLowerCase() === cleanCategory.toLocaleLowerCase())) { setError('A budget already exists for this category.'); return; }
    onSave({ ...budget, category: budget?.isNew ? cleanCategory : budget.category, limit });
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={budget?.isTotal ? 'Adjust challenge funds' : 'Adjust category budget'} subtitle={budget?.isTotal ? 'Change the starting amount available for this 30-day challenge.' : budget?.category ? `Change the planned amount for ${budget.category}.` : 'Set a planned amount for a new category.'} width={430} footer={<><Button variant="subtle" onClick={onClose}>Cancel</Button><Button type="submit" form="budget-editor-form">Save budget</Button></>}>
    <form id="budget-editor-form" onSubmit={save} noValidate>
      {budget?.isNew && <Field label="Category name" maxLength={64} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Pet care" required />}
      <Field label={budget?.isTotal ? 'Starting challenge funds (INR)' : 'Planned amount (INR)'} type="number" min="1" max="1000000000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required />
      {error && <div className="field-error" role="alert" style={{ marginTop: 9 }}>{error}</div>}
    </form>
  </Modal>;
}

export default function Budgets() {
  const { state, summary, dispatch } = useFinance();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const totalLimit = summary.totalBudgeted;
  const spent = summary.recordedExpenses;
  const remaining = totalLimit - spent;
  const forecastSpend = spent + summary.projectedVariableSpend + summary.upcomingCommitments;
  const projectedRemaining = totalLimit - forecastSpend;
  const allocatedSorted = useMemo(() => [...summary.categoryBudgets].sort((a, b) => b.limit - a.limit), [summary.categoryBudgets]);

  const saveBudget = (budget) => {
    const exists = state.budgets.some((item) => item.id === budget.id);
    dispatch({ type: exists ? 'UPDATE_BUDGET' : 'ADD_BUDGET', budget: { ...budget, id: budget.id || makeId('budget') } });
    toast(`${budget.category} budget updated.`);
  };

  return <>
    <PageHeading eyebrow="PLAN YOUR SPENDING · BUDGETS" title="Give every rupee a job." description="Compare what you planned with what’s actually happened — then adjust before a category gets away from you." actions={<><Button variant="outline" icon={Plus} onClick={() => setEditing({ id: '', category: '', limit: 0, isNew: true })}>Add category</Button><Button variant="outline" icon={Edit2} onClick={() => setEditing({ id: 'budget-total', category: 'Challenge funds', limit: state.startingBudget, isTotal: true })}>Edit challenge funds</Button></>} />
    <div className="overview-cards">
      <div className="overview-stat"><div className="metric-topline"><span>Planned allocation</span></div><div className="metric-number">{formatCurrency(totalLimit)}</div><div className="metric-foot">Across {state.budgets.length} categories</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Spent so far</span></div><div className="metric-number">{formatCurrency(spent)}</div><div className="metric-foot">{formatPercent(totalLimit ? spent / totalLimit * 100 : 0)} of category budgets used</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Unallocated by spending</span></div><div className="metric-number">{formatCurrency(remaining)}</div><div className="metric-foot">Transfer to savings is not consumption spending</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Forecast spend · estimate</span></div><div className="metric-number" style={{ color: projectedRemaining < 0 ? 'var(--danger)' : 'var(--text)' }}>{formatCurrency(forecastSpend)}</div><div className="metric-foot" style={{ color: projectedRemaining < 0 ? 'var(--danger)' : 'var(--muted)' }}>{projectedRemaining >= 0 ? `${formatCurrency(projectedRemaining)} forecast headroom` : `${formatCurrency(Math.abs(projectedRemaining))} projected over-allocation`}</div></div>
    </div>
    {projectedRemaining < 0 && <div className="inline-warning danger" style={{ marginBottom: 15 }}><CircleAlert size={14} />At your current average pace plus known commitments, estimated month-end spending is {formatCurrency(Math.abs(projectedRemaining))} over the total budget. This is an estimate; category plans can be adjusted below.</div>}
    <div className="dashboard-bottom-grid" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,1.45fr) minmax(280px,.75fr)' }}>
      <Panel>
        <SectionHeading title="Planned vs actual" detail="Actual amounts exclude savings transfers" action={<span className="panel-caption">Day {summary.challengeDay} / {summary.durationDays}</span>} />
        <div style={{ overflow: 'visible' }}>
          {allocatedSorted.map((item) => {
            const forecast = estimateCategory(state, summary, item.category);
            const over = forecast > item.limit;
            return <div className="budget-row" key={item.id}>
              <div className="budget-name"><strong>{item.category}</strong><span>Plan {formatCurrency(item.limit)}</span></div>
              <div>
                <div className="budget-progress-info"><span>Actual {formatCurrency(item.spent)}</span><span>{formatPercent(item.utilization)}</span></div>
                <ProgressBar value={item.utilization} tone={item.utilization >= 90 ? 'amber' : 'violet'} height={6} label={`${item.category} actual utilization`} />
                {over && <div className="row-warning" style={{ marginTop: 6 }}><TrendingUp size={11} />Est. {formatCurrency(forecast)} by day {summary.durationDays}</div>}
              </div>
              <div className="budget-remaining"><strong style={{ color: item.remaining < 0 ? 'var(--danger)' : 'var(--text)' }}>{formatCurrency(item.remaining)}</strong><span>remaining</span></div>
              <div className="budget-warning-cell">{over ? <span className="row-warning"><CircleAlert size={12} />Over pace</span> : <span className="tiny-note">Est. {formatCurrency(forecast)}</span>}</div>
              <button className="icon-button" onClick={() => setEditing({ ...item })} aria-label={`Edit ${item.category} budget`}><Edit2 size={14} /></button>
            </div>;
          })}
        </div>
        {state.budgets.length === 0 && <div className="tiny-note">No categories have a planned budget yet.</div>}
      </Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Panel>
          <SectionHeading title="Allocation mix" detail={`How ${formatCurrency(totalLimit)} is assigned`} />
          <div className="progress-track" role="img" style={{ display: 'flex', height: 10, overflow: 'hidden', margin: '17px 0 15px' }} aria-label={`Budget allocation across ${allocatedSorted.length} categories; total ${formatCurrency(totalLimit)}`}>
            {allocatedSorted.map((item) => <span key={item.id} style={{ width: `${totalLimit ? item.limit / totalLimit * 100 : 0}%`, height: '100%', background: CATEGORY_COLORS[item.category] || '#9299AB', minWidth: item.limit ? 2 : 0 }} title={`${item.category}: ${formatCurrency(item.limit)}`} />)}
          </div>
          <div className="category-list">
            {allocatedSorted.slice(0, 6).map((item) => <div className="row-between" key={item.id} style={{ fontSize: 10 }}><span className="category-name"><span className="category-dot" style={{ background: CATEGORY_COLORS[item.category] || '#9299AB' }} />{item.category}</span><strong className="money">{formatCurrency(item.limit)}</strong></div>)}
          </div>
          <div className="divider" />
          <div className="tiny-note">Category allocations can add up to more or less than your challenge amount. Keep the total aligned with what you actually have.</div>
        </Panel>
        <Panel>
          <SectionHeading title="Budget guardrail" />
          <div className="risk-main" style={{ marginTop: 8 }}><span className={`risk-symbol ${projectedRemaining < 0 ? 'danger' : projectedRemaining < 1000 ? '' : 'positive'}`}>{projectedRemaining < 0 ? <CircleAlert size={17} /> : <TrendingUp size={17} />}</span><div><strong>{projectedRemaining >= 0 ? formatCurrency(projectedRemaining) : `−${formatCurrency(Math.abs(projectedRemaining))}`}</strong><span>{projectedRemaining >= 0 ? 'estimated budget headroom' : 'estimated budget overrun'}</span></div></div>
          <p className="risk-explanation" style={{ marginTop: 8 }}>Estimate uses your recorded daily spend rate through the remaining days, plus unpaid payments already on your calendar.</p>
          <Link className="btn btn-outline btn-sm" style={{ marginTop: 14 }} to="/decision-lab">Check a purchase <ArrowRight size={13} /></Link>
        </Panel>
      </div>
    </div>
    <BudgetEditor key={editing?.id || (editing?.isNew ? 'new-category' : 'closed')} open={Boolean(editing)} budget={editing} existingCategories={state.budgets.map((item) => item.category)} onClose={() => setEditing(null)} onSave={(budget) => {
      if (budget.isTotal) {
        dispatch({ type: 'SET_STARTING_BUDGET', amount: budget.limit });
        setEditing(null);
        toast('Challenge budget updated.');
      } else saveBudget(budget);
    }} />
  </>;
}
