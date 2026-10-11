import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Edit2, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../finance/formatters.js';
import { compareDates } from '../finance/dates.js';
import { filterTransactions, sortTransactions } from '../finance/transactionFilters.js';
import { categoriesForState } from '../finance/categories.js';
import { makeId } from '../utils/id.js';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Modal, PageHeading, Panel, SectionHeading, SelectField } from '../components/ui/Primitives.jsx';

const typeLabel = { expense: 'Expense', income: 'Income', transfer: 'Savings transfer' };
const symbolFor = (type) => type === 'income' ? '+' : type === 'transfer' ? '↗' : '−';

function TransactionForm({ open, onClose, initial, state, onSave }) {
  const [form, setForm] = useState(() => initial || { description: '', type: 'expense', category: 'Food & drink', amount: '', date: state.currentDate, goalId: '' });
  const [error, setError] = useState('');
  const isEditing = Boolean(initial?.id);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { setError(''); onClose(); };
  const submit = (event) => {
    event.preventDefault();
    const amount = Math.round(Number(form.amount));
    if (!form.description.trim()) { setError('Add a description so you can recognize this entry later.'); return; }
    if (!Number.isFinite(amount) || amount < 1) { setError('Amount must be at least ₹1.'); return; }
    if (compareDates(form.date, state.challengeStartDate) < 0 || compareDates(form.date, state.currentDate) > 0) { setError('Choose a date within the current challenge and not after today.'); return; }
    if (form.type === 'transfer' && !form.goalId) { setError('Choose the savings goal receiving this transfer.'); return; }
    const cleanForm = { ...form };
    if (form.type !== 'expense') { delete cleanForm.billId; delete cleanForm.billDueDate; }
    onSave({ ...cleanForm, id: form.id || makeId('tx'), description: form.description.trim(), category: form.type === 'income' ? 'Income' : form.type === 'transfer' ? 'Savings transfer' : form.category, amount, status: 'cleared', ...(form.type === 'transfer' ? { goalId: form.goalId } : { goalId: undefined }) });
    close();
  };
  return <Modal open={open} onClose={close} title={isEditing ? 'Edit transaction' : 'Add transaction'} subtitle="Keep the ledger aligned with what actually happened." width={530} footer={<><Button variant="subtle" onClick={close}>Cancel</Button><Button type="submit" form="transaction-form" icon={isEditing ? Edit2 : Plus}>{isEditing ? 'Save changes' : 'Add transaction'}</Button></>}>
    <form id="transaction-form" onSubmit={submit}>
      <div className="segmented-control segmented-full" style={{ marginBottom: 15 }}>
        {['expense', 'income', 'transfer'].map((type) => <button key={type} type="button" className={form.type === type ? 'selected' : ''} onClick={() => { set('type', type); setError(''); }}>{typeLabel[type]}</button>)}
      </div>
      <div className="modal-form-grid">
        <Field className="span-2" label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="e.g. Groceries, salary, or emergency fund" required />
        {form.type === 'expense' && <SelectField label="Category" value={form.category} onChange={(event) => set('category', event.target.value)} options={categoriesForState(state)} />}
        {form.type === 'transfer' && <SelectField label="Move into goal" value={form.goalId} onChange={(event) => set('goalId', event.target.value)} options={[{ value: '', label: 'Choose a goal' }, ...state.goals.map((goal) => ({ value: goal.id, label: goal.name }))]} />}
        <Field label="Amount (INR)" type="number" min="1" step="1" value={form.amount} onChange={(event) => set('amount', event.target.value)} placeholder="0" required />
        <Field label="Date" type="date" min={state.challengeStartDate} max={state.currentDate} value={form.date} onChange={(event) => set('date', event.target.value)} required />
      </div>
      <p className="tiny-note" style={{ margin: '12px 0 0' }}>{form.type === 'transfer' ? 'A transfer increases goal progress and reduces spendable cash, but is not counted as consumption spending.' : form.type === 'income' ? 'Income increases your ledger balance. It is not treated as budget spending.' : 'An expense is counted once when it is recorded.'}</p>
      {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  </Modal>;
}

function TransactionRow({ item, onEdit, onDelete }) {
  const amountTone = item.type === 'income' ? 'amount-income' : item.type === 'transfer' ? 'amount-transfer' : 'amount-expense';
  return <tr>
    <td><div className="transaction-info"><span className="transaction-symbol">{item.type === 'income' ? <ArrowDownLeft size={14} /> : item.type === 'transfer' ? <Wallet size={14} /> : <ArrowUpRight size={14} />}</span><span className="primary-cell">{item.description}</span></div></td>
    <td>{formatDate(item.date, { year: true })}</td>
    <td>{item.category}</td>
    <td><Badge tone={item.type === 'income' ? 'positive' : item.type === 'transfer' ? 'violet' : 'neutral'}>{typeLabel[item.type] || item.type}</Badge></td>
    <td className={`table-amount ${amountTone}`}>{symbolFor(item.type)}{formatCurrency(item.amount)}</td>
    <td><div className="table-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.description}`}><Edit2 size={14} /></button><button className="icon-button" onClick={() => onDelete(item)} aria-label={`Delete ${item.description}`}><Trash2 size={14} /></button></div></td>
  </tr>;
}

export default function Transactions() {
  const { state, summary, dispatch } = useFinance();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('challenge');
  const [sort, setSort] = useState('newest');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => sortTransactions(filterTransactions(state.transactions, {
    search, type, category, period, currentDate: state.currentDate, challengeStartDate: state.challengeStartDate,
  }), sort), [state.transactions, state.currentDate, state.challengeStartDate, search, type, category, period, sort]);

  const income = state.transactions.filter((item) => item.type === 'income').reduce((total, item) => total + item.amount, 0);
  const expenses = state.transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + item.amount, 0);
  const transfer = state.transactions.filter((item) => item.type === 'transfer').reduce((total, item) => total + item.amount, 0);
  const net = income - expenses - transfer;

  const save = (transaction) => {
    if (editing) dispatch({ type: 'UPDATE_TRANSACTION', transaction });
    else dispatch({ type: 'ADD_TRANSACTION', transaction });
    setEditing(null);
    setFormOpen(false);
    toast(editing ? 'Transaction updated. Your totals have been recalculated.' : 'Transaction added to your ledger.');
  };
  const deleteTransaction = () => {
    if (!deleting) return;
    dispatch({ type: 'DELETE_TRANSACTION', id: deleting.id });
    toast(`${deleting.description} removed. Your totals have been recalculated.`, 'info');
    setDeleting(null);
  };
  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item) => { setEditing({ ...item, goalId: item.goalId || '' }); setFormOpen(true); };

  return <>
    <PageHeading eyebrow="YOUR MONEY · TRANSACTION LEDGER" title="Every rupee, in one place." description="Search, review, and correct what moved in or out during this challenge." actions={<Button icon={Plus} onClick={openAdd}>Add transaction</Button>} />
    <div className="overview-cards">
      <div className="overview-stat"><div className="metric-topline"><span>Income</span><ArrowDownLeft size={15} color="var(--lime)" /></div><div className="metric-number">{formatCurrency(income)}</div><div className="metric-foot">Added this challenge</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Expenses</span><ArrowUpRight size={15} color="var(--muted)" /></div><div className="metric-number">{formatCurrency(expenses)}</div><div className="metric-foot">Consumption spending</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Savings transfers</span><Wallet size={15} color="var(--violet)" /></div><div className="metric-number">{formatCurrency(transfer)}</div><div className="metric-foot">Not counted as expenses</div></div>
      <div className="overview-stat"><div className="metric-topline"><span>Net cash flow</span><ArrowLeftRight size={15} color={net >= 0 ? 'var(--lime)' : 'var(--amber)'} /></div><div className="metric-number" style={{ color: net < 0 ? 'var(--amber)' : 'var(--text)' }}>{net < 0 ? '−' : ''}{formatCurrency(Math.abs(net))}</div><div className="metric-foot">Income minus expenses and transfers</div></div>
    </div>
    <Panel>
      <SectionHeading title="Transaction history" detail={`${filtered.length} of ${state.transactions.length} entries · demo ledger, not a bank connection`} />
      <div className="table-filters">
        <label className="search-field"><Search size={14} /><input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search descriptions or categories" aria-label="Search transactions" /></label>
        <select className="input select-input filter-select" aria-label="Filter by transaction type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Savings transfers</option></select>
        <select className="input select-input filter-select" aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{[...new Set(state.transactions.map((item) => item.category))].sort().map((item) => <option key={item}>{item}</option>)}</select>
        <select className="input select-input filter-select" aria-label="Filter by date" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="challenge">This challenge</option><option value="7days">Last 7 days</option></select>
        <select className="input select-input filter-select" aria-label="Sort transactions" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>
      </div>
      {filtered.length === 0 ? <EmptyState icon={Search} title="No transactions match" description="Try a different search or clear one of your filters." action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setType('all'); setCategory('all'); setPeriod('challenge'); }}>Clear filters</Button>} /> : <>
        <div className="table-scroll desktop-table">
          <table className="data-table"><thead><tr><th>Description</th><th>Date</th><th>Category</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((item) => <TransactionRow key={item.id} item={item} onEdit={openEdit} onDelete={setDeleting} />)}</tbody></table>
        </div>
        <div className="mobile-transaction-list">{filtered.map((item) => <div className="list-row" key={item.id}>
          <div className="transaction-info"><span className="transaction-symbol">{item.type === 'income' ? <ArrowDownLeft size={14} /> : item.type === 'transfer' ? <Wallet size={14} /> : <ArrowUpRight size={14} />}</span><div className="transaction-info-copy"><strong>{item.description}</strong><span>{item.category} · {formatDate(item.date)}</span></div></div>
          <div style={{ textAlign: 'right' }}><div className={`transaction-amount ${item.type === 'income' ? 'amount-income' : item.type === 'transfer' ? 'amount-transfer' : 'amount-expense'}`}>{symbolFor(item.type)}{formatCurrency(item.amount)}</div><div style={{ marginTop: 3, display: 'flex', gap: 4, justifyContent: 'flex-end' }}><button className="icon-button" onClick={() => openEdit(item)} aria-label={`Edit ${item.description}`}><Edit2 size={13} /></button><button className="icon-button" onClick={() => setDeleting(item)} aria-label={`Delete ${item.description}`}><Trash2 size={13} /></button></div></div>
        </div>)}</div>
      </>}
    </Panel>
    <TransactionForm key={editing?.id || (formOpen ? 'new' : 'closed')} open={formOpen} onClose={() => setFormOpen(false)} initial={editing} state={state} onSave={save} />
    <ConfirmDialog open={Boolean(deleting)} title="Delete this transaction?" description={`${deleting?.description || 'This entry'} will be removed from your history and all financial totals will update.`} confirmLabel="Delete transaction" danger onCancel={() => setDeleting(null)} onConfirm={deleteTransaction} />
  </>;
}
