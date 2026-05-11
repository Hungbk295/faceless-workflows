import type { SpyResultDto, SpyRunInput } from 'shared';
import { api } from './client.ts';

const base = (channelId: string) =>
  `/api/channels/${encodeURIComponent(channelId)}/spy`;

export const getSpyResult = (channelId: string): Promise<SpyResultDto> =>
  api.get<SpyResultDto>(base(channelId));

export const runSpy = (channelId: string, input: SpyRunInput): Promise<{ running: boolean }> =>
  api.post<{ running: boolean }>(`${base(channelId)}/run`, input);

export const cancelSpy = (channelId: string): Promise<{ cancelled: boolean }> =>
  api.post<{ cancelled: boolean }>(`${base(channelId)}/cancel`);

export const deleteSpy = (channelId: string): Promise<{ deleted: boolean }> =>
  api.del<{ deleted: boolean }>(base(channelId));

export const spyEventsUrl = (channelId: string): string => `${base(channelId)}/events`;
