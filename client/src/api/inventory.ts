import type { InventoryDto, ReplaceInventoryInput } from 'shared';
import { api } from './client.ts';

export const getInventory = (channelId: string): Promise<InventoryDto> =>
  api.get<InventoryDto>(`/api/channels/${encodeURIComponent(channelId)}/inventory`);

export const replaceInventory = (
  channelId: string,
  body: ReplaceInventoryInput,
): Promise<InventoryDto> =>
  api.put<InventoryDto>(`/api/channels/${encodeURIComponent(channelId)}/inventory`, body);

export const clearInventory = (channelId: string): Promise<{ ok: true }> =>
  api.del<{ ok: true }>(`/api/channels/${encodeURIComponent(channelId)}/inventory`);
