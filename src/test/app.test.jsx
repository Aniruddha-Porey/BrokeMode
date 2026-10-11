import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App.jsx';
import { FinanceProvider } from '../context/FinanceContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

function renderApp(path = '/login') {
  window.history.pushState({}, '', path);
  return render(<FinanceProvider><AuthProvider><ToastProvider><BrowserRouter><App /></BrowserRouter></ToastProvider></AuthProvider></FinanceProvider>);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem('brokemode-auth:v1', 'signed-out');
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('authentication and onboarding flows', () => {
  it('records a new expense through the transaction dialog', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/transactions');
    await user.click(await screen.findByRole('button', { name: 'Add transaction' }));
    await screen.findByRole('dialog');
    await user.type(await screen.findByLabelText('Description', { exact: false }), 'Test purchase');
    await user.type(await screen.findByRole('spinbutton'), '120');
    const submitButtons = screen.getAllByRole('button', { name: 'Add transaction' });
    await user.click(submitButtons[submitButtons.length - 1]);
    expect(await screen.findByText('₹3,670')).toBeInTheDocument();
  });

  it('shows the public landing first and lets visitors enter the seeded demo', async () => {
    window.localStorage.removeItem('brokemode-auth:v1');
    const user = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Survive the month\. Stay in control\./i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Illustrative BrokeMode month snapshot' })).toBeInTheDocument();
    expect(screen.getByText('₹6,450')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '35.5 percent of the challenge fund spent' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explore the demo' }));
    expect(await screen.findByRole('heading', { name: 'Make your money count.' }, { timeout: 5000 })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('brokemode-auth:v1')).user.demo).toBe(true);
  });

  it('switches between dark and light appearances and persists the choice', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Switch to light mode' }));
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(JSON.parse(window.localStorage.getItem('brokemode-finance:v1')).preferences.appearance).toBe('light');
  });

  it('validates sign-in fields with a useful inline error', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(await screen.findByLabelText('Email address', { exact: false }), 'not-an-email');
    await user.type(await screen.findByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
  });

  it('supports a complete sign-up and three-step first challenge on a compact form', async () => {
    const user = userEvent.setup();
    renderApp('/signup');
    await user.type(await screen.findByLabelText('Full name', { exact: false }), 'Sam Lee');
    await user.type(await screen.findByLabelText('Email address', { exact: false }), 'sam@example.com');
    await user.type(await screen.findByLabelText('Create password'), 'BudgetSafe12!');
    await user.type(await screen.findByLabelText('Confirm password', { exact: false }), 'BudgetSafe12!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'One month. One clear picture.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'What matters most this month?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Everyday spending/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Your month, with room to move.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start my challenge' }));
    expect(await screen.findByRole('heading', { name: 'Make your money count.' })).toBeInTheDocument();
  });

  it('renders every authenticated product route without runtime errors', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const routes = [
      ['/dashboard', 'Make your money count.'],
      ['/decision-lab', 'Before you spend, see what changes.'],
      ['/transactions', 'Every rupee, in one place.'],
      ['/budgets', 'Give every rupee a job.'],
      ['/savings-goals', 'Small steps. Real momentum.'],
      ['/bills-subscriptions', 'Know what’s already spoken for.'],
      ['/insights', 'The story behind your balance.'],
      ['/settings', 'Make BrokeMode yours.'],
    ];
    for (const [path, heading] of routes) {
      cleanup();
      renderApp(path);
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });

});
