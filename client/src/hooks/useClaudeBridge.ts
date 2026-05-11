import { useCallback, useEffect, useRef, useState } from 'react';
import { runClaude } from '../api/claude.ts';

export type ClaudeBridgeStatus = 'idle' | 'loading' | 'done' | 'error';

export interface UseClaudeBridgeReturn {
  status: ClaudeBridgeStatus;
  output: string;
  sessionId: string | null;
  error: string | null;
  durationMs: number | null;
  costUsd: number | null;
  /** ms since run started — refreshed by a 1s ticker while loading, frozen otherwise. */
  elapsedMs: number;
  /** True only on the FIRST render after restoring an aborted run from storage. Acknowledge via dismissInterrupted(). */
  wasInterrupted: boolean;
  dismissInterrupted: () => void;
  run: (prompt: string, sessionId?: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

const STORAGE_PREFIX = 'fs:bridge:';

interface PersistedRun {
  output: string;
  status: ClaudeBridgeStatus;
  sessionId: string | null;
  error: string | null;
  durationMs: number | null;
  costUsd: number | null;
  updatedAt: number;
}

interface PersistOpts {
  /** Stable key per stage instance. When set, hook persists final output to localStorage so F5 doesn't lose work. */
  persistKey?: string;
}

/**
 * Hook around runClaude. Optional persistKey writes final output to
 * localStorage. If the page refreshes mid-run, the in-flight fetch is aborted
 * by the browser; on rehydrate we expose `wasInterrupted=true` so UI can show
 * a soft banner.
 */
export function useClaudeBridge(opts?: PersistOpts): UseClaudeBridgeReturn {
  const persistKey = opts?.persistKey;
  const storageKey = persistKey ? STORAGE_PREFIX + persistKey : null;

  const [status, setStatus] = useState<ClaudeBridgeStatus>('idle');
  const [output, setOutput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on first mount (per persistKey).
  useEffect(() => {
    if (!storageKey || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as PersistedRun;
      const interrupted = data.status === 'loading';
      const restoredStatus: ClaudeBridgeStatus = interrupted ? 'idle' : data.status;
      setOutput(data.output);
      setStatus(restoredStatus);
      setSessionId(data.sessionId);
      setDurationMs(data.durationMs);
      setCostUsd(data.costUsd);
      setError(interrupted ? null : data.error);
      setWasInterrupted(interrupted);
      if (interrupted) {
        const normalized: PersistedRun = { ...data, status: 'idle', error: null };
        try { localStorage.setItem(storageKey, JSON.stringify(normalized)); } catch { /* ignore */ }
      }
    } catch {
      // ignore corrupted cache
    }
  }, [storageKey]);

  // Persist on every state change.
  useEffect(() => {
    if (!storageKey) return;
    if (status === 'idle' && !output) return;
    const data: PersistedRun = {
      output, status, sessionId, error, durationMs, costUsd, updatedAt: Date.now(),
    };
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* quota */ }
  }, [storageKey, status, output, sessionId, error, durationMs, costUsd]);

  // Elapsed-time ticker while loading.
  useEffect(() => {
    if (status !== 'loading' || startedAt == null) return;
    setElapsedMs(Date.now() - startedAt);
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [status, startedAt]);

  const dismissInterrupted = useCallback(() => setWasInterrupted(false), []);

  const reset = useCallback(() => {
    setStatus('idle');
    setOutput('');
    setError(null);
    setDurationMs(null);
    setCostUsd(null);
    setWasInterrupted(false);
    setStartedAt(null);
    setElapsedMs(0);
    if (storageKey) try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const run = useCallback(async (prompt: string, resumeSessionId?: string) => {
    abort();
    setStatus('loading');
    setOutput('');
    setError(null);
    setDurationMs(null);
    setCostUsd(null);
    setStartedAt(Date.now());
    setElapsedMs(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await runClaude({
        prompt,
        sessionId: resumeSessionId,
        signal: controller.signal,
      });
      setOutput(result.output);
      setSessionId(result.sessionId);
      setDurationMs(result.durationMs);
      setCostUsd(result.costUsd);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('idle');
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abort]);

  return {
    status, output, sessionId, error, durationMs, costUsd, elapsedMs,
    wasInterrupted, dismissInterrupted,
    run, abort, reset,
  };
}
