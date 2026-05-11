import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InventoryDto, ReplaceInventoryInput } from 'shared';
import { getInventory, replaceInventory, clearInventory } from '../api/inventory.ts';

export const inventoryKey = (channelId: string) =>
  ['channels', channelId, 'inventory'] as const;

export function useInventory(channelId: string) {
  return useQuery<InventoryDto>({
    queryKey: inventoryKey(channelId),
    queryFn: () => getInventory(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useReplaceInventory(channelId: string) {
  const qc = useQueryClient();
  return useMutation<InventoryDto, Error, ReplaceInventoryInput>({
    mutationFn: (body) => replaceInventory(channelId, body),
    onSuccess: (next) => qc.setQueryData(inventoryKey(channelId), next),
  });
}

export function useClearInventory(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, void>({
    mutationFn: () => clearInventory(channelId),
    onSuccess: () => {
      qc.setQueryData<InventoryDto>(inventoryKey(channelId), {
        characters: [], locations: [], rawOutput: '',
      });
    },
  });
}
