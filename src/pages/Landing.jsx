import React, { useState } from 'react';
import '../styles/landing.css';
import {
  ArrowRight, ChevronDown, Compass, FlaskConical,
  Gauge, LockKeyhole, Menu, Moon, ShieldCheck, Sparkles, Sun, Target,
  WalletCards, X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFinance } from '../context/FinanceContext.jsx';

const sampleDailySpend = [180, 220, 95, 460, 130, 300, 280, 150, 200, 500, 350, 685];

const features = [
  { icon: Gauge, image: '/images/landing-daily-plan.jpg', alt: 'Hands reviewing a budget on a phone beside a notebook and tea.', title: 'A number you can use today', copy: 'Get a daily safe-to-spend amount that respects the days and bills still ahead.' },
  { icon: FlaskConical, image: '/images/landing-decision.jpg', alt: 'A cafe moment before deciding whether to make a small purchase.', title: 'Try the choice before you make it', copy: 'See how a purchase shifts your runway, then keep it as a what-if—or apply it once.' },
  { icon: Target, image: '/images/landing-goals.jpg', alt: 'A coin going into a savings jar beside a phone and notebook.', title: 'Make room for what matters', copy: 'Keep goals, essentials, and real life in the same honest picture.' },
];

function Brand() {
  return <Link className="landing-brand" to="/" aria-label="BrokeMode home">
    <span className="brand-mark"><WalletCards size={18} strokeWidth={2.1} /></span>
    <span className="brand-copy"><span className="brand-word">Broke<span>Mode</span></span><span className="brand-caption">Survive the month</span></span>
  </Link>;
}

function MonthSnapshot() {
  return <div className="landing-month-snapshot" role="group" aria-label="Illustrative BrokeMode month snapshot">
    <div className="landing-snapshot-header">
      <div><span className="landing-snapshot-kicker">YOUR MONTH, IN VIEW</span><span className="landing-snapshot-challenge">30-day challenge</span></div>
      <span className="landing-snapshot-status"><i /> ON TRACK <span>·</span> DAY 12 OF 30</span>
    </div>
    <div className="landing-snapshot-main">
      <div className="landing-snapshot-main-copy">
        <div className="landing-snapshot-balances">
          <div className="landing-snapshot-balance"><span>Still to work with</span><strong>₹6,450</strong><small>of your ₹10,000 challenge fund</small></div>
          <div className="landing-snapshot-balance"><span>Safe for today</span><strong>₹286 <small>/ day</small></strong><small>after known upcoming bills</small></div>
        </div>
        <div className="landing-snapshot-progress-head"><span>Spent so far</span><strong>₹3,550 <small>of ₹10,000</small></strong></div>
        <div className="landing-snapshot-progress" role="progressbar" aria-label="Challenge fund spent" aria-valuemin="0" aria-valuemax="10000" aria-valuenow="3550" aria-valuetext="₹3,550 spent of ₹10,000"><span /></div>
      </div>
      <div className="landing-snapshot-ring-wrap">
        <svg className="landing-snapshot-ring" width="106" height="106" viewBox="0 0 120 120" role="img" aria-label="35.5 percent of the challenge fund spent">
          <defs><linearGradient id="snapshot-ring-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#9B87F5" /><stop offset="100%" stopColor="#C4F36B" /></linearGradient></defs>
          <circle className="landing-snapshot-ring-track" cx="60" cy="60" r="47" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="8" />
          <circle className="landing-snapshot-ring-value" cx="60" cy="60" r="47" fill="none" stroke="url(#snapshot-ring-gradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray="104.8 295.3" transform="rotate(-90 60 60)" />
          <text className="landing-snapshot-ring-percent" x="60" y="57" fill="#F5F6FA" textAnchor="middle" fontSize="16" fontWeight="700">35.5%</text>
          <text className="landing-snapshot-ring-caption" x="60" y="74" fill="#9299AB" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1">SPENT</text>
        </svg>
      </div>
    </div>
    <div className="landing-snapshot-trend">
      <div className="landing-snapshot-trend-head"><div><strong>Daily spending</strong><span>Illustrative sample days</span></div><span className="landing-snapshot-trend-total">₹3,550 total</span></div>
      <div className="landing-snapshot-trend-bars" role="img" aria-label="Illustrative daily spending over the first 12 challenge days, totaling ₹3,550">
        {sampleDailySpend.map((amount, index) => <span key={index} className={index === sampleDailySpend.length - 1 ? 'is-today' : ''} style={{ height: `${Math.max(14, Math.round((amount / 685) * 100))}%` }} title={`Day ${index + 1}: ₹${amount.toLocaleString('en-IN')}`} />)}
      </div>
      <div className="landing-snapshot-trend-axis"><span>DAY 1</span><span>DAY 6</span><span>DAY 12</span></div>
    </div>
    <div className="landing-snapshot-note"><span className="landing-snapshot-note-dot" /> Sample figures · Known upcoming bills are held aside · Today counts</div>
  </div>;
}

export default function Landing() {
  const { state, dispatch } = useFinance();
  const { exploreDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const appearance = state.preferences?.appearance || 'dark';

  const startDemo = () => {
    dispatch({ type: 'RESET_DEMO' });
    exploreDemo();
    navigate('/dashboard', { replace: true });
  };
  const closeMenu = () => setMenuOpen(false);
  const setAppearance = () => dispatch({ type: 'SET_PREFERENCE', key: 'appearance', value: appearance === 'light' ? 'dark' : 'light' });

  return <div className="landing-page">
    <div className="landing-ambient landing-ambient-one" aria-hidden="true" />
    <div className="landing-ambient landing-ambient-two" aria-hidden="true" />
    <header className="landing-nav-wrap">
      <div className="landing-nav">
        <Brand />
        <nav id="landing-menu" className={`landing-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#built-for-real-life" onClick={closeMenu}>Built for real life</a>
          <a href="#your-data" onClick={closeMenu}>Your data</a>
        </nav>
        <div className="landing-nav-actions">
          <button className="landing-theme-button" type="button" onClick={setAppearance} aria-label={appearance === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={appearance === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>{appearance === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
          <Link className="landing-login" to={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? 'My overview' : 'Sign in'}</Link>
          <Link className="landing-nav-cta" to={isAuthenticated ? '/dashboard' : '/signup'}>{isAuthenticated ? 'Open overview' : 'Get started'} <ArrowRight size={15} /></Link>
          <button className="landing-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="landing-menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><span className="landing-kicker-spark"><Sparkles size={13} /></span> BROKE BUT FUNCTIONAL · THE 30-DAY CHALLENGE</div>
          <h1 id="landing-title">Survive the month.<br /><span>Stay in control.</span></h1>
          <p className="landing-tagline">Survive the Month. Master Your Money.</p>
          <p className="landing-description">Turn ₹10,000 and 30 days into a plan you can actually use. See what’s safe today, what’s coming next, and what a decision could change—before you spend.</p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" to={isAuthenticated ? '/dashboard' : '/signup'}>{isAuthenticated ? 'Open my overview' : 'Start my 30-day challenge'} <ArrowRight size={17} /></Link>
            {isAuthenticated
              ? <a className="landing-secondary-cta" href="#how-it-works"><span><Sparkles size={15} /></span> See how BrokeMode works</a>
              : <button className="landing-secondary-cta" type="button" onClick={startDemo}><span><Compass size={15} /></span> Explore the demo</button>}
          </div>
          <div className="landing-reassurance"><LockKeyhole size={13} /><span>No bank connection. No judgment. Just a clearer next move.</span></div>
          <a className="landing-scroll-cue" href="#how-it-works"><span>Scroll for the simple version</span><ChevronDown size={14} /></a>
        </div>
        <div className="landing-visual-wrap"><MonthSnapshot /></div>
      </section>

      <section className="landing-proof" id="built-for-real-life" aria-label="BrokeMode highlights">
        <div className="landing-proof-intro"><span>LESS PANIC.</span><strong>More month.</strong></div>
        <div className="landing-proof-item"><span className="proof-icon proof-icon-violet"><Gauge size={16} /></span><span><strong>See a daily number</strong><small>Built from your real balance</small></span></div>
        <div className="landing-proof-item"><span className="proof-icon proof-icon-lime"><FlaskConical size={16} /></span><span><strong>Stress-test a choice</strong><small>Before it becomes a transaction</small></span></div>
        <div className="landing-proof-item"><span className="proof-icon proof-icon-amber"><Target size={16} /></span><span><strong>Keep room for goals</strong><small>Without losing sight of essentials</small></span></div>
      </section>

      <section className="landing-how" id="how-it-works" aria-labelledby="landing-how-title">
        <div className="landing-section-head"><div><span className="landing-section-kicker">A PLAN, NOT A LECTURE</span><h2 id="landing-how-title">Small steps. <span>Clearer days.</span></h2></div><p>Money can feel unpredictable. Your next step doesn’t have to.</p></div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, image, alt, title, copy }, index) => <article className="landing-feature-card" key={title}>
            <div className="landing-feature-media"><img src={image} alt={alt} loading="lazy" decoding="async" /><span className="landing-feature-photo-tag">BrokeMode · your month, made clearer</span><span className="landing-feature-photo-index">0{index + 1} / 03</span></div>
            <div className="landing-feature-copy">
              <div className="landing-feature-top"><span className="landing-feature-icon"><Icon size={18} /></span><span className="landing-feature-index">0{index + 1}</span></div>
              <h3>{title}</h3><p>{copy}</p>
            </div>
            <div className="landing-feature-line" />
          </article>)}
        </div>
      </section>

      <section className="landing-final-card" aria-label="Start your challenge">
        <div className="landing-final-orb" aria-hidden="true" />
        <div className="landing-final-icon"><WalletCards size={20} /></div>
        <div className="landing-final-copy"><span>YOUR MONTH STARTS WITH ONE NUMBER</span><h2>Let’s make ₹10,000 feel less like a guess.</h2><p>Start fresh, or explore a seeded demo month. Either way, you stay in control.</p></div>
        <div className="landing-final-actions"><Link className="landing-primary-cta" to={isAuthenticated ? '/dashboard' : '/signup'}>{isAuthenticated ? 'Open my overview' : 'Build my plan'} <ArrowRight size={16} /></Link>{isAuthenticated ? <a className="landing-final-demo" href="#how-it-works">See how it works</a> : <button className="landing-final-demo" type="button" onClick={startDemo}>Try the demo instead</button>}</div>
      </section>
    </main>

    <footer className="landing-footer" id="your-data">
      <Brand />
      <p><ShieldCheck size={13} /> Frontend demo only. No real banking, payments, or secure authentication.</p>
      <span>Made for the month you’re in. <span>© BrokeMode</span></span>
    </footer>
  </div>;
}
