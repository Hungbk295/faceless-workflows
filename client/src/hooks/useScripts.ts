import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ScriptDto, CreateScriptInput, UpdateScriptInput } from 'shared';
import {
  listScripts,
  createScript,
  updateScript,
  deleteScript,
} from '../api/scripts.ts';

export const scriptsKey = (channelId: string) => ['channels', channelId, 'scripts'] as const;
export const channelKey = (channelId: string) => ['channels', channelId] as const;

export function useScripts(channelId: string) {
  return useQuery<ScriptDto[]>({
    queryKey: scriptsKey(channelId),
    queryFn: () => listScripts(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useCreateScript(channelId: string) {
  const qc = useQueryClient();
  return useMutation<ScriptDto, Error, CreateScriptInput>({
    mutationFn: (input) => createScript(channelId, input),
    onSuccess: (created) => {
      qc.setQueryData<ScriptDto[]>(scriptsKey(channelId), (prev) =>
        prev ? [...prev, created] : [created],
      );
      void qc.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useUpdateScript(channelId: string) {
  const qc = useQueryClient();
  return useMutation<ScriptDto, Error, { scriptId: string; patch: UpdateScriptInput }>({
    mutationFn: ({ scriptId, patch }) => updateScript(channelId, scriptId, patch),
    onSuccess: (updated) => {
      qc.setQueryData<ScriptDto[]>(scriptsKey(channelId), (prev) =>
        prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev,
      );
    },
  });
}

export function useDeleteScript(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; deleted: boolean }, Error, string>({
    mutationFn: (scriptId) => deleteScript(channelId, scriptId),
    onSuccess: ({ id }) => {
      qc.setQueryData<ScriptDto[]>(scriptsKey(channelId), (prev) =>
        prev ? prev.filter((s) => s.id !== id) : prev,
      );
      void qc.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}
