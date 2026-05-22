import { z } from 'zod';

export const spyRunInputSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  framesCount: z.number().int().min(1).max(200).optional(),
}).strict();
export type SpyRunInput = z.infer<typeof spyRunInputSchema>;

export const spyRunStatusSchema = z.enum(['idle', 'running', 'done', 'error']);
export type SpyRunStatus = z.infer<typeof spyRunStatusSchema>;

export const spyStepSchema = z.enum([
  'list',
  'metadata',
  'thumbnails',
  'transcripts',
  'frames',
  'done',
]);
export type SpyStep = z.infer<typeof spyStepSchema>;

export const spyTranscriptStatusSchema = z.enum(['pending', 'ok', 'missing', 'error']);
export type SpyTranscriptStatus = z.infer<typeof spyTranscriptStatusSchema>;

export const spyFramesStatusSchema = z.enum(['skipped', 'pending', 'ok', 'error']);
export type SpyFramesStatus = z.infer<typeof spyFramesStatusSchema>;

export const spyFrameDtoSchema = z.object({
  idx: z.number().int(),
  timestampSec: z.number().int(),
  url: z.string(),
  path: z.string(),
});
export type SpyFrameDto = z.infer<typeof spyFrameDtoSchema>;

export const spyVideoDtoSchema = z.object({
  videoId: z.string(),
  rank: z.number().int(),
  title: z.string(),
  viewCount: z.number().int(),
  durationSec: z.number().int(),
  publishedAt: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  transcript: z.string(),
  transcriptStatus: spyTranscriptStatusSchema,
  framesStatus: spyFramesStatusSchema,
  frames: z.array(spyFrameDtoSchema),
});
export type SpyVideoDto = z.infer<typeof spyVideoDtoSchema>;

export const spyRunDtoSchema = z.object({
  status: spyRunStatusSchema,
  step: spyStepSchema.nullable(),
  progress: z.number().int(),
  total: z.number().int(),
  sourceUrl: z.string(),
  channelTitle: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
});
export type SpyRunDto = z.infer<typeof spyRunDtoSchema>;

export const spyResultDtoSchema = z.object({
  run: spyRunDtoSchema.nullable(),
  videos: z.array(spyVideoDtoSchema),
});
export type SpyResultDto = z.infer<typeof spyResultDtoSchema>;

export const spyProgressEventSchema = z.object({
  type: z.enum(['progress', 'done', 'error']),
  step: spyStepSchema.nullable(),
  progress: z.number().int(),
  total: z.number().int(),
  message: z.string().optional(),
});
export type SpyProgressEvent = z.infer<typeof spyProgressEventSchema>;
