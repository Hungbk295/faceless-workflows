import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SceneDto, SceneInput, UpdateSceneInput } from 'shared';
import {
  listScenes,
  replaceScenes,
  clearScenes,
  updateScene,
} from '../api/scenes.ts';

export const scenesKey = (channelId: string) => ['channels', channelId, 'scenes'] as const;

export function useScenes(channelId: string) {
  return useQuery<SceneDto[]>({
    queryKey: scenesKey(channelId),
    queryFn: () => listScenes(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useReplaceScenes(channelId: string) {
  const qc = useQueryClient();
  return useMutation<SceneDto[], Error, SceneInput[]>({
    mutationFn: (scenes) => replaceScenes(channelId, scenes),
    onSuccess: (next) => {
      qc.setQueryData(scenesKey(channelId), next);
    },
  });
}

export function useClearScenes(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ deleted: number }, Error, void>({
    mutationFn: () => clearScenes(channelId),
    onSuccess: () => {
      qc.setQueryData<SceneDto[]>(scenesKey(channelId), []);
    },
  });
}

export function useUpdateScene(channelId: string) {
  const qc = useQueryClient();
  return useMutation<SceneDto, Error, { num: number; patch: UpdateSceneInput }>({
    mutationFn: ({ num, patch }) => updateScene(channelId, num, patch),
    onSuccess: (updated) => {
      qc.setQueryData<SceneDto[]>(scenesKey(channelId), (prev) =>
        prev ? prev.map((s) => (s.num === updated.num ? updated : s)) : prev,
      );
    },
  });
}
