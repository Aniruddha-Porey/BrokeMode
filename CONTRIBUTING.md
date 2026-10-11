# Contributing to BrokeMode

Thanks for helping improve the BrokeMode prototype. Keep the experience useful on a small screen, preserve the financial model, and be explicit that authentication and banking features are demo-only.

## Local setup

Requirements: Node.js 20.19 or newer and npm.

```bash
npm ci
npm run dev
```

For a network-accessible preview, use `npm run dev -- --host 0.0.0.0`.

## Before opening a change

```bash
npm run check
npm audit --audit-level=moderate
```

`npm run check` runs ESLint (React, Hooks, and JSX accessibility rules), the full Vitest suite, and a production Vite build. Add a regression test for every changed finance rule or user flow. Do not commit `node_modules`, `dist`, credentials, real user data, or local secrets.

## Product and implementation conventions

- Use the existing React + Vite + JavaScript structure, React Router, shared contexts, reducer actions, and Lucide icons.
- Keep domain calculations in `src/finance/calculations.js`; do not duplicate finance formulas in page components.
- Treat actions and `localStorage` values as untrusted. Reuse `src/finance/validation.js`, bound collection sizes and text, and return safe reducer state for invalid actions.
- Persist only demo-safe profile/session metadata. Never add password or bank-credential persistence, or imply the prototype is production-secure.
- Use INR formatting via `src/finance/formatters.js` and preserve whole-rupee input conventions.
- Prefer shared UI primitives over one-off controls. Use visible focus states, explicit button types, accessible names for icon-only controls, associated labels/errors, and meaningful live feedback.
- Preserve demo semantics: fresh day 1 and seeded day 12 are separate; starting funds plus income minus actual expenses is the ledger; transfers reduce spendable balance but are not expenses; paid/cancelled bill logic and negative forecast warnings must remain correct.
- Export user-authored CSV values through `src/utils/csv.js` so spreadsheet formulas are neutralized.

## Responsive review checklist

Test the page at approximately **1440 px, 980 px, 860/761/760 px, 520 px, 390 px, and 320 px** wide, including both sides of the compact/mobile navigation breakpoints. Verify that:

- There is no page-level horizontal scrolling or clipped primary action.
- Dashboard and secondary-page grids collapse before their columns become cramped. Avoid inline `gridTemplateColumns` on responsive grids; define base and breakpoint values in CSS.
- Tables switch to their mobile list presentation or have an intentional horizontal scroller.
- Mobile navigation, settings section navigation, dialogs, and toasts stay within the viewport and remain operable by touch and keyboard; primary mobile navigation targets are at least 40 px tall.
- Focus is visible, the skip link works, dialogs trap/restore focus, and icon-only controls have accessible names.
- `prefers-reduced-motion` is respected.

## Documentation

Update `README.md` for user-visible flows, setup, deployment, or support changes. Update `docs/architecture.md` when state boundaries, persistence, routing, or finance conventions change. Keep demo-only limitations accurate.
