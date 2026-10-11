# BrokeMode architecture

BrokeMode is a browser-only React SPA. It has no API server, remote account system, bank connection, or payment integration. This document describes the current prototype boundaries and the finance rules that future changes must preserve.

## Runtime and component boundaries

```text
Browser
└── React root (src/main.jsx)
    ├── FinanceProvider (state, reducer, derived summary, local persistence)
    ├── AuthProvider (demo-only local session)
    ├── ToastProvider (transient feedback)
    └── BrowserRouter
        └── App (route guards, lazy route modules, titles, error boundary)
            ├── Public: Landing, Login, SignUp, Onboarding
            └── Workspace: AppShell + Dashboard, Decision Lab, Transactions,
                Budgets, Savings Goals, Bills & Subscriptions, Insights, Settings
```

- **Pages** own route-specific form state, filters, and temporary dialogs.
- **`FinanceContext`** owns the serializable finance state and a memoized summary from `calculateFinance`.
- **`financeReducer`** is the only mutation boundary. It validates and normalizes action payloads before returning new state.
- **`finance/validation.js`** contains reusable bounds and sanitizers for text, money, dates, identifiers, profiles, and persisted records.
- **`finance/calculations.js`** is the authoritative source for ledger totals, commitments, forecasts, budget metrics, goals, risk, and Decision Lab scenarios. Pages display its results rather than reimplementing financial rules.
- **`Primitives.jsx`** provides shared buttons, fields, progress, dialogs, and focus management. `AppShell` owns workspace navigation and global quick entry.

Pages are imported lazily by route so the public landing/auth flows do not have to load every authenticated screen up front. Recharts code is emitted in a separate chart chunk. Landing and auth photography is stored locally as resized WebP; below-the-fold feature images use native lazy loading and async decoding.

## State flow and persistence

```text
Form / user action
  → shared input validation
  → financeReducer(state, action)
  → new plain finance state
  → FinanceContext derives calculateFinance(state)
  → localStorage write under brokemode-finance:v1
```

The `brokemode-finance:v1` payload is size-bounded, parsed as untrusted input, and rebuilt from an explicit field allowlist. Malformed or unsupported state fails closed to the seeded demo. Record counts, text lengths, money values, IDs, enums, and dates are bounded. If browser storage is blocked or full, the application remains usable in memory and warns that changes will not survive a reload.

The auth provider stores only demo profile/session fields; it never persists a password. Auth and finance state are local to one browser and are not cryptographic or server-backed protections. Do not store real banking credentials or sensitive financial data in the prototype.

## Domain conventions

These conventions are product requirements, not presentation choices:

1. `ledgerBalance = startingBudget + income - recordedExpenses`.
2. `spendableBalance = ledgerBalance - savingsTransfers`.
3. Savings transfers reduce spendable money but are not consumption expenses. Goal progress moves only when a transfer is recorded.
4. Safe daily allowance reserves known unpaid commitments and divides by days remaining **including today**. A shortfall is surfaced; a negative forecast is never clamped to zero.
5. Day-end forecasts use actual data through today and estimate variable spending only for future days. Fixed bills remain dated commitments rather than being counted again as variable pace.
6. Paid one-time bills are not future commitments. Paid recurring bills remain in history and advance to the next due date. Cancelled subscriptions create no future occurrences. Occurrence generation stops at the challenge boundary.
7. Decision Lab simulations are temporary. Alternatives use the same calculations, applying a decision is idempotent, and a preview does not change transactions or goal progress.

The implementation and regression tests for these rules live in `src/finance/calculations.js` and `src/finance/calculations.test.js`.

## Accessibility and responsive behavior

- Route changes update the document title and a polite page announcement. Main routes provide a keyboard skip link target.
- Shared dialogs label their title/description, move focus into the dialog, trap Tab, close on Escape, restore focus, and focus the safer action first for confirmations.
- Inputs retain native required semantics while forms use custom `noValidate` handling so their inline validation remains consistent. Hints and field errors are associated with their controls.
- Layout breakpoints are centralized in `src/index.css` and `src/styles/landing.css`. Workspace navigation changes from full sidebar to compact rail and then mobile drawer/bottom navigation. Tables switch to mobile list layouts where provided.
- When adding a responsive grid, keep the grid definition in CSS rather than inline styles so media-query overrides can collapse it on narrow screens.

## Verification

```bash
npm run check                 # ESLint, tests, then production build
npm audit --audit-level=moderate
```

Automated tests cover financial calculations, reducer input bounds, persistence sanitization, CSV formula neutralization, route rendering, authentication fallbacks, onboarding, dialog keyboard behavior, CSV export, mobile navigation, responsive empty-state actions, and savings contributions. The test suite is not a substitute for checking the production UI at narrow widths and with keyboard/screen-reader tools.
