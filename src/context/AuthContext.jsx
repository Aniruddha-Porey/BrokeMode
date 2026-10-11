import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_KEY = 'brokemode-auth:v1';
const SESSION_KEY = 'brokemode-session:v1';
const defaultDemoUser = { name: 'Alex Morgan', email: 'alex@brokemode.demo', demo: true, remember: true };

function readSession() {
  if (typeof window === 'undefined') return defaultDemoUser;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (raw === 'signed-out') {
      const session = window.sessionStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session)?.user || null : null;
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user || defaultDemoUser;
  } catch {
    return defaultDemoUser;
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
      // Session state remains in memory when browser storage is not available.
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: (email, name, remember = true) => setUser({ name: name || email?.split('@')[0] || 'BrokeMode member', email, demo: true, remember }),
    exploreDemo: () => setUser(defaultDemoUser),
    logout: () => setUser(null),
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
