import { z } from 'zod';

export const attachmentKindSchema = z.enum(['video', 'frame', 'file']);
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;

export const uploadedAttachmentDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().int(),
  mimeType: z.string(),
  url: z.string(),
  path: z.string(),
});
export type UploadedAttachmentDto = z.infer<typeof uploadedAttachmentDtoSchema>;
