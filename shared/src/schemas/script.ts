import { z } from 'zod';

export const pillarSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5']);
export type Pillar = z.infer<typeof pillarSchema>;

export const createScriptSchema = z.object({
  topic: z.string().trim().max(500).optional().default(''),
  hook: z.string().optional().default(''),
  angle: z.string().optional().default(''),
  pillar: pillarSchema.optional().default('P1'),
  minutes: z.number().int().min(1).max(600).optional().default(18),
  structure: z.string().trim().max(120).optional().default('auto'),
  sections: z.string().trim().max(120).optional().default('auto'),
  pov: z.string().trim().max(120).optional().default('mixed-1-2-3'),
  customStructure: z.string().optional().default(''),
  scriptText: z.string().optional().default(''),
}).strict();
export type CreateScriptInput = z.infer<typeof createScriptSchema>;

export const updateScriptSchema = z.object({
  topic: z.string().trim().max(500).optional(),
  hook: z.string().optional(),
  angle: z.string().optional(),
  pillar: pillarSchema.optional(),
  minutes: z.number().int().min(1).max(600).optional(),
  structure: z.string().trim().max(120).optional(),
  sections: z.string().trim().max(120).optional(),
  pov: z.string().trim().max(120).optional(),
  customStructure: z.string().optional(),
  scriptText: z.string().optional(),
}).strict();
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;

export const scriptIdSchema = z.string().regex(/^proj_[a-z0-9]+$/, 'invalid script id');

export const scriptDtoSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  idx: z.number().int(),
  topic: z.string(),
  hook: z.string(),
  angle: z.string(),
  pillar: pillarSchema,
  minutes: z.number().int(),
  structure: z.string(),
  sections: z.string(),
  pov: z.string(),
  customStructure: z.string(),
  scriptText: z.string(),
  createdAt: z.string(),
});
export type ScriptDto = z.infer<typeof scriptDtoSchema>;
