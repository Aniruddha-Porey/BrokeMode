import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App.jsx';
import { makeFreshChallenge } from '../data/demoData.js';
import { ConfirmDialog, Modal } from '../components/ui/Primitives.jsx';
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
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('authentication and onboarding flows', () => {
  it('gives an empty fresh ledger a direct first-transaction action', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const fresh = makeFreshChallenge();
    fresh.onboardingComplete = true;
    window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(fresh));
    const user = userEvent.setup();
    renderApp('/transactions');
    expect(await screen.findByRole('heading', { name: 'Your ledger is ready' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add your first transaction' }));
    expect(await screen.findByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
  });

  it('records a new expense through the transaction dialog', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/transactions');
    await user.click(await screen.findByRole('button', { name: 'Add transaction' }));
    await screen.findByRole('dialog');
    const description = await screen.findByLabelText('Description', { exact: false });
    await waitFor(() => expect(description).toHaveFocus());
    await user.type(description, 'Test purchase');
    await user.type(await screen.findByRole('spinbutton'), '120');
    const submitButtons = screen.getAllByRole('button', { name: 'Add transaction' });
    await user.click(submitButtons[submitButtons.length - 1]);
    expect(await screen.findByText('₹3,670')).toBeInTheDocument();
  });

  it('keeps a clear-filters action visible while matching transactions remain', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/transactions');
    const search = await screen.findByRole('searchbox', { name: 'Search transactions' });
    await user.type(search, 'Lunch');
    expect((await screen.findAllByText('Lunch near campus')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(search).toHaveValue('');
    expect(await screen.findAllByText('Weekly grocery run')).toHaveLength(2);
  });

  it('offers a spendable-cash shortcut when funding a savings goal', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/savings-goals');
    await user.click((await screen.findAllByRole('button', { name: 'Contribute' }))[0]);
    await screen.findByRole('dialog', { name: 'Add to Emergency fund' });
    const amount = screen.getByLabelText(/Contribution amount \(INR\)/);
    expect(amount).toHaveAttribute('max', '6450');
    expect(document.getElementById(amount.getAttribute('aria-describedby'))).toHaveTextContent('Up to ₹6,450 available');
    await user.click(screen.getByRole('button', { name: 'Set contribution to ₹6,450 (Max)' }));
    expect(amount).toHaveValue(6450);
    await user.click(screen.getByRole('button', { name: 'Confirm contribution' }));
    expect(await screen.findByText('₹6,450 added to Emergency fund.')).toBeInTheDocument();
    const spendable = screen.getByText('Money still spendable').closest('.overview-stat');
    await waitFor(() => expect(spendable).toHaveTextContent('₹0'));
  });

  it('shows the public landing first and lets visitors enter the seeded demo', async () => {
    window.localStorage.removeItem('brokemode-auth:v1');
    const user = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Survive the month\. Stay in control\./i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toBeInTheDocument();
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
    const fullNameField = await screen.findByLabelText('Full name', { exact: false });
    expect(fullNameField).toBeRequired();
    await user.type(fullNameField, 'Sam Lee');
    await user.type(await screen.findByLabelText('Email address', { exact: false }), 'sam@example.com');
    await user.type(await screen.findByLabelText('Password'), 'BudgetSafe12!');
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

  it('exports the settings ledger as a downloadable CSV file', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const createObjectURL = vi.fn(() => 'blob:brokemode-export');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const originalSetTimeout = window.setTimeout;
    vi.spyOn(window, 'setTimeout').mockImplementation((callback, delay, ...args) => {
      if (delay === 0 && typeof callback === 'function') { callback(...args); return 0; }
      return originalSetTimeout(callback, delay, ...args);
    });
    try {
      const user = userEvent.setup();
      renderApp('/settings');
      await screen.findByRole('heading', { name: 'Make BrokeMode yours.' });
      await user.click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(createObjectURL.mock.calls[0][0].type).toBe('text/csv;charset=utf-8');
      expect(anchorClick).toHaveBeenCalledOnce();
      expect(await screen.findByText('CSV export prepared.')).toBeInTheDocument();
    } finally {
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor);
      else delete URL.createObjectURL;
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
      else delete URL.revokeObjectURL;
    }
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

  it('fails closed when a stored demo user is malformed or tampered with', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: '<script>alert(1)</script>', email: '<img>@example.com', demo: true } }));
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Make your money count.' })).not.toBeInTheDocument();
  });
});

describe('app shell navigation accessibility', () => {
  it('warns when browser storage is unavailable', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'brokemode-finance:v1') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });
    renderApp('/dashboard');
    expect(await screen.findByText(/Browser storage is unavailable/)).toHaveTextContent('will be lost when you reload or close the tab');
  });

  it('opens the mobile navigation as a modal dialog and closes it with Escape', async () => {
    window.localStorage.setItem('brokemode-auth:v1', JSON.stringify({ user: { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true } }));
    const user = userEvent.setup();
    renderApp('/dashboard');
    const trigger = await screen.findByRole('button', { name: 'Open navigation' });
    const drawer = document.getElementById(trigger.getAttribute('aria-controls'));
    expect(drawer).toBeInTheDocument();
    expect(drawer.parentElement).toHaveAttribute('hidden');
    await user.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Mobile navigation' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('keyboard and dialog accessibility', () => {
  it('announces a labelled modal, traps Tab focus, closes on Escape, and restores focus', async () => {
    function FocusModalHarness() {
      const [open, setOpen] = React.useState(false);
      return <>
        <button type="button" onClick={() => setOpen(true)}>Open keyboard dialog</button>
        <Modal open={open} title="Keyboard dialog" subtitle="Use Tab or Escape to leave this dialog." onClose={() => setOpen(false)} footer={<button type="button">Save choice</button>}>
          <button type="button">Dialog action</button>
        </Modal>
      </>;
    }

    const user = userEvent.setup();
    render(<FocusModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open keyboard dialog' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard dialog' });
    expect(dialog).toHaveAttribute('aria-describedby');
    const close = screen.getByRole('button', { name: 'Close dialog' });
    await waitFor(() => expect(close).toHaveFocus());
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Save choice' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('places initial focus on the safe choice in a confirmation dialog', async () => {
    function ConfirmationHarness() {
      const [open, setOpen] = React.useState(false);
      return <>
        <button type="button" onClick={() => setOpen(true)}>Open confirmation</button>
        <ConfirmDialog open={open} title="Delete this item?" description="This action removes the item." confirmLabel="Delete" danger onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} />
      </>;
    }
    const user = userEvent.setup();
    render(<ConfirmationHarness />);
    await user.click(screen.getByRole('button', { name: 'Open confirmation' }));
    await screen.findByRole('dialog', { name: 'Delete this item?' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus());
  });
});
