import { useCallback, useEffect, useRef, useState } from 'react';
import { DataError, type Failure } from './data';

type LoadState<Value> = { phase: 'loading' | 'slow' } | { phase: 'ready'; value: Value; offline: boolean } | { phase: 'failed'; reason: Failure };

export function useResource<Value>(key: string, load: (signal: AbortSignal) => Promise<Value>, offlineCache: () => Value | undefined) {
  const latest = useRef({ load, offlineCache });
  latest.current = { load, offlineCache };
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ id: string; state: LoadState<Value> }>({ id: '', state: { phase: 'loading' } });
  const id = `${key}:${attempt}`;
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const update = () => setAttempt((value) => value + 1);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    const callbacks = latest.current;
    const controller = new AbortController();
    const set = (state: LoadState<Value>) => setSnapshot({ id, state });
    const unavailable = (reason: Failure) => {
      const offline = reason === 'offline' || !navigator.onLine;
      const value = offline ? callbacks.offlineCache() : undefined;
      if (value !== undefined) set({ phase: 'ready', value, offline: true });
      else set({ phase: 'failed', reason: offline ? 'offline' : reason });
    };
    const slow = window.setTimeout(() => set({ phase: 'slow' }), 2_000);
    const timeout = window.setTimeout(() => { controller.abort(); unavailable('network'); }, 12_000);
    void callbacks.load(controller.signal).then((value) => {
      if (!controller.signal.aborted) set({ phase: 'ready', value, offline: false });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) unavailable(error instanceof DataError ? error.kind : 'network');
    }).finally(() => { clearTimeout(slow); clearTimeout(timeout); });
    return () => { controller.abort(); clearTimeout(slow); clearTimeout(timeout); };
  }, [id]);

  const state: LoadState<Value> = snapshot.id === id ? snapshot.state : { phase: 'loading' };
  return { state, reload, attempt };
}
