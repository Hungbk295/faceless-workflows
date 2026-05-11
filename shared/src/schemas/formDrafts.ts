import { z } from 'zod';

export const formKeySchema = z.enum(['script_params', 'topic_gen_params']);
export type FormKey = z.infer<typeof formKeySchema>;

export const upsertFormDraftSchema = z.object({
  data: z.unknown(),
}).strict();
export type UpsertFormDraftInput = z.infer<typeof upsertFormDraftSchema>;

export const formDraftDtoSchema = z.object({
  channelId: z.string(),
  formKey: formKeySchema,
  data: z.unknown(),
});
export type FormDraftDto = z.infer<typeof formDraftDtoSchema>;
