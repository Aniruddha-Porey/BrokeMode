# BrokeMode

**Survive the Month. Master Your Money.**

BrokeMode is a responsive, frontend-only fintech budgeting prototype built around the challenge **“Broke But Functional — Survive the Month.”** It helps someone plan a 30-day month, track a small INR budget, understand known commitments, and test a purchase before choosing to apply it.

> **Demo-only notice:** Sign-in and sign-up are simulated in the browser. This project has no backend, production authentication, bank connection, payment integration, or financial-advice service. Finance and session data are stored locally in the current browser. Do not enter real financial credentials or rely on the estimates as financial advice.

## Run locally

Requirements: Node.js **20.19+** and npm.

```bash
npm ci
npm run dev
```

Vite prints a local URL. For a hosted preview that needs network access, start the dev server with `npm run dev -- --host 0.0.0.0`.

### Other commands

```bash
npm run lint    # ESLint: React, hooks, and JSX accessibility checks
npm test        # Vitest + Testing Library
npm run build   # production bundle in dist/
npm run preview # serve the production build locally
npm run check   # lint, tests, then production build
```

## Demo flows

- Visit `/` for the public landing page. Start a fresh challenge with **Start my 30-day challenge**, or open the day-12 seeded workspace with **Explore the demo**; the app overview is available at `/dashboard` once a session is active.
- Open **Explore demo** on the login screen for the seeded dashboard: day 12 of 30, ₹10,000 starting funds, ₹3,550 in recorded expenses, and ₹6,450 spendable before unpaid commitments.
- Sign up to start a **separate day-1 challenge** with ₹10,000 and an empty ledger, then complete the three-step onboarding.
- Add, edit, filter, and delete ledger transactions; adjust category budgets; manage savings goals; record or cancel bills and subscriptions; review insights; export transactions to CSV; or reset the local demo from Settings.
- Decision Lab keeps a proposal temporary until **Apply decision**. Discarding a proposal leaves the ledger untouched. “Buy now,” “wait seven days,” “choose a lower-cost option,” and subscription cancellation use the same finance calculations.

## Screens and routes

| Screen | Route |
| --- | --- |
| Public landing page | `/` |
| Login | `/login` |
| Sign Up | `/signup` |
| Onboarding | `/onboarding` |
| Dashboard | `/dashboard` |
| Decision Lab | `/decision-lab` |
| Transactions | `/transactions` |
| Budgets | `/budgets` |
| Savings Goals | `/savings-goals` |
| Bills & Subscriptions | `/bills-subscriptions` |
| Insights | `/insights` |
| Settings | `/settings` |

## Architecture and contributing

- [Architecture and finance invariants](docs/architecture.md) documents route/state boundaries, persistence, and the authoritative money model.
- [Contributing guide](CONTRIBUTING.md) covers setup, required checks, design conventions, and responsive review.
- [Security and data handling](SECURITY.md) explains browser-only storage, demo auth limits, sanitization, and deployment headers.

The app uses a responsive navigation shell, mobile bottom navigation, accessible forms and dialogs, visible focus states, INR/Indian number formatting, a dark/light theme toggle, and a glass-finished dark-first design token system. The public landing page uses locally bundled lifestyle photos and a clearly labeled sample-month snapshot; those figures are illustrative, not live user data.

## Financial model conventions

The calculations are centralized in `src/finance/calculations.js` and are shared by Dashboard, Budgets, Insights, Bills & Subscriptions, and Decision Lab.

- **Ledger balance** = starting funds + income − recorded expenses.
- **Spendable balance** = ledger balance − savings transfers. Savings contributions reduce available cash, but are not consumption expenses; goal progress advances only when an actual transfer is recorded.
- **Safe daily allowance** reserves active unpaid commitments first, then divides the remainder by challenge days remaining **including today**. A negative result is shown as zero safe-to-spend with an explicit shortfall warning.
- **Day-30 projection** keeps the signed balance (including negative balances), subtracts known unpaid occurrences due in the challenge, and estimates flexible day-to-day spending for days after today. Fixed bills are treated as dated commitments rather than part of the flexible-spending pace. Forecast style can scale estimated flexible spending without changing the actual ledger.
- Recording a bill payment adds one actual expense and removes that occurrence from unpaid commitments. Cancelling a subscription removes future forecasts; historical transactions remain. Recurring charges are generated only inside the challenge horizon, so the next charge is not double-counted as a paid bill.
- Decision Lab simulations use the same calculation functions as the dashboard, stay in component state until applied, and are guarded against duplicate application.

## State and privacy

- `brokemode-finance:v1` stores the versioned finance state in `localStorage`.
- `brokemode-auth:v1` stores the demo-only session state. No password is persisted by the demo auth flow.
- Invalid or incompatible finance data falls back to the seeded demo. **Reset to demo** replaces the local finance state and demo session.
- Data is not synchronized across browsers or devices and has no server-side backup.

## Quality checks and production build

Tests cover shared ledger/forecast semantics, bounded and sanitized local persistence, invalid reducer actions, CSV formula-injection protection, goal transfers, bill occurrence/payment handling, Decision Lab preview/apply behavior, transaction filters, landing-to-demo entry, appearance persistence, fail-closed demo sessions, accessible modal focus/keyboard behavior, onboarding, route rendering, and transaction entry. User-authored text is length-limited, rendered as text (never HTML), and CSV cells are guarded against spreadsheet formula execution.

```bash
npm run lint
npm test
npm run build
# or run all three in sequence
npm run check
```

## Deploy

The production output is static and is written to `dist/`.

- **Vercel:** import the repository and use the included `vercel.json`; build command `npm run build`, output directory `dist`.
- **Netlify:** build command `npm run build`, publish directory `dist`; `public/_redirects` is included so direct refreshes of React Router paths fall back to `index.html`.
- **Other static hosts:** build with `npm run build`, publish `dist/`, and configure an SPA fallback to `/index.html` for app routes.

A real product deployment would still need a backend, secure identity/session handling, data access controls, observability, and a formal security and financial-compliance review.
