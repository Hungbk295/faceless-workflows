import { z } from 'zod';

export const voiceClipStatusSchema = z.enum(['pending', 'processing', 'done', 'error']);
export type VoiceClipStatus = z.infer<typeof voiceClipStatusSchema>;

export const generateVoiceClipSchema = z.object({
  num: z.number().int().min(1),
  text: z.string().min(1),
}).strict();
export type GenerateVoiceClipInput = z.infer<typeof generateVoiceClipSchema>;

export const voiceClipDtoSchema = z.object({
  num: z.number().int(),
  status: voiceClipStatusSchema,
  size: z.number().int().nullable(),
  generatedAt: z.string().nullable(),
  error: z.string().nullable(),
  url: z.string(),
});
export type VoiceClipDto = z.infer<typeof voiceClipDtoSchema>;
