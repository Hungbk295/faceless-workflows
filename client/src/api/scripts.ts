import type { ScriptDto, CreateScriptInput, UpdateScriptInput } from 'shared';
import { api } from './client.ts';

export const listScripts = (channelId: string): Promise<ScriptDto[]> =>
  api.get<ScriptDto[]>(`/api/channels/${encodeURIComponent(channelId)}/scripts`);

export const getScript = (channelId: string, scriptId: string): Promise<ScriptDto> =>
  api.get<ScriptDto>(
    `/api/channels/${encodeURIComponent(channelId)}/scripts/${encodeURIComponent(scriptId)}`,
  );

export const createScript = (channelId: string, input: CreateScriptInput): Promise<ScriptDto> =>
  api.post<ScriptDto>(`/api/channels/${encodeURIComponent(channelId)}/scripts`, input);

export const updateScript = (
  channelId: string,
  scriptId: string,
  patch: UpdateScriptInput,
): Promise<ScriptDto> =>
  api.patch<ScriptDto>(
    `/api/channels/${encodeURIComponent(channelId)}/scripts/${encodeURIComponent(scriptId)}`,
    patch,
  );

export const deleteScript = (
  channelId: string,
  scriptId: string,
): Promise<{ id: string; deleted: boolean }> =>
  api.del<{ id: string; deleted: boolean }>(
    `/api/channels/${encodeURIComponent(channelId)}/scripts/${encodeURIComponent(scriptId)}`,
  );
