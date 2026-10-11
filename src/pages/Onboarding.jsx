import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, CreditCard, Heart, ShoppingBag, Target, Wallet, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency } from '../finance/formatters.js';
import { Button, Panel, ProgressBar } from '../components/ui/Primitives.jsx';

const priorities = [
  { id: 'emergency', title: 'Build a safety net', description: 'Keep a little money back for the unexpected.', icon: Heart },
  { id: 'everyday', title: 'Everyday spending', description: 'Make essentials and daily choices last.', icon: Wallet },
  { id: 'subscriptions', title: 'Recurring costs', description: 'Get clear on the bills that keep coming back.', icon: CreditCard },
  { id: 'purchase', title: 'A planned purchase', description: 'Make room for one thing you really want.', icon: ShoppingBag },
];

export default function Onboarding() {
  const { state, dispatch } = useFinance();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [priority, setPriority] = useState(state.priority || 'emergency');
  const continueToNext = () => setStep((current) => Math.min(3, current + 1));
  const finish = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING', priority });
    toast('Your 30-day challenge is ready. Start by recording what moves.', 'success');
    navigate('/dashboard', { replace: true });
  };
  const chosen = priorities.find((item) => item.id === priority) || priorities[0];
  return <div className="onboarding-layout">
    <header className="onboarding-top">
      <div className="brand"><span className="brand-mark"><Wallet size={17} /></span><span className="brand-copy"><span className="brand-word">Broke<span>Mode</span></span><span className="brand-caption">Survive the month</span></span></div>
      <span className="tiny-note">Step {step} of 3</span>
    </header>
    <main className="onboarding-main">
      <div className="onboarding-progress" aria-label={`Onboarding step ${step} of 3`}>{[1,2,3].map((number) => <span key={number} className={step >= number ? 'active' : ''} />)}</div>
      {step === 1 && <>
        <div className="eyebrow">A SIMPLE, 30-DAY FINANCIAL CHALLENGE</div>
        <h1>One month. One clear picture.</h1>
        <p>Start with ₹10,000 for 30 days. BrokeMode helps you see what’s left, what’s coming up, and what a purchase might change.</p>
        <Panel className="onboarding-budget">
          <div className="onboarding-budget-total"><div><div className="eyebrow" style={{ marginBottom: 4 }}>YOUR STARTING CHALLENGE</div><strong>{formatCurrency(state.startingBudget)}</strong></div><BadgeCheck size={23} color="var(--lime)" /></div>
          <div className="onboarding-budget-row"><span>Challenge length</span><strong>{state.durationDays} days</strong></div>
          <div className="onboarding-budget-row"><span>Simple starting allowance</span><strong>{formatCurrency(Math.floor(state.startingBudget / state.durationDays))} / day</strong></div>
          <div className="onboarding-budget-row"><span>Bank connection</span><strong>Not required · demo only</strong></div>
        </Panel>
        <div className="alert-strip" style={{ marginTop: 12 }}><CalendarDays size={14} /><span>New challenge starts at day 1. Add transactions and unpaid commitments as they happen; estimates are based only on what you enter.</span></div>
      </>}
      {step === 2 && <>
        <div className="eyebrow">MAKE IT YOURS</div>
        <h1>What matters most this month?</h1>
        <p>Pick one priority to help BrokeMode keep the right thing in view. You can change your plan later.</p>
        <div className="priority-options">
          {priorities.map(({ id, title, description, icon: Icon }) => <button type="button" key={id} className={`priority-option ${priority === id ? 'selected' : ''}`} onClick={() => { setPriority(id); dispatch({ type: 'SET_PRIORITY', priority: id }); }} aria-pressed={priority === id}>
            <span className="priority-option-icon"><Icon size={15} /></span><span><strong>{title}</strong><span>{description}</span></span>
          </button>)}
        </div>
      </>}
      {step === 3 && <>
        <div className="eyebrow">READY WHEN YOU ARE</div>
        <h1>Your month, with room to move.</h1>
        <p>Here’s the challenge you’re about to start. Nothing is connected to a bank; you decide what to add.</p>
        <Panel className="onboarding-budget">
          <div className="onboarding-budget-total"><div><div className="eyebrow" style={{ marginBottom: 4 }}>30-DAY STARTING BALANCE</div><strong>{formatCurrency(state.startingBudget)}</strong></div><span className="badge badge-violet">DAY 1</span></div>
          <div className="onboarding-budget-row"><span>Starting daily guide</span><strong>{formatCurrency(Math.floor(state.startingBudget / state.durationDays))} / day</strong></div>
          <div className="onboarding-budget-row"><span>Your focus</span><strong>{chosen.title}</strong></div>
          <div className="onboarding-budget-row"><span>Budget categories</span><strong>{state.budgets.length} editable categories</strong></div>
          <div style={{ marginTop: 14 }}><ProgressBar value={0} tone="lime" height={5} label="New challenge progress" /></div>
        </Panel>
        <div className="alert-strip" style={{ marginTop: 12 }}><Zap size={14} /><span>Your first move: record an expense or open Decision Lab before making a purchase.</span></div>
      </>}
      <div className="onboarding-actions">
        {step > 1 ? <Button variant="subtle" icon={ArrowLeft} onClick={() => setStep((current) => current - 1)}>Back</Button> : <span />}
        {step < 3 ? <Button size="lg" iconRight={ArrowRight} onClick={continueToNext}>Continue</Button> : <Button variant="lime" size="lg" icon={Target} iconRight={ArrowRight} onClick={finish}>Start my challenge</Button>}
      </div>
    </main>
    <footer className="auth-challenge-foot"><span>Survive the Month. Master Your Money.</span><button className="text-link" onClick={() => { dispatch({ type: 'COMPLETE_ONBOARDING', priority }); navigate('/dashboard'); }}>Skip for now</button></footer>
  </div>;
}
