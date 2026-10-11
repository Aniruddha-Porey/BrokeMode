import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
const netlify = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8').toLowerCase();
const vercelHeaders = vercel.headers.flatMap((rule) => rule.headers);
const requiredHeaders = [
  'X-Content-Type-Options',
  'Referrer-Policy',
  'X-Frame-Options',
  'Permissions-Policy',
  'Content-Security-Policy',
];

describe('static-host security policy', () => {
  it('keeps Vercel and Netlify security headers aligned', () => {
    for (const name of requiredHeaders) {
      expect(vercelHeaders.some((header) => header.key.toLowerCase() === name.toLowerCase())).toBe(true);
      expect(netlify).toContain(`${name.toLowerCase()}:`);
    }
  });

  it('keeps scripts same-origin and avoids unsafe script execution allowances', () => {
    const policy = vercelHeaders.find((header) => header.key === 'Content-Security-Policy').value;
    const scriptSource = policy.split(';').find((directive) => directive.trim().startsWith('script-src'));
    expect(scriptSource).toContain("'self'");
    expect(scriptSource).not.toContain("'unsafe-inline'");
    expect(scriptSource).not.toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
  });
});
