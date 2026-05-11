import type { ChannelDto, CreateChannelInput, UpdateChannelInput } from 'shared';
import { api } from './client.ts';

export const listChannels = (): Promise<ChannelDto[]> =>
  api.get<ChannelDto[]>('/api/channels');

export const getChannel = (id: string): Promise<ChannelDto> =>
  api.get<ChannelDto>(`/api/channels/${encodeURIComponent(id)}`);

export const createChannel = (input: CreateChannelInput): Promise<ChannelDto> =>
  api.post<ChannelDto>('/api/channels', input);

export const updateChannel = (id: string, patch: UpdateChannelInput): Promise<ChannelDto> =>
  api.patch<ChannelDto>(`/api/channels/${encodeURIComponent(id)}`, patch);

export const deleteChannel = (id: string): Promise<{ id: string; deleted: boolean }> =>
  api.del<{ id: string; deleted: boolean }>(`/api/channels/${encodeURIComponent(id)}`);
