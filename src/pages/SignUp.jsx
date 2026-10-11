import React, { useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, CircleAlert, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { Button, Field } from '../components/ui/Primitives.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { sanitizeEmail, sanitizeText } from '../finance/validation.js';

function strengthFor(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export default function SignUp() {
  const { login } = useAuth();
  const { dispatch } = useFinance();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', accepted: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = useMemo(() => strengthFor(form.password), [form.password]);
  const strengthLabel = ['Add a password', 'Needs work', 'Getting stronger', 'Good', 'Strong'];
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const name = sanitizeText(form.name, 80);
    const email = sanitizeEmail(form.email);
    if (!name) { setError('Enter your name.'); return; }
    if (!email) { setError('Enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Your passwords do not match.'); return; }
    if (!form.accepted) { setError('Accept the demo terms to continue.'); return; }
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      dispatch({ type: 'START_NEW_CHALLENGE', priority: 'emergency', profile: { name, email } });
      login(email, name, true);
      setLoading(false);
      toast('Demo profile created. Next, set up your 30-day challenge.', 'success');
      navigate('/onboarding', { replace: true });
    }, 280);
  };

  return <AuthLayout>
    <h2>Create your account</h2>
    <p className="auth-intro">Start with a plan for the next 30 days.</p>
    {error && <div className="auth-error" role="alert"><CircleAlert size={14} />{error}</div>}
    <form onSubmit={submit} noValidate>
      <div className="auth-fields">
        <Field label="Full name" maxLength={80} autoComplete="name" placeholder="Your name" value={form.name} onChange={(event) => set('name', event.target.value)} required />
        <Field label="Email address" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => set('email', event.target.value)} required />
        <div className="field"><label className="field-label" htmlFor="signup-password">Password</label><div className="password-wrap"><input id="signup-password" className="input" type={showPassword ? 'text' : 'password'} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={(event) => set('password', event.target.value)} required aria-describedby="password-strength-description" /><button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
          <div className="password-strength"><div className="password-strength-bars" aria-hidden="true">{[1,2,3,4].map((step) => <span key={step} className={strength >= step ? 'active' : ''} />)}</div><span id="password-strength-description">Password strength: {strengthLabel[strength]}</span></div>
        </div>
        <Field label="Confirm password" type="password" maxLength={128} autoComplete="new-password" placeholder="Re-enter password" value={form.confirm} onChange={(event) => set('confirm', event.target.value)} required />
      </div>
      <label className="checkbox-row" style={{ alignItems: 'flex-start', marginTop: 15 }}><input type="checkbox" checked={form.accepted} onChange={(event) => set('accepted', event.target.checked)} /><span>I agree to use this as a frontend demo and understand no bank account is connected.</span></label>
      <Button type="submit" className="auth-submit" size="lg" loading={loading} icon={UserRound} iconRight={ArrowRight}>Create account</Button>
    </form>
    <p className="auth-switch">Already have a demo profile? <Link className="text-link" to="/login">Sign in</Link></p>
    <div className="auth-demo-note">This form creates only a local prototype session. Passwords are not sent to a server or stored by BrokeMode.</div>
  </AuthLayout>;
}
