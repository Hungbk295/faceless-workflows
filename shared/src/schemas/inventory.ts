import { z } from 'zod';

export const inventoryItemTypeSchema = z.enum(['character', 'location']);
export type InventoryItemType = z.infer<typeof inventoryItemTypeSchema>;

export const inventoryItemInputSchema = z.object({
  refId: z.string().trim().min(1).max(120),
  label: z.string().optional().default(''),
  prompt: z.string().default(''),
}).strict();
export type InventoryItemInput = z.infer<typeof inventoryItemInputSchema>;

export const replaceInventorySchema = z.object({
  characters: z.array(inventoryItemInputSchema).optional().default([]),
  locations: z.array(inventoryItemInputSchema).optional().default([]),
  rawOutput: z.string().optional().default(''),
}).strict();
export type ReplaceInventoryInput = z.infer<typeof replaceInventorySchema>;

export const inventoryItemDtoSchema = z.object({
  refId: z.string(),
  label: z.string(),
  prompt: z.string(),
});
export type InventoryItemDto = z.infer<typeof inventoryItemDtoSchema>;

export const inventoryDtoSchema = z.object({
  characters: z.array(inventoryItemDtoSchema),
  locations: z.array(inventoryItemDtoSchema),
  rawOutput: z.string(),
});
export type InventoryDto = z.infer<typeof inventoryDtoSchema>;
