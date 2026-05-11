import type {
  ScenePromptsDto,
  ReplaceScenePromptsInput,
  AppendScenePromptsInput,
} from 'shared';
import { api } from './client.ts';

export const getScenePrompts = (channelId: string): Promise<ScenePromptsDto> =>
  api.get<ScenePromptsDto>(`/api/channels/${encodeURIComponent(channelId)}/scene-prompts`);

export const replaceScenePrompts = (
  channelId: string,
  body: ReplaceScenePromptsInput,
): Promise<ScenePromptsDto> =>
  api.put<ScenePromptsDto>(
    `/api/channels/${encodeURIComponent(channelId)}/scene-prompts`,
    body,
  );

export const appendScenePrompts = (
  channelId: string,
  body: AppendScenePromptsInput,
): Promise<ScenePromptsDto> =>
  api.post<ScenePromptsDto>(
    `/api/channels/${encodeURIComponent(channelId)}/scene-prompts/append`,
    body,
  );

export const clearScenePrompts = (channelId: string): Promise<{ ok: true }> =>
  api.del<{ ok: true }>(`/api/channels/${encodeURIComponent(channelId)}/scene-prompts`);
