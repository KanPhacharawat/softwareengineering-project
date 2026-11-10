import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

export type ApiState<T> =
  | { status: 'loading'; reload: () => void }
  | { status: 'error'; error: ApiError; reload: () => void }
  | { status: 'success'; data: T; reload: () => void };

// Loads one GET endpoint and exposes the three page states from design.md section 8.
export function useApi<T>(path: string): ApiState<T> {
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);
  const [state, setState] = useState<ApiState<T>>({ status: 'loading', reload });
  const [prevPath, setPrevPath] = useState(path);

  if (prevPath !== path) {
    setPrevPath(path);
    setState({ status: 'loading', reload });
  }

  useEffect(() => {
    let cancelled = false;
    // On reloads with the same path, retain previous data to prevent flashing back to skeleton.
    setState((prev) => (prev.status === 'success' ? prev : { status: 'loading', reload }));
    api<T>(path)
      .then((data) => !cancelled && setState({ status: 'success', data, reload }))
      .catch((err) => {
        if (cancelled) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong');
        setState({ status: 'error', error, reload });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadTick, reload]);

  return state;
}
