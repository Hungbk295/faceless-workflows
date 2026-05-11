import type { SceneDto, SceneInput, UpdateSceneInput } from 'shared';
import { api } from './client.ts';

export const listScenes = (channelId: string): Promise<SceneDto[]> =>
  api.get<SceneDto[]>(`/api/channels/${encodeURIComponent(channelId)}/scenes`);

export const replaceScenes = (channelId: string, scenes: SceneInput[]): Promise<SceneDto[]> =>
  api.put<SceneDto[]>(`/api/channels/${encodeURIComponent(channelId)}/scenes`, { scenes });

export const clearScenes = (channelId: string): Promise<{ deleted: number }> =>
  api.del<{ deleted: number }>(`/api/channels/${encodeURIComponent(channelId)}/scenes`);

export const updateScene = (
  channelId: string,
  num: number,
  patch: UpdateSceneInput,
): Promise<SceneDto> =>
  api.patch<SceneDto>(
    `/api/channels/${encodeURIComponent(channelId)}/scenes/${num}`,
    patch,
  );
