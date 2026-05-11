import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VisualPromptsDto, UpdateVisualPromptsInput } from 'shared';
import { getVisualPrompts, updateVisualPrompts } from '../api/visualPrompts.ts';

export const visualPromptsKey = (channelId: string) =>
  ['channels', channelId, 'visual-prompts'] as const;

export function useVisualPrompts(channelId: string) {
  return useQuery<VisualPromptsDto>({
    queryKey: visualPromptsKey(channelId),
    queryFn: () => getVisualPrompts(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useUpdateVisualPrompts(channelId: string) {
  const qc = useQueryClient();
  return useMutation<VisualPromptsDto, Error, UpdateVisualPromptsInput>({
    mutationFn: (patch) => updateVisualPrompts(channelId, patch),
    onSuccess: (next) => {
      qc.setQueryData(visualPromptsKey(channelId), next);
    },
  });
}
