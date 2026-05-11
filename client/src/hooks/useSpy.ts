import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SpyProgressEvent, SpyResultDto, SpyRunInput } from 'shared';
import {
  cancelSpy,
  deleteSpy,
  getSpyResult,
  runSpy,
  spyEventsUrl,
} from '../api/spy.ts';

export const spyKey = (channelId: string) => ['spy', channelId] as const;

export function useSpyResult(channelId: string) {
  return useQuery<SpyResultDto>({
    queryKey: spyKey(channelId),
    queryFn: () => getSpyResult(channelId),
    staleTime: 5_000,
  });
}

export function useRunSpy(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ running: boolean }, Error, SpyRunInput>({
    mutationFn: (input) => runSpy(channelId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: spyKey(channelId) }),
  });
}

export function useCancelSpy(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ cancelled: boolean }, Error, void>({
    mutationFn: () => cancelSpy(channelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: spyKey(channelId) }),
  });
}

export function useDeleteSpy(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, void>({
    mutationFn: () => deleteSpy(channelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: spyKey(channelId) }),
  });
}

export interface SpyLiveState {
  step: SpyProgressEvent['step'];
  progress: number;
  total: number;
  message: string | null;
  done: boolean;
  error: string | null;
}

const initialLive: SpyLiveState = {
  step: null, progress: 0, total: 0, message: null, done: false, error: null,
};

/**
 * Subscribes to SSE events while `active=true`. Auto-invalidates the spy
 * query on progress/done/error, and exposes the most recent event for the UI.
 */
export function useSpyEvents(channelId: string, active: boolean): SpyLiveState {
  const qc = useQueryClient();
  const [state, setState] = useState<SpyLiveState>(initialLive);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!active) {
      esRef.current?.close();
      esRef.current = null;
      setState(initialLive);
      return;
    }
    const es = new EventSource(spyEventsUrl(channelId));
    esRef.current = es;
    const handle = (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data) as SpyProgressEvent;
        setState({
          step: ev.step,
          progress: ev.progress,
          total: ev.total,
          message: ev.message ?? null,
          done: ev.type === 'done',
          error: ev.type === 'error' ? (ev.message ?? 'error') : null,
        });
        qc.invalidateQueries({ queryKey: spyKey(channelId) });
        if (ev.type === 'done' || ev.type === 'error') {
          es.close();
          esRef.current = null;
        }
      } catch {
        /* ignore */
      }
    };
    es.addEventListener('progress', handle);
    es.addEventListener('done', handle);
    es.addEventListener('error', handle as EventListener);
    es.addEventListener('idle', () => {
      es.close();
      esRef.current = null;
    });
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [channelId, active, qc]);

  return state;
}
