import { useEffect, useState, type ReactNode } from 'react';
import { ApiError, type MilestoneStatus } from '../api';

/** Loads data and exposes loading / error / data states for every data screen (NFR-07). */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: T | null }>({ loading: true, error: null, data: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((e: unknown) => alive && setState({ loading: false, error: e instanceof ApiError ? e.message : 'Could not load data', data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function Loading() {
  return <p className="muted" role="status">Loading…</p>;
}
export function ErrorBanner({ message }: { message: string | null }) {
  return message ? <div className="error" role="alert">{message}</div> : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
export function FieldError({ error }: { error?: string }) {
  return error ? <span className="field-error">{error}</span> : null;
}

const LABELS: Record<MilestoneStatus, string> = { OPEN: 'Open', SUBMITTED: 'Submitted', FEEDBACK_GIVEN: 'Feedback given', MISSED: 'Missed' };
export function StatusBadge({ status }: { status: MilestoneStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`} data-testid="status">{LABELS[status]}</span>;
}
