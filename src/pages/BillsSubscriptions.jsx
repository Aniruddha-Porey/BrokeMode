import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, CircleAlert, CreditCard, Edit2, Plus, ReceiptText, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../finance/formatters.js';
import { getBillOccurrences } from '../finance/calculations.js';
import { isISODate, parseMoney } from '../finance/validation.js';
import { makeId } from '../utils/id.js';
import { categoriesForState } from '../finance/categories.js';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Modal, PageHeading, Panel, SectionHeading, SelectField } from '../components/ui/Primitives.jsx';

function BillForm({ open, bill, state, onClose, onSave }) {
  const [form, setForm] = useState(() => bill || { name: '', amount: '', category: 'Bills & subscriptions', recurrence: 'monthly', nextDueDate: state.currentDate, kind: 'bill', status: 'active', lastPaidDate: null });
  const [error, setError] = useState('');
  const close = () => { setError(''); onClose(); };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const amount = parseMoney(form.amount, { min: 1 });
    if (!form.name.trim()) { setError('Add a name for this payment.'); return; }
    if (amount === null) { setError('Enter a whole-rupee amount between ₹1 and ₹1,00,00,00,000.'); return; }
    if (!isISODate(form.nextDueDate)) { setError('Choose a valid next due date.'); return; }
    if (form.recurrence !== 'once' && form.status === 'pending') set('status', 'active');
    const recurrence = form.recurrence;
    onSave({ ...form, id: form.id || makeId('bill'), name: form.name.trim(), amount, recurrence, status: recurrence === 'once' ? (form.status === 'paid' ? 'paid' : 'pending') : (form.status === 'cancelled' ? 'cancelled' : 'active') });
    close();
  };
  return <Modal open={open} onClose={close} title={bill?.id ? 'Edit payment' : 'Add a bill or subscription'} subtitle="Forecasts include active payments due before the challenge ends. A payment is not counted again after it is recorded." width={540} footer={<><Button variant="subtle" onClick={close}>Cancel</Button><Button type="submit" form="bill-form">Save payment</Button></>}>
    <form id="bill-form" onSubmit={submit}>
      <div className="modal-form-grid">
        <Field className="span-2" label="Name" maxLength={80} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Mobile plan" required />
        <Field label="Amount (INR)" type="number" min="1" max="1000000000" step="1" value={form.amount} onChange={(event) => set('amount', event.target.value)} placeholder="0" required />
        <SelectField label="Payment type" value={form.kind} onChange={(event) => set('kind', event.target.value)} options={[{ value: 'bill', label: 'Bill' }, { value: 'subscription', label: 'Subscription' }]} />
        <SelectField label="Category" value={form.category} onChange={(event) => set('category', event.target.value)} options={categoriesForState(state)} />
        <SelectField label="Recurrence" value={form.recurrence} onChange={(event) => set('recurrence', event.target.value)} options={[{ value: 'once', label: 'One-time' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
        <Field className="span-2" label="Next due date" type="date" value={form.nextDueDate} onChange={(event) => set('nextDueDate', event.target.value)} required />
      </div>
      {error && <div className="field-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  </Modal>;
}

function statusFor(bill, currentDate, challengeStartDate, cycleEndDate) {
  if (bill.status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (bill.recurrence === 'once' && bill.status === 'paid') return { label: 'Paid', tone: 'positive' };
  if (bill.lastPaidDate && bill.lastPaidDate >= challengeStartDate && bill.nextDueDate > currentDate && bill.nextDueDate > cycleEndDate) return { label: 'Paid this cycle', tone: 'positive' };
  if (bill.nextDueDate < currentDate) return { label: 'Overdue', tone: 'danger' };
  if (bill.status === 'active' || bill.status === 'pending') return { label: 'Pending', tone: 'warning' };
  return { label: 'Upcoming', tone: 'neutral' };
}

export default function BillsSubscriptions() {
  const { state, summary, dispatch } = useFinance();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [payment, setPayment] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const occurrences = useMemo(() => getBillOccurrences(state), [state]);
  const historical = state.transactions.filter((item) => item.billId).sort((a, b) => b.date.localeCompare(a.date));
  const cycleEnd = new Date(`${state.challengeStartDate}T00:00:00Z`);
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() + state.durationDays - 1);
  const cycleEndISO = cycleEnd.toISOString().slice(0, 10);
  const upcomingSum = summary.upcomingCommitments;
  const nextUp = occurrences.slice(0, 6);

  const saveBill = (bill) => {
    const exists = state.bills.some((item) => item.id === bill.id);
    dispatch({ type: exists ? 'UPDATE_BILL' : 'ADD_BILL', bill });
    setEditing(null);
    toast(`${bill.name} saved. Forecasts updated.`);
  };
  const recordPayment = () => {
    if (!payment) return;
    const bill = state.bills.find((item) => item.id === payment.id);
    if (!bill || bill.status === 'cancelled' || bill.status === 'paid') { toast('This payment is no longer pending.', 'error'); setPayment(null); return; }
    dispatch({ type: 'PAY_BILL', id: bill.id, transaction: { id: makeId('tx'), date: state.currentDate, description: bill.name, category: bill.category, amount: bill.amount, type: 'expense', status: 'cleared', billId: bill.id, billDueDate: bill.nextDueDate } });
    toast(`${formatCurrency(bill.amount)} payment recorded. It has been removed from unpaid commitments.`);
    setPayment(null);
  };
  const cancelBill = () => {
    if (!cancelling) return;
    dispatch({ type: 'CANCEL_BILL', id: cancelling.id });
    toast(`${cancelling.name} cancelled. Future charges are removed from the forecast.`, 'info');
    setCancelling(null);
  };
  const deleteBill = () => {
    if (!deleting) return;
    dispatch({ type: 'DELETE_BILL', id: deleting.id });
    toast(`${deleting.name} removed.`, 'info');
    setDeleting(null);
  };

  return <>
    <PageHeading eyebrow="PLAN AHEAD · BILLS & SUBSCRIPTIONS" title="Know what’s already spoken for." description="Separate what you’ve already paid from the obligations still ahead. Only unpaid, active charges enter the forecast." actions={<Button icon={Plus} onClick={() => setEditing({ name: '', amount: '', category: 'Bills & subscriptions', recurrence: 'monthly', nextDueDate: state.currentDate, kind: 'bill', status: 'active' })}>Add payment</Button>} />
    <div className="overview-cards">
      <div className="overview-stat"><div className="metric-topline"><span>Monthly commitments</span><CalendarClock size={15} color="var(--violet)" /></div><div className="metric-number">{formatCurrency(summary.monthlyCommitments)}</div><div className="metric-foot">Active recurring payments, monthly equivalent</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Due before day {summary.durationDays}</span><CircleAlert size={15} color="var(--amber)" /></div><div className="metric-number">{formatCurrency(upcomingSum)}</div><div className="metric-foot">{occurrences.length} unpaid payment{occurrences.length === 1 ? '' : 's'} in this cycle</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Paid this cycle</span><Check size={15} color="var(--lime)" /></div><div className="metric-number">{formatCurrency(historical.reduce((total, item) => total + item.amount, 0))}</div><div className="metric-foot">Historical payments remain in activity</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Spendable after commitments</span></div><div className="metric-number">{formatCurrency(summary.spendableBalance - upcomingSum)}</div><div className="metric-foot">Before future day-to-day spending</div></div>
    </div>
    <div className="dashboard-bottom-grid" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,1.25fr) minmax(290px,.85fr)' }}>
      <Panel>
        <SectionHeading title="Upcoming payment timeline" detail="Future obligations · these amounts are reserved in your forecast" />
        {nextUp.length === 0 ? <EmptyState icon={CalendarClock} title="Nothing due before day 30" description="Active recurring payments beyond this challenge are still listed in the manager below." action={<Button size="sm" onClick={() => setEditing({ name: '', amount: '', category: 'Bills & subscriptions', recurrence: 'monthly', nextDueDate: state.currentDate, kind: 'bill', status: 'active' })}>Add a payment</Button>} /> : <div className="bill-timeline">
          {nextUp.map((item) => <div className="bill-item" key={item.id}>
            <div className="bill-date"><strong>{formatDate(item.date)}</strong>{item.isOverdue ? 'Overdue' : item.recurrence === 'once' ? 'One-time' : item.recurrence}</div>
            <span className="bill-logo">{item.kind === 'subscription' ? <CreditCard size={14} /> : <ReceiptText size={14} />}</span>
            <div className="bill-main"><strong>{item.name}</strong><span>{item.category}{item.scenario ? ' · simulated' : ''}</span></div>
            <div className="bill-end"><div className="bill-amount">{formatCurrency(item.amount)}</div>{item.billId && <Button variant="outline" size="sm" onClick={() => setPayment(state.bills.find((bill) => bill.id === item.billId))}>Pay</Button>}</div>
          </div>)}
        </div>}
        <div className="commitment-total"><span>Total due through {formatDate(cycleEndISO, { year: true })}</span><strong>{formatCurrency(upcomingSum)}</strong></div>
        <div className="tiny-note" style={{ marginTop: 8 }}>One-time or scheduled payments are included once. Marking a payment paid creates one expense and removes that due amount from the forecast.</div>
      </Panel>
      <Panel>
        <SectionHeading title="Cash-flow guardrail" detail="Current challenge balance, less known obligations" />
        <div className="risk-main" style={{ marginTop: 16 }}><span className={`risk-symbol ${summary.spendableBalance - upcomingSum < 0 ? 'danger' : ''}`}><ShieldCheck size={17} /></span><div><strong>{formatCurrency(summary.spendableBalance - upcomingSum)}</strong><span>left after upcoming payments</span></div></div>
        <p className="risk-explanation" style={{ marginTop: 9 }}>This does not include estimated daily spending. See the Dashboard for your day-30 projection.</p>
        <div className="divider" />
        <div className="row-between"><span className="panel-caption">Estimated month-end</span><strong className="money" style={{ fontSize: 14, color: summary.projectedMonthEndBalance < 0 ? 'var(--danger)' : 'var(--text)' }}>{formatCurrency(summary.projectedMonthEndBalance)}</strong></div>
        <Link className="btn btn-outline btn-sm" style={{ marginTop: 13 }} to="/decision-lab">Test a new commitment <span aria-hidden="true">→</span></Link>
      </Panel>
    </div>
    <Panel style={{ marginTop: 15 }}>
      <SectionHeading title="Bills & subscriptions" detail={`${state.bills.length} entries · cancelled subscriptions do not create future charges`} />
      {state.bills.length === 0 ? <EmptyState icon={ReceiptText} title="No bills on your calendar" description="Add an upcoming payment so your daily safe-to-spend number can make room for it." action={<Button size="sm" onClick={() => setEditing({ name: '', amount: '', category: 'Bills & subscriptions', recurrence: 'monthly', nextDueDate: state.currentDate, kind: 'bill', status: 'active' })}>Add a bill</Button>} /> : <div className="table-scroll desktop-table" style={{ overflow: 'visible' }}>
        <table className="data-table"><thead><tr><th>Name</th><th>Next due</th><th>Recurrence</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {state.bills.map((bill) => {
            const status = statusFor(bill, state.currentDate, state.challengeStartDate, cycleEndISO);
            const active = bill.status !== 'cancelled' && bill.status !== 'paid';
            const canPay = active && occurrences.some((item) => item.billId === bill.id);
            return <tr key={bill.id}>
              <td><div className="transaction-info"><span className="transaction-symbol">{bill.kind === 'subscription' ? <CreditCard size={14} /> : <ReceiptText size={14} />}</span><span className="primary-cell">{bill.name}</span></div></td>
              <td>{formatDate(bill.nextDueDate, { year: true })}</td><td>{bill.recurrence === 'once' ? 'One-time' : bill.recurrence}</td><td><Badge tone={status.tone}>{status.label}</Badge></td><td className="table-amount">{formatCurrency(bill.amount)}</td>
              <td><div className="table-actions">{canPay && <button className="icon-button" onClick={() => setPayment(bill)} aria-label={`Record payment for ${bill.name}`}><Check size={14} /></button>}{active && <button className="icon-button" onClick={() => setEditing({ ...bill })} aria-label={`Edit ${bill.name}`}><Edit2 size={14} /></button>}{active && <button className="icon-button" onClick={() => setCancelling(bill)} aria-label={`Cancel ${bill.name}`}><XCircle size={14} /></button>}{bill.status === 'cancelled' && <button className="icon-button" onClick={() => setDeleting(bill)} aria-label={`Delete ${bill.name}`}><Trash2 size={14} /></button>}</div></td>
            </tr>;
          })}
        </tbody></table>
      </div>}
      {state.bills.length > 0 && <div className="mobile-bills-list">{state.bills.map((bill) => {
        const status = statusFor(bill, state.currentDate, state.challengeStartDate, cycleEndISO);
        const active = bill.status !== 'cancelled' && bill.status !== 'paid';
        const canPay = active && occurrences.some((item) => item.billId === bill.id);
        return <div className="mobile-bill-row" key={bill.id}>
          <div className="row-between" style={{ alignItems: 'flex-start' }}><div className="transaction-info"><span className="transaction-symbol">{bill.kind === 'subscription' ? <CreditCard size={14} /> : <ReceiptText size={14} />}</span><div className="transaction-info-copy"><strong>{bill.name}</strong><span>{bill.category} · {bill.recurrence === 'once' ? 'One-time' : bill.recurrence}</span></div></div><div style={{ textAlign: 'right' }}><strong className="money" style={{ fontSize: 11 }}>{formatCurrency(bill.amount)}</strong><div style={{ marginTop: 4 }}><Badge tone={status.tone}>{status.label}</Badge></div></div></div>
          <div className="row-between" style={{ marginTop: 8 }}><span className="tiny-note">Next due {formatDate(bill.nextDueDate, { year: true })}</span><div className="flex-wrap">{canPay && <button className="icon-button" onClick={() => setPayment(bill)} aria-label={`Record payment for ${bill.name}`}><Check size={14} /></button>}{active && <button className="icon-button" onClick={() => setEditing({ ...bill })} aria-label={`Edit ${bill.name}`}><Edit2 size={14} /></button>}{active && <button className="icon-button" onClick={() => setCancelling(bill)} aria-label={`Cancel ${bill.name}`}><XCircle size={14} /></button>}{bill.status === 'cancelled' && <button className="icon-button" onClick={() => setDeleting(bill)} aria-label={`Delete ${bill.name}`}><Trash2 size={14} /></button>}</div></div>
        </div>;
      })}</div>}
      <div className="tiny-note" style={{ marginTop: 10 }}>Recurring charges are forecast only when their next payment date falls within this challenge. Monthly commitment total includes active recurring plans even if their next renewal is after day 30.</div>
    </Panel>
    {historical.length > 0 && <Panel style={{ marginTop: 15 }}>
      <SectionHeading title="Historical bill payments" detail="Recorded expenses linked to a bill; not counted as future commitments" />
      <div className="transaction-list">{historical.slice(0, 5).map((item) => <div className="transaction-item" key={item.id}><div className="transaction-info"><span className="transaction-symbol"><Check size={14} /></span><div className="transaction-info-copy"><strong>{item.description}</strong><span>Paid {formatDate(item.date)} · historical outflow</span></div></div><div className="transaction-amount">{formatCurrency(item.amount)}</div></div>)}</div>
    </Panel>}
    <BillForm key={editing?.id || (editing ? 'new-bill' : 'closed')} open={Boolean(editing)} bill={editing} state={state} onClose={() => setEditing(null)} onSave={saveBill} />
    <ConfirmDialog open={Boolean(payment)} title="Record this payment?" description={`${payment?.name || 'This payment'} will create a ${formatCurrency(payment?.amount || 0)} expense dated today. Future obligations will be recalculated.`} confirmLabel="Record payment" onCancel={() => setPayment(null)} onConfirm={recordPayment} />
    <ConfirmDialog open={Boolean(cancelling)} title="Cancel this subscription?" description={`${cancelling?.name || 'This subscription'} will stop generating future forecast charges. Historical payments will remain in transaction history.`} confirmLabel="Cancel subscription" danger onCancel={() => setCancelling(null)} onConfirm={cancelBill} />
    <ConfirmDialog open={Boolean(deleting)} title="Delete cancelled payment?" description={`${deleting?.name || 'This payment'} will be removed from the manager. Existing transaction history is kept.`} confirmLabel="Delete payment" danger onCancel={() => setDeleting(null)} onConfirm={deleteBill} />
  </>;
}
