import React, { useState } from 'react';
import { ArrowDownToLine, Check, ChevronRight, CircleAlert, Download, LogOut, Palette, RotateCcw, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../finance/formatters.js';
import { ConfirmDialog, Field, PageHeading, Panel, SectionHeading, Toggle, Button } from '../components/ui/Primitives.jsx';

function csvCell(value) {
  const string = String(value ?? '');
  return `"${string.replaceAll('"', '""')}"`;
}

function exportTransactions(transactions) {
  const headings = ['Date', 'Description', 'Category', 'Type', 'Amount (INR)', 'Status'];
  const lines = [headings.map(csvCell).join(',')];
  for (const item of transactions) lines.push([item.date, item.description, item.category, item.type, item.amount, item.status || 'cleared'].map(csvCell).join(','));
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brokemode-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SettingsJump({ active, setActive }) {
  const links = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'simulation', label: 'Simulation', icon: Settings2 },
    { id: 'data', label: 'Data & account', icon: ShieldCheck },
  ];
  return <nav className="settings-nav" aria-label="Settings sections">{links.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); document.getElementById(`settings-${id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }}><Icon size={15} /><span>{label}</span></button>)}</nav>;
}

export default function Settings() {
  const { state, dispatch } = useFinance();
  const { user, login, logout, exploreDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [active, setActive] = useState('profile');
  const [profileName, setProfileName] = useState(state.profile?.name || user?.name || '');
  const [profileEmail, setProfileEmail] = useState(state.profile?.email || user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const saveProfile = (event) => {
    event.preventDefault();
    if (!profileName.trim()) { setProfileError('Enter a name for your profile.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(profileEmail)) { setProfileError('Enter a valid email address.'); return; }
    dispatch({ type: 'SET_PROFILE', profile: { name: profileName.trim(), email: profileEmail.trim() } });
    login(profileEmail.trim(), profileName.trim());
    setProfileError('');
    toast('Profile preferences saved.');
  };
  const setPreference = (key, value) => {
    dispatch({ type: 'SET_PREFERENCE', key, value });
    if (key === 'appearance') document.documentElement.dataset.theme = value;
    toast(`${key === 'forecastStyle' ? 'Forecast preference' : key === 'appearance' ? 'Appearance' : 'Preference'} updated.`, 'info');
  };
  const resetDemo = () => {
    dispatch({ type: 'RESET_DEMO' });
    exploreDemo();
    document.documentElement.dataset.theme = 'dark';
    setConfirmReset(false);
    toast('Demo data restored to the day-12 scenario.');
  };
  const signOut = () => {
    logout();
    setConfirmLogout(false);
    navigate('/login', { replace: true });
    toast('Signed out of this frontend demo.', 'info');
  };

  return <>
    <PageHeading eyebrow="YOUR ACCOUNT · SETTINGS" title="Make BrokeMode yours." description="Profile and experience preferences for this local demo. Changes are saved in this browser only." />
    <div className="settings-layout">
      <SettingsJump active={active} setActive={setActive} />
      <div>
        <Panel className="settings-section" id="settings-profile">
          <SectionHeading title="Profile" detail="Personalize your workspace identity" />
          <form onSubmit={saveProfile}>
            <div className="settings-form-row">
              <Field label="Display name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" required />
              <Field label="Email address" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} placeholder="you@example.com" required />
            </div>
            {profileError && <div className="field-error" style={{ marginTop: 9 }}>{profileError}</div>}
            <div className="row-between" style={{ marginTop: 14 }}><span className="tiny-note">This profile is stored locally in the browser.</span><Button type="submit" size="sm" icon={Check}>Save profile</Button></div>
          </form>
        </Panel>

        <Panel className="settings-section" id="settings-appearance">
          <SectionHeading title="Appearance & display" detail="A quiet workspace for daily money decisions" />
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Light appearance</strong><span>Switch between the default dark theme and a high-contrast light theme.</span></div><Toggle id="appearance-toggle" checked={state.preferences.appearance === 'light'} onChange={(checked) => setPreference('appearance', checked ? 'light' : 'dark')} ariaLabel="Enable light appearance" /></div>
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Display currency</strong><span>All amounts and exports use Indian rupees.</span></div><span className="badge badge-violet">INR · ₹</span></div>
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Due-payment reminders</strong><span>Show a reminder dot and upcoming amounts in the top bar.</span></div><Toggle id="notifications-toggle" checked={state.preferences.notifications} onChange={(checked) => setPreference('notifications', checked)} ariaLabel="Enable due-payment reminders" /></div>
        </Panel>

        <Panel className="settings-section" id="settings-simulation">
          <SectionHeading title="Simulation preferences" detail="Choose how estimates account for your observed spending" />
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Forecast pace</strong><span>Applies to estimated variable spending only. Actual ledger figures are unchanged.</span></div><select className="input select-input" style={{ maxWidth: 200, minHeight: 36, fontSize: 10 }} value={state.preferences.forecastStyle} onChange={(event) => setPreference('forecastStyle', event.target.value)} aria-label="Forecast pace"><option value="steady">Steady · observed average</option><option value="conservative">Cautious · 15% more</option><option value="optimistic">Optimistic · 10% less</option></select></div>
          <div className="alert-strip" style={{ marginTop: 12 }}><CircleAlert size={14} /><span><strong>Current convention:</strong> safe daily allowance divides spendable cash after known commitments by the number of days remaining, including today. Forecasts cover days after today.</span></div>
        </Panel>

        <Panel className="settings-section" id="settings-data">
          <SectionHeading title="Data & account" detail="The demo has no bank connection or server account" />
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Export transaction history</strong><span>Download the current ledger as a CSV file in INR.</span></div><Button variant="outline" size="sm" icon={Download} onClick={() => { exportTransactions(state.transactions); toast('CSV export prepared.'); }}>Export CSV</Button></div>
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Reset demo data</strong><span>Restore the consistent day-12 example: ₹10,000 start, ₹3,550 spent, ₹6,450 left.</span></div><Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setConfirmReset(true)}>Reset to demo</Button></div>
          <div className="settings-action-row"><div className="settings-action-copy"><strong>Sign out</strong><span>End this local frontend demo session.</span></div><Button variant="danger" size="sm" icon={LogOut} onClick={() => setConfirmLogout(true)}>Sign out</Button></div>
          <div className="tiny-note" style={{ marginTop: 13 }}>Demo data is saved to localStorage on this device. Do not enter real financial credentials. This prototype does not connect to a bank or provide production authentication.</div>
        </Panel>
      </div>
    </div>
    <ConfirmDialog open={confirmReset} title="Reset this workspace to demo data?" description="Your browser’s current transactions, budgets, goals, bills, and preferences will be replaced by the seeded day-12 scenario." confirmLabel="Reset demo data" danger onCancel={() => setConfirmReset(false)} onConfirm={resetDemo} />
    <ConfirmDialog open={confirmLogout} title="Sign out of the demo?" description="Your finance data stays in this browser. You can return with Explore Demo or sign in again." confirmLabel="Sign out" danger onCancel={() => setConfirmLogout(false)} onConfirm={signOut} />
  </>;
}
