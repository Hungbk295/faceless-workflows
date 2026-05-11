import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ScenePromptsDto,
  ReplaceScenePromptsInput,
  AppendScenePromptsInput,
} from 'shared';
import {
  getScenePrompts,
  replaceScenePrompts,
  appendScenePrompts,
  clearScenePrompts,
} from '../api/scenePrompts.ts';

export const scenePromptsKey = (channelId: string) =>
  ['channels', channelId, 'scene-prompts'] as const;

export function useScenePrompts(channelId: string) {
  return useQuery<ScenePromptsDto>({
    queryKey: scenePromptsKey(channelId),
    queryFn: () => getScenePrompts(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useReplaceScenePrompts(channelId: string) {
  const qc = useQueryClient();
  return useMutation<ScenePromptsDto, Error, ReplaceScenePromptsInput>({
    mutationFn: (body) => replaceScenePrompts(channelId, body),
    onSuccess: (next) => qc.setQueryData(scenePromptsKey(channelId), next),
  });
}

export function useAppendScenePrompts(channelId: string) {
  const qc = useQueryClient();
  return useMutation<ScenePromptsDto, Error, AppendScenePromptsInput>({
    mutationFn: (body) => appendScenePrompts(channelId, body),
    onSuccess: (next) => qc.setQueryData(scenePromptsKey(channelId), next),
  });
}

export function useClearScenePrompts(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, void>({
    mutationFn: () => clearScenePrompts(channelId),
    onSuccess: () => {
      qc.setQueryData<ScenePromptsDto>(scenePromptsKey(channelId), {
        imagePrompts: [], videoPrompts: [], rawOutput: '',
      });
    },
  });
}
