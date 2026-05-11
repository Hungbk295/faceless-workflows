import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  VoiceConfigDto,
  UpdateVoiceConfigInput,
  VoiceClipDto,
  GenerateVoiceClipInput,
} from 'shared';
import {
  getVoiceConfig,
  updateVoiceConfig,
  getClips,
  generateClip,
  deleteClip,
  clearClips,
} from '../api/voice.ts';

export const voiceConfigKey = (channelId: string) =>
  ['channels', channelId, 'voice-config'] as const;
export const clipsKey = (channelId: string) =>
  ['channels', channelId, 'clips'] as const;

export function useVoiceConfig(channelId: string) {
  return useQuery<VoiceConfigDto>({
    queryKey: voiceConfigKey(channelId),
    queryFn: () => getVoiceConfig(channelId),
    enabled: Boolean(channelId),
    staleTime: 30_000,
  });
}

export function useUpdateVoiceConfig(channelId: string) {
  const qc = useQueryClient();
  return useMutation<VoiceConfigDto, Error, UpdateVoiceConfigInput>({
    mutationFn: (patch) => updateVoiceConfig(channelId, patch),
    onSuccess: (next) => qc.setQueryData(voiceConfigKey(channelId), next),
  });
}

export function useClips(channelId: string) {
  return useQuery<VoiceClipDto[]>({
    queryKey: clipsKey(channelId),
    queryFn: () => getClips(channelId),
    enabled: Boolean(channelId),
    staleTime: 5_000,
  });
}

export function useGenerateClip(channelId: string) {
  const qc = useQueryClient();
  return useMutation<VoiceClipDto, Error, GenerateVoiceClipInput>({
    mutationFn: (body) => generateClip(channelId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: clipsKey(channelId) }),
  });
}

export function useDeleteClip(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, number>({
    mutationFn: (num) => deleteClip(channelId, num),
    onSuccess: () => qc.invalidateQueries({ queryKey: clipsKey(channelId) }),
  });
}

export function useClearClips(channelId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, void>({
    mutationFn: () => clearClips(channelId),
    onSuccess: () => qc.setQueryData<VoiceClipDto[]>(clipsKey(channelId), []),
  });
}
