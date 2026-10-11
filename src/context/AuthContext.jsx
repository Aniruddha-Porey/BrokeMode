import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { sanitizeEmail, sanitizeText } from '../finance/validation.js';

const AuthContext = createContext(null);
const AUTH_KEY = 'brokemode-auth:v1';
const SESSION_KEY = 'brokemode-session:v1';
const defaultDemoUser = Object.freeze({ name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true });

function normalizeUser(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const email = sanitizeEmail(value.email);
  const name = sanitizeText(value.name, 80);
  if (!email || !name) return null;
  return { name, email, demo: true, remember: value.remember !== false };
}

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (raw === 'signed-out') {
      const session = window.sessionStorage.getItem(SESSION_KEY);
      if (!session || session.length > 4096) return null;
      return normalizeUser(JSON.parse(session)?.user);
    }
    if (!raw || raw.length > 4096) return null;
    return normalizeUser(JSON.parse(raw)?.user);
  } catch {
    try {
      window.localStorage.removeItem(AUTH_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch { /* Storage may be unavailable. */ }
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  useEffect(() => {
    try {
      if (!user) {
        window.localStorage.setItem(AUTH_KEY, 'signed-out');
        window.sessionStorage.removeItem(SESSION_KEY);
      } else if (user.remember === false) {
        window.localStorage.setItem(AUTH_KEY, 'signed-out');
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
      } else {
        window.localStorage.setItem(AUTH_KEY, JSON.stringify({ user }));
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // The demo session stays in memory when browser storage is unavailable.
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: (emailInput, nameInput, remember = true) => {
      const email = sanitizeEmail(emailInput);
      const name = sanitizeText(nameInput || email?.split('@')[0] || 'BrokeMode member', 80);
      if (!email || !name) return;
      setUser({ name, email, demo: true, remember: remember !== false });
    },
    exploreDemo: () => setUser({ ...defaultDemoUser }),
    logout: () => setUser(null),
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
