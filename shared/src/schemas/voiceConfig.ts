import { z } from 'zod';

export const voiceProviderSchema = z.enum(['elevenlabs']);

export const voiceConfigDtoSchema = z.object({
  channelId: z.string(),
  provider: voiceProviderSchema,
  apiKey: z.string(),
  voiceId: z.string(),
  modelId: z.string(),
  languageCode: z.string(),
  stability: z.number(),
  similarityBoost: z.number(),
  speed: z.number(),
});
export type VoiceConfigDto = z.infer<typeof voiceConfigDtoSchema>;

export const updateVoiceConfigSchema = z.object({
  provider: voiceProviderSchema.optional(),
  apiKey: z.string().optional(),
  voiceId: z.string().optional(),
  modelId: z.string().optional(),
  languageCode: z.string().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  speed: z.number().min(0.25).max(4).optional(),
}).strict();
export type UpdateVoiceConfigInput = z.infer<typeof updateVoiceConfigSchema>;
