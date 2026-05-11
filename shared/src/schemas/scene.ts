import { z } from 'zod';

export const sceneInputSchema = z.object({
  num: z.number().int().min(1),
  level: z.string().optional().default(''),
  vo: z.string().default(''),
  character: z.string().optional().default(''),
  background: z.string().optional().default(''),
  camera: z.string().optional().default('medium shot'),
  duration: z.number().int().min(0).optional().default(0),
  chars: z.number().int().min(0).optional().default(0),
  words: z.number().int().min(0).optional().default(0),
}).strict();
export type SceneInput = z.infer<typeof sceneInputSchema>;

export const replaceScenesSchema = z.object({
  scenes: z.array(sceneInputSchema),
}).strict();
export type ReplaceScenesInput = z.infer<typeof replaceScenesSchema>;

export const updateSceneSchema = z.object({
  level: z.string().optional(),
  vo: z.string().optional(),
  character: z.string().optional(),
  background: z.string().optional(),
  camera: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  chars: z.number().int().min(0).optional(),
  words: z.number().int().min(0).optional(),
}).strict();
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;

export const sceneNumSchema = z.coerce.number().int().min(1);

export const sceneDtoSchema = z.object({
  num: z.number().int(),
  level: z.string(),
  vo: z.string(),
  character: z.string(),
  background: z.string(),
  camera: z.string(),
  duration: z.number().int(),
  chars: z.number().int(),
  words: z.number().int(),
});
export type SceneDto = z.infer<typeof sceneDtoSchema>;
