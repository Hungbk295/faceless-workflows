import { z } from 'zod';

export const visualPromptKeySchema = z.enum(['charStyle', 'bgStyle', 'sceneStyle', 'styleRef']);
export type VisualPromptKey = z.infer<typeof visualPromptKeySchema>;

export const visualPromptsDtoSchema = z.object({
  charStyle: z.string(),
  bgStyle: z.string(),
  sceneStyle: z.string(),
  styleRef: z.string(),
});
export type VisualPromptsDto = z.infer<typeof visualPromptsDtoSchema>;

export const updateVisualPromptsSchema = z.object({
  charStyle: z.string().optional(),
  bgStyle: z.string().optional(),
  sceneStyle: z.string().optional(),
  styleRef: z.string().optional(),
}).strict();
export type UpdateVisualPromptsInput = z.infer<typeof updateVisualPromptsSchema>;
