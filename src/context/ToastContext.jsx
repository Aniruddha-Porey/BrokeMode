import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Check, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: Check, error: XCircle, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const ItemIcon = Icon[item.tone] || Info;
          return <div className={`toast toast-${item.tone}`} key={item.id}>
            <span className="toast-icon"><ItemIcon size={16} /></span>
            <span>{item.message}</span>
            <button className="toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={15} /></button>
          </div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value.toast;
}
