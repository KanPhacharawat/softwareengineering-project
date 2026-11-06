import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T };

// Loads one GET endpoint and exposes the three page states from design.md section 8.
export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api<T>(path)
      .then((data) => !cancelled && setState({ status: 'success', data }))
      .catch((err) => {
        if (cancelled) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong');
        setState({ status: 'error', error });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
