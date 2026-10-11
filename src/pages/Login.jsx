import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ArrowRight, CircleAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { Button, Field } from '../components/ui/Primitives.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFinance } from '../context/FinanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { sanitizeEmail } from '../finance/validation.js';

export default function Login() {
  const { login, exploreDemo } = useAuth();
  const { dispatch } = useFinance();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const email = sanitizeEmail(form.email);
    if (!email) { setError('Enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Use a password with at least 8 characters for this demo.'); return; }
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      login(email, email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), form.remember);
      dispatch({ type: 'SET_PROFILE', profile: { email, name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) } });
      toast('Demo session started. No credentials were sent to a server.', 'info');
      navigate('/dashboard', { replace: true });
      setLoading(false);
    }, 280);
  };

  const demo = () => {
    dispatch({ type: 'RESET_DEMO' });
    exploreDemo();
    toast('Welcome to the seeded BrokeMode demo.', 'success');
    navigate('/dashboard', { replace: true });
  };

  return <AuthLayout>
    <h2>Welcome back</h2>
    <p className="auth-intro">Pick up where your money left off.</p>
    {error && <div className="auth-error" role="alert"><CircleAlert size={14} />{error}</div>}
    <div id="forgot-password-note" className="auth-demo-note" role="status" hidden={!forgotNotice} style={{ marginBottom: 12 }}>Password recovery is not connected in this local prototype. Try the demo flow with any valid email and an 8+ character password.</div>
    <form onSubmit={submit} noValidate>
      <div className="auth-fields">
        <Field label="Email address" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => set('email', event.target.value)} required />
        <div className="field"><label className="field-label" htmlFor="login-password">Password</label><div className="password-wrap"><input id="login-password" className="input" type={showPassword ? 'text' : 'password'} maxLength={128} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(event) => set('password', event.target.value)} required /><button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
      </div>
      <div className="auth-options">
        <label className="checkbox-row"><input type="checkbox" checked={form.remember} onChange={(event) => set('remember', event.target.checked)} />Remember me</label>
        <button type="button" className="text-link" aria-expanded={forgotNotice} aria-controls="forgot-password-note" onClick={() => setForgotNotice((value) => !value)}>Forgot password?</button>
      </div>
      <Button type="submit" className="auth-submit" size="lg" loading={loading} iconRight={ArrowRight}>Sign in</Button>
    </form>
    <div className="auth-divider">or</div>
    <Button variant="outline" size="lg" className="auth-explore" onClick={demo}>Explore demo <ArrowRight size={15} /></Button>
    <p className="auth-switch">New to BrokeMode? <Link className="text-link" to="/signup">Create an account</Link></p>
    <div className="auth-demo-note"><LockKeyhole size={13} style={{ verticalAlign: '-3px', marginRight: 5 }} />Frontend demo authentication only. Use any valid email and an 8+ character password; credentials are not transmitted or stored.</div>
  </AuthLayout>;
}
