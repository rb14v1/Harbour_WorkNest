import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../services/api.js';

export const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'];
export const TASK_STATUSES = ['Pending', 'In Progress', 'Blocked', 'Completed'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const HANDOVER_STATUSES = ['Draft', 'Submitted', 'Acknowledged'];

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function useLoader(loadFn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loadFn();
      setState({ data, error: null, loading: false });
    } catch (err) {
      setState({ data: null, error: errorMessage(err), loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function StatusBadge({ value }) {
  const slug = String(value).toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-${slug}`}>{value}</span>;
}

export function Loading({ label = 'Loading…' }) {
  return <p className="state state-loading" role="status">{label}</p>;
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className="btn btn-small" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="alert alert-success" role="status">{message}</div>;
}

export function Field({ label, error, hint, children, wide = false, count, max }) {
  const over = max !== undefined && count > max;
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">
        {label}
        {max !== undefined && (
          <span className={`field-count${over ? ' field-count-over' : ''}`}>{count ?? 0} / {max}</span>
        )}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function EmptyState({ children }) {
  return <p className="state state-empty">{children}</p>;
}

export function PageHeader({ title, children }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
