import { z } from 'zod';

export const claudeRunSchema = z.object({
  prompt: z.string().min(1, 'prompt required'),
  sessionId: z.string().optional(),
}).strict();
export type ClaudeRunInput = z.infer<typeof claudeRunSchema>;
