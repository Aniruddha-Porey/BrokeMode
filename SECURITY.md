# Security and data handling

BrokeMode is a **frontend-only demo**, not a production financial service. There is no backend, real identity provider, bank integration, payment service, or server-side authorization boundary.

## Data boundaries

- Finance state and demo session data are stored in this browser's `localStorage` (with a temporary `sessionStorage` path for non-persistent demo sessions). The app does not encrypt, synchronize, or back them up.
- Do not enter real account credentials, banking details, or sensitive personal/financial information. Client-side sanitization improves robustness; it does not make browser storage secure.
- Reducer actions and persisted state are treated as untrusted input. Validation bounds money, text, dates, identifiers, and collection sizes; imported state is rebuilt from an allowlist. CSV export neutralizes spreadsheet formulas.
- Authentication and user identity are simulated. The demo must not be described as providing secure sign-in or access control.

## Deployment headers

The static-host configurations apply a restrictive same-origin Content Security Policy and common browser security headers. `style-src 'unsafe-inline'` is retained because the UI uses React inline style attributes; scripts do not require `'unsafe-inline'` or `'unsafe-eval'`. The headers reduce browser attack surface, but they do not turn this frontend into a secure financial application.

- Netlify reads `public/_headers` from the published `dist/` directory.
- Vercel reads the headers and SPA rewrite in `vercel.json`.
- Other hosts must configure equivalent headers and the documented SPA fallback themselves.

## Reporting a vulnerability

If you find a security issue, use GitHub's **private vulnerability reporting / Security Advisories** for this repository when available. Avoid posting exploit details, personal data, or credentials in public issues. This prototype has no production security-response or support guarantee.
