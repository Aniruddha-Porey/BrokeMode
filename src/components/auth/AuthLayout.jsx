import React from 'react';
import { WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext.jsx';
import { formatCurrency } from '../../finance/formatters.js';

function AuthBrand() {
  const { summary } = useFinance();
  return <aside className="auth-brand-panel">
    <Link to="/" className="brand" aria-label="BrokeMode home"><span className="brand-mark"><WalletCards size={18} strokeWidth={2.1} /></span><span className="brand-copy"><span className="brand-word">Broke<span>Mode</span></span><span className="brand-caption">Survive the month</span></span></Link>
    <div className="auth-brand-copy">
      <div className="eyebrow">BROKE BUT FUNCTIONAL — SURVIVE THE MONTH</div>
      <h1>Your money.<br />Your next move.</h1>
      <p>Know what’s left, protect what matters, and see the cost of a decision before it becomes a transaction.</p>
      <div className="auth-visual">
        <div className="auth-visual-top"><span>30-day challenge · sample</span><strong>Day {summary.challengeDay} of {summary.durationDays}</strong></div>
        <svg className="auth-sparkline" viewBox="0 0 420 90" preserveAspectRatio="none" role="img" aria-label="Illustrative balance trend with a forecast boundary">
          <path d="M0 76 H420" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" />
          <path d="M0 18 C30 20 37 25 64 29 S100 36 128 40 S168 43 192 49 S227 51 250 56" fill="none" stroke="var(--violet)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M250 56 C280 58 297 62 318 66 S357 74 380 77 S406 81 420 83" fill="none" stroke="var(--lime)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 5" />
          <line x1="250" y1="8" x2="250" y2="86" stroke="var(--amber)" strokeWidth="1" strokeDasharray="2 4" opacity=".7" />
          <circle cx="250" cy="56" r="4" fill="var(--lime)" stroke="var(--surface)" strokeWidth="2" />
          <text x="258" y="17" fill="var(--amber)" fontSize="8" letterSpacing="1.1">TODAY</text>
        </svg>
        <div className="auth-visual-bottom"><span>Available now <strong>{formatCurrency(summary.spendableBalance)}</strong></span><span>Forecast <strong>{formatCurrency(summary.projectedMonthEndBalance)}</strong></span></div>
      </div>
    </div>
    <div className="auth-challenge-foot"><span>Survive the Month. Master Your Money.</span><span>Prototype workspace · INR</span></div>
  </aside>;
}

export default function AuthLayout({ children }) {
  return <div className="auth-layout"><AuthBrand /><main className="auth-form-panel"><div className="auth-form-container">
    <Link to="/" className="auth-mobile-brand" aria-label="BrokeMode home"><span className="brand-mark"><WalletCards size={18} /></span><span className="brand-word">Broke<span>Mode</span></span></Link>
    {children}
  </div></main></div>;
}
