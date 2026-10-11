import React, { useEffect, useRef } from 'react';
import { AlertCircle, Check, ChevronRight, LoaderCircle, X } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', className = '', icon: Icon, iconRight: IconRight, loading = false, disabled = false, type = 'button', ...props }) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`.trim()} disabled={disabled || loading} {...props}>
    {loading ? <LoaderCircle size={16} className="spin" /> : Icon ? <Icon size={16} strokeWidth={1.8} /> : null}
    <span>{children}</span>
    {IconRight ? <IconRight size={16} strokeWidth={1.8} /> : null}
  </button>;
}

export function Panel({ children, className = '', ...props }) {
  return <section className={`panel ${className}`.trim()} {...props}>{children}</section>;
}

export function Badge({ children, tone = 'neutral', icon: Icon, className = '' }) {
  return <span className={`badge badge-${tone} ${className}`.trim()}>{Icon && <Icon size={12} strokeWidth={2} />}{children}</span>;
}

export function ProgressBar({ value = 0, tone = 'lime', height = 5, className = '', label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className={`progress-track ${className}`} style={{ height }} role="progressbar" aria-valuenow={Math.round(safeValue)} aria-valuemin="0" aria-valuemax="100" aria-label={label || 'Progress'}>
    <span className={`progress-fill fill-${tone}`} style={{ width: `${safeValue}%` }} />
  </div>;
}

export function PageHeading({ eyebrow, title, description, actions, className = '' }) {
  return <div className={`page-heading ${className}`}>
    <div className="page-heading-copy">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="page-heading-actions">{actions}</div>}
  </div>;
}

export function SectionHeading({ title, detail, action, className = '' }) {
  return <div className={`section-heading ${className}`}>
    <div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>
    {action && <div className="section-heading-action">{action}</div>}
  </div>;
}

export function MetricValue({ label, value, detail, trend, icon: Icon, tone = 'default', className = '' }) {
  return <div className={`metric-value metric-${tone} ${className}`}>
    <div className="metric-topline"><span>{label}</span>{Icon && <span className="metric-icon"><Icon size={16} /></span>}</div>
    <div className="metric-number">{value}</div>
    {(detail || trend) && <div className="metric-foot">{trend && <span className={`metric-trend ${trend.tone || 'positive'}`}>{trend.text}</span>}{detail && <span>{detail}</span>}</div>}
  </div>;
}

export function Field({ label, hint, error, required, className = '', children, ...props }) {
  return <label className={`field ${className}`}>
    {label && <span className="field-label">{label}{required && <span className="required"> *</span>}</span>}
    {children || <input className={`input ${error ? 'input-error' : ''}`} {...props} />}
    {error ? <span className="field-error"><AlertCircle size={13} />{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
  </label>;
}

export function SelectField({ label, options, className = '', ...props }) {
  return <label className={`field ${className}`}>
    {label && <span className="field-label">{label}</span>}
    <select className="input select-input" {...props}>
      {options.map((option) => typeof option === 'string'
        ? <option value={option} key={option}>{option}</option>
        : <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export function Modal({ open, title, subtitle, onClose, children, footer, width = 520, closeOnBackdrop = true }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { onCloseRef.current?.(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])].filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) { event.preventDefault(); panelRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.querySelector('input,button,select,textarea')?.focus(), 40);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose?.(); }}>
    <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panelRef} style={{ maxWidth: width }}>
      <div className="modal-header">
        <div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger = false, onCancel, onConfirm }) {
  return <Modal open={open} title={title} subtitle={description} onClose={onCancel} width={440} footer={<>
    <Button variant="subtle" onClick={onCancel}>Keep it</Button>
    <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}<ChevronRight size={15} /></Button>
  </>}>
    <div className={`confirm-symbol ${danger ? 'confirm-danger' : ''}`}><AlertCircle size={20} />{danger ? 'This can’t be undone.' : 'Review the change before continuing.'}</div>
  </Modal>;
}

export function EmptyState({ icon: Icon = Check, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function MiniDelta({ value, suffix = '', tone }) {
  const numeric = Number(value) || 0;
  const inferred = tone || (numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : 'neutral');
  return <span className={`mini-delta delta-${inferred}`}>{numeric > 0 ? '+' : numeric < 0 ? '−' : ''}{Math.abs(numeric).toLocaleString('en-IN')}{suffix}</span>;
}

export function Toggle({ checked, onChange, label, description, id, ariaLabel }) {
  const controlId = id || `toggle-${label?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'setting'}`;
  return <label className="toggle-row" htmlFor={controlId}>
    {(label || description) && <span className="toggle-copy">{label && <strong>{label}</strong>}{description && <small>{description}</small>}</span>}
    <span className={`toggle ${checked ? 'toggle-on' : ''}`} aria-hidden="true"><span /></span>
    <input id={controlId} className="sr-only" type="checkbox" checked={checked} aria-label={ariaLabel || label || 'Toggle setting'} onChange={(event) => onChange?.(event.target.checked)} />
  </label>;
}
