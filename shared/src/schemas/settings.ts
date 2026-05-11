import { z } from 'zod';

export const settingsDtoSchema = z.record(z.string(), z.string().nullable());
export type SettingsDto = z.infer<typeof settingsDtoSchema>;

export const updateSettingsSchema = z.record(z.string().min(1).max(120), z.string().nullable());
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
