import { z } from 'zod';

export const scenePromptTypeSchema = z.enum(['image', 'video']);
export type ScenePromptType = z.infer<typeof scenePromptTypeSchema>;

export const scenePromptInputSchema = z.object({
  num: z.number().int().min(1),
  level: z.string().optional().default(''),
  character: z.string().optional().default(''),
  location: z.string().optional().default(''),
  prompt: z.string().default(''),
}).strict();
export type ScenePromptInput = z.infer<typeof scenePromptInputSchema>;

export const replaceScenePromptsSchema = z.object({
  imagePrompts: z.array(scenePromptInputSchema).optional().default([]),
  videoPrompts: z.array(scenePromptInputSchema).optional().default([]),
  rawOutput: z.string().optional().default(''),
}).strict();
export type ReplaceScenePromptsInput = z.infer<typeof replaceScenePromptsSchema>;

export const appendScenePromptsSchema = z.object({
  imagePrompts: z.array(scenePromptInputSchema).optional().default([]),
  videoPrompts: z.array(scenePromptInputSchema).optional().default([]),
  rawOutput: z.string().optional().default(''),
}).strict();
export type AppendScenePromptsInput = z.infer<typeof appendScenePromptsSchema>;

export const scenePromptDtoSchema = z.object({
  num: z.number().int(),
  level: z.string(),
  character: z.string(),
  location: z.string(),
  prompt: z.string(),
});
export type ScenePromptDto = z.infer<typeof scenePromptDtoSchema>;

export const scenePromptsDtoSchema = z.object({
  imagePrompts: z.array(scenePromptDtoSchema),
  videoPrompts: z.array(scenePromptDtoSchema),
  rawOutput: z.string(),
});
export type ScenePromptsDto = z.infer<typeof scenePromptsDtoSchema>;
