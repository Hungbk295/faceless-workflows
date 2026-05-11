import { z } from 'zod';

export const langSchema = z.enum(['vi', 'en', 'es', 'other']);
export type Lang = z.infer<typeof langSchema>;

export const createChannelSchema = z.object({
  name: z.string().trim().min(1, 'name required').max(120),
  niche: z.string().trim().max(200).optional().default(''),
  lang: langSchema.optional().default('vi'),
});
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  niche: z.string().trim().max(200).optional(),
  lang: langSchema.optional(),

  refUrl: z.string().trim().max(2000).optional(),
  refNotes: z.string().optional(),
  refAnalysis: z.string().optional(),

  dna: z.string().optional(),
  style: z.string().optional(),
  topics: z.string().optional(),

  thumbnails: z.string().optional(),
  metadata: z.string().optional(),

  currentScriptId: z.string().nullable().optional(),
}).strict();
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

export const channelIdSchema = z.string().regex(/^ch_[a-z0-9]+$/, 'invalid channel id');

export const channelDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  niche: z.string(),
  lang: langSchema,
  refUrl: z.string(),
  refNotes: z.string(),
  refAnalysis: z.string(),
  dna: z.string(),
  style: z.string(),
  topics: z.string(),
  thumbnails: z.string(),
  metadata: z.string(),
  currentScriptId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ChannelDto = z.infer<typeof channelDtoSchema>;
