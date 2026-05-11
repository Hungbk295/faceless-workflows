import type {
  VoiceConfigDto,
  UpdateVoiceConfigInput,
  VoiceClipDto,
  GenerateVoiceClipInput,
} from 'shared';
import { api } from './client.ts';

export const getVoiceConfig = (channelId: string): Promise<VoiceConfigDto> =>
  api.get<VoiceConfigDto>(`/api/channels/${encodeURIComponent(channelId)}/voice-config`);

export const updateVoiceConfig = (
  channelId: string,
  patch: UpdateVoiceConfigInput,
): Promise<VoiceConfigDto> =>
  api.put<VoiceConfigDto>(
    `/api/channels/${encodeURIComponent(channelId)}/voice-config`,
    patch,
  );

export const getClips = (channelId: string): Promise<VoiceClipDto[]> =>
  api.get<VoiceClipDto[]>(`/api/channels/${encodeURIComponent(channelId)}/clips`);

export const generateClip = (
  channelId: string,
  body: GenerateVoiceClipInput,
): Promise<VoiceClipDto> =>
  api.post<VoiceClipDto>(
    `/api/channels/${encodeURIComponent(channelId)}/voice/generate`,
    body,
  );

export const deleteClip = (channelId: string, num: number): Promise<{ ok: true }> =>
  api.del<{ ok: true }>(
    `/api/channels/${encodeURIComponent(channelId)}/clips/${num}`,
  );

export const clearClips = (channelId: string): Promise<{ ok: true }> =>
  api.del<{ ok: true }>(`/api/channels/${encodeURIComponent(channelId)}/clips`);

export const clipUrl = (channelId: string, num: number): string =>
  `/api/channels/${encodeURIComponent(channelId)}/clips/${String(num).padStart(3, '0')}.mp3`;
