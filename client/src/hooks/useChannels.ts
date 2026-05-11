import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChannelDto, CreateChannelInput, UpdateChannelInput } from 'shared';
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
} from '../api/channels.ts';

export const channelsKey = ['channels'] as const;

export function useChannels() {
  return useQuery<ChannelDto[]>({
    queryKey: channelsKey,
    queryFn: () => listChannels(),
    staleTime: 30_000,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation<ChannelDto, Error, CreateChannelInput>({
    mutationFn: (input) => createChannel(input),
    onSuccess: (created) => {
      qc.setQueryData<ChannelDto[]>(channelsKey, (prev) =>
        prev ? [created, ...prev] : [created],
      );
    },
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation<ChannelDto, Error, { id: string; patch: UpdateChannelInput }>({
    mutationFn: ({ id, patch }) => updateChannel(id, patch),
    onSuccess: (updated) => {
      qc.setQueryData<ChannelDto[]>(channelsKey, (prev) =>
        prev ? prev.map((ch) => (ch.id === updated.id ? updated : ch)) : prev,
      );
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation<{ id: string; deleted: boolean }, Error, string>({
    mutationFn: (id) => deleteChannel(id),
    onSuccess: ({ id }) => {
      qc.setQueryData<ChannelDto[]>(channelsKey, (prev) =>
        prev ? prev.filter((ch) => ch.id !== id) : prev,
      );
    },
  });
}
