import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { financeReducer, createInitialFinanceState } from '../reducer/financeReducer.js';
import { calculateFinance } from '../finance/calculations.js';

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, createInitialFinanceState);
  const summary = useMemo(() => calculateFinance(state), [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(state));
    } catch {
      // The app remains usable if storage is disabled or full.
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, summary }), [state, summary]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used within FinanceProvider');
  return value;
}
