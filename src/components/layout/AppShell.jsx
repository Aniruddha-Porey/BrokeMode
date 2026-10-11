import React, { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, Bell, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, ChevronRight,
  FlaskConical, LayoutDashboard, LogOut, Menu, Moon, Plus, ReceiptText, Settings, ShieldCheck,
  Sparkles, Sun, Target, WalletCards, X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../../finance/formatters.js';
import { CATEGORIES } from '../../data/demoData.js';
import { makeId } from '../../utils/id.js';
import { Button, Field, Modal, SelectField } from '../ui/Primitives.jsx';

const navGroups = [
  { label: 'Your money', items: [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Decision Lab', path: '/decision-lab', icon: FlaskConical, accent: true },
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { label: 'Budgets', path: '/budgets', icon: ChartNoAxesColumnIncreasing },
  ] },
  { label: 'Plan ahead', items: [
    { label: 'Savings goals', path: '/savings-goals', icon: Target },
    { label: 'Bills & subscriptions', path: '/bills-subscriptions', icon: ReceiptText },
    { label: 'Insights', path: '/insights', icon: Sparkles },
  ] },
  { label: 'Account', items: [
    { label: 'Settings', path: '/settings', icon: Settings },
  ] },
];

const titleMap = Object.fromEntries(navGroups.flatMap((group) => group.items.map((item) => [item.path, item.label])));

function Brand({ compact = false }) {
  return <Link to="/dashboard" className="brand" aria-label="BrokeMode overview">
    <span className="brand-mark" aria-hidden="true"><WalletCards size={18} strokeWidth={2.1} /></span>
    <span className="brand-copy"><span className="brand-word">Broke<span>Mode</span></span>{!compact && <span className="brand-caption">Survive the month</span>}</span>
  </Link>;
}

function SidebarNav({ onNavigate }) {
  const { summary } = useFinance();
  return <>
    {navGroups.map((group) => <div key={group.label}>
      <div className="nav-label">{group.label}</div>
      <nav className="nav-list" aria-label={group.label}>
        {group.items.map(({ label, path, icon: Icon, accent }) => <NavLink key={path} to={path} onClick={onNavigate} title={label} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Icon size={17} strokeWidth={1.8} /></span>
          <span className="nav-text">{label}</span>
          {accent && summary.risk.code !== 'on-track' && <span className="nav-count">●</span>}
        </NavLink>)}
      </nav>
    </div>)}
  </>;
}

function SidebarStatus() {
  const { summary } = useFinance();
  return <div className="sidebar-bottom">
    <div className="sidebar-challenge">
      <div className="sidebar-challenge-top"><strong>30-day challenge</strong><span className="sidebar-status" /></div>
      <div className="sidebar-challenge-main"><strong>{formatCurrency(summary.spendableBalance)}</strong><span>left to spend</span></div>
      <div className="progress-track" style={{ height: 3 }}><span className="progress-fill fill-lime" style={{ width: `${Math.min(100, summary.challengeDay / summary.durationDays * 100)}%` }} /></div>
      <div className="sidebar-challenge-top" style={{ marginTop: 7 }}><span>Day {summary.challengeDay}</span><span>Day {summary.durationDays}</span></div>
    </div>
    <div className="sidebar-footer"><span className="demo-chip"><span className="footer-copy">Demo workspace</span></span><span>v1.0</span></div>
  </div>;
}

function QuickEntryModal({ open, onClose }) {
  const { state, dispatch, summary } = useFinance();
  const toast = useToast();
  const [form, setForm] = useState({ description: '', category: 'Food & drink', amount: '', type: 'expense' });
  const [error, setError] = useState('');
  const handleClose = () => { setError(''); onClose(); };
  const submit = (event) => {
    event.preventDefault();
    const amount = Math.round(Number(form.amount));
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Add a description and a positive amount to continue.'); return; }
    dispatch({ type: 'ADD_TRANSACTION', transaction: { id: makeId('tx'), date: state.currentDate, description: form.description.trim(), category: form.type === 'income' ? 'Income' : form.category, amount, type: form.type, status: 'cleared' } });
    setForm({ description: '', category: 'Food & drink', amount: '', type: 'expense' });
    handleClose();
    toast(`${form.type === 'income' ? 'Income' : 'Expense'} recorded for ${formatCurrency(amount)}.`);
  };
  return <Modal open={open} onClose={handleClose} title="Add a money movement" subtitle={`Recorded against day ${summary.challengeDay} of your challenge.`} width={470} footer={<><Button variant="subtle" onClick={handleClose}>Cancel</Button><Button type="submit" form="quick-entry-form" icon={Plus}>Save entry</Button></>}>
    <form id="quick-entry-form" onSubmit={submit}>
      <div className="segmented-control segmented-full" style={{ marginBottom: 14 }}>
        <button type="button" className={form.type === 'expense' ? 'selected' : ''} onClick={() => setForm((s) => ({ ...s, type: 'expense' }))}>Expense</button>
        <button type="button" className={form.type === 'income' ? 'selected' : ''} onClick={() => setForm((s) => ({ ...s, type: 'income' }))}>Income</button>
      </div>
      <div className="modal-form-grid">
        <Field className="span-2" label="Description" placeholder="e.g. Lunch with friends" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} required />
        {form.type === 'expense' && <SelectField label="Category" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} options={CATEGORIES} />}
        <Field label="Amount" type="number" min="1" step="1" placeholder="0" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} required />
      </div>
      {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  </Modal>;
}

export default function AppShell({ children }) {
  const { state, summary, dispatch } = useFinance();
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = titleMap[location.pathname] || 'Overview';
  const dayText = `Day ${summary.challengeDay} of ${summary.durationDays}`;
  const upcomingNotice = useMemo(() => summary.upcomingOccurrences.slice(0, 3), [summary.upcomingOccurrences]);
  const initials = (user?.name || state.profile?.name || 'A').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const signOut = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
    toast('You have signed out of this demo session.', 'info');
  };

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <div style={{ marginTop: 12 }}><SidebarNav /></div>
      <SidebarStatus />
    </aside>

    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
          <span className="mobile-brand"><Brand compact /></span>
          <div className="topbar-crumb">Workspace <span className="crumb-sep">/</span></div>
          <span className="topbar-title">{title}</span>
          <span className="topbar-day"><CalendarDays size={13} />{dayText}</span>
        </div>
        <div className="topbar-actions">
          <Button variant="secondary" size="sm" icon={Plus} aria-label="Add entry" title="Add entry" onClick={() => setQuickOpen(true)}>Add entry</Button>
          <button className="icon-button theme-toggle" type="button" title={state.preferences.appearance === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label={state.preferences.appearance === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => dispatch({ type: 'SET_PREFERENCE', key: 'appearance', value: state.preferences.appearance === 'light' ? 'dark' : 'light' })}>{state.preferences.appearance === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
          <div className="profile-menu">
            <button className="icon-button notification-button" type="button" disabled={!state.preferences.notifications} title={state.preferences.notifications ? 'Upcoming payment reminders' : 'Turn on reminders in Settings'} aria-label={state.preferences.notifications ? 'Upcoming payment reminders' : 'Payment reminders are off'} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}><Bell size={16} />{state.preferences.notifications && summary.upcomingOccurrences.length > 0 && <span className="notification-dot" />}</button>
            {notificationsOpen && <div className="menu-popover" style={{ width: 280 }}>
              <div className="panel-title-row" style={{ padding: '7px 8px 4px', marginBottom: 0 }}><div><h3>Money coming up</h3><p>{summary.upcomingOccurrences.length} payments before day {summary.durationDays}</p></div><button className="icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={14} /></button></div>
              {upcomingNotice.length === 0 ? <div className="tiny-note" style={{ padding: 10 }}>Nothing due before the challenge ends.</div> : upcomingNotice.map((item) => <button className="menu-item" type="button" key={item.id} onClick={() => { setNotificationsOpen(false); navigate('/bills-subscriptions'); }}>
                <span className="transaction-symbol"><ReceiptText size={14} /></span><span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 10, color: 'var(--text)' }}>{item.name}</strong><small style={{ color: 'var(--muted)' }}>{formatDate(item.date)}</small></span><span className="money">{formatCurrency(item.amount)}</span>
              </button>)}
              <Link className="menu-item" to="/bills-subscriptions" onClick={() => setNotificationsOpen(false)} style={{ color: 'var(--violet)' }}>View payment timeline <ChevronRight size={14} /></Link>
            </div>}
          </div>
          <span className="topbar-divider" />
          <div className="profile-menu">
            <button className="profile-trigger" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} aria-expanded={profileOpen} aria-label="Open profile menu">
              <span className="avatar">{initials}</span><span className="profile-meta"><strong>{user?.name || state.profile?.name || 'Member'}</strong><span>Demo workspace</span></span><ChevronDown size={14} />
            </button>
            {profileOpen && <div className="menu-popover">
              <div className="menu-item" style={{ cursor: 'default' }}><span className="avatar" style={{ width: 27, height: 27 }}>{initials}</span><span><strong style={{ display: 'block', color: 'var(--text)', fontSize: 10 }}>{user?.name || 'BrokeMode member'}</strong><small style={{ color: 'var(--muted)' }}>Frontend demo account</small></span></div>
              <div className="menu-separator" />
              <Link className="menu-item" to="/settings" onClick={() => setProfileOpen(false)}><Settings size={15} />Settings</Link>
              <button className="menu-item" onClick={signOut}><LogOut size={15} />Sign out</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="content-wrap">{children}</main>
    </div>

    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {[
        { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Decision', path: '/decision-lab', icon: FlaskConical },
        { label: 'Activity', path: '/transactions', icon: ArrowLeftRight },
        { label: 'Budgets', path: '/budgets', icon: ChartNoAxesColumnIncreasing },
      ].map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <Icon strokeWidth={1.8} /><span>{label}</span>
      </NavLink>)}
      <a href="#more" className={`mobile-nav-link ${location.pathname === '/settings' ? 'active' : ''}`} onClick={(event) => { event.preventDefault(); setDrawerOpen(true); }}><Menu strokeWidth={1.8} /><span>More</span></a>
    </nav>

    {drawerOpen && <div className="mobile-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
      <div className="mobile-drawer">
        <button className="icon-button mobile-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><X size={17} /></button>
        <Brand />
        <div style={{ marginTop: 12 }}><SidebarNav onNavigate={() => setDrawerOpen(false)} /></div>
        <SidebarStatus />
      </div>
    </div>}
    <QuickEntryModal open={quickOpen} onClose={() => setQuickOpen(false)} />
  </div>;
}
