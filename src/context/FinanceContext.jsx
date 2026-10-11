import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { financeReducer, createInitialFinanceState } from '../reducer/financeReducer.js';
import { calculateFinance } from '../finance/calculations.js';

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, createInitialFinanceState);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);
  const summary = useMemo(() => calculateFinance(state), [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem('brokemode-finance:v1', JSON.stringify(state));
      setPersistenceAvailable(true);
    } catch {
      // Keep the app usable, but disclose that changes will not survive reload.
      setPersistenceAvailable(false);
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, summary, persistenceAvailable }), [state, summary, persistenceAvailable]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used within FinanceProvider');
  return value;
}
