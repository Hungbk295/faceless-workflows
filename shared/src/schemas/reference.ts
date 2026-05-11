import { z } from 'zod';

export const updateReferenceSchema = z.object({
  refUrl: z.string().trim().max(2000).optional(),
  refNotes: z.string().optional(),
  refAnalysis: z.string().optional(),
}).strict();
export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;

export const referenceDtoSchema = z.object({
  refUrl: z.string(),
  refNotes: z.string(),
  refAnalysis: z.string(),
});
export type ReferenceDto = z.infer<typeof referenceDtoSchema>;
