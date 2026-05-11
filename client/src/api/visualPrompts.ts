import type { VisualPromptsDto, UpdateVisualPromptsInput } from 'shared';
import { api } from './client.ts';

export const getVisualPrompts = (channelId: string): Promise<VisualPromptsDto> =>
  api.get<VisualPromptsDto>(`/api/channels/${encodeURIComponent(channelId)}/visual-prompts`);

export const updateVisualPrompts = (
  channelId: string,
  patch: UpdateVisualPromptsInput,
): Promise<VisualPromptsDto> =>
  api.patch<VisualPromptsDto>(
    `/api/channels/${encodeURIComponent(channelId)}/visual-prompts`,
    patch,
  );
