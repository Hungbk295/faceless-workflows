import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import {
  channelIdSchema,
  updateVoiceConfigSchema,
  type VoiceConfigDto,
  type UpdateVoiceConfigInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type VoiceConfigRow = typeof schema.voiceConfig.$inferSelect;

const DEFAULTS = {
  provider: 'elevenlabs' as const,
  apiKey: '',
  voiceId: '',
  modelId: 'eleven_multilingual_v2',
  languageCode: 'vi',
  stability: 0.5,
  similarityBoost: 0.75,
  speed: 1.0,
};

function toDto(channelId: string, row: VoiceConfigRow | undefined): VoiceConfigDto {
  return {
    channelId,
    provider: (row?.provider ?? DEFAULTS.provider) as VoiceConfigDto['provider'],
    apiKey: row?.apiKey ?? DEFAULTS.apiKey,
    voiceId: row?.voiceId ?? DEFAULTS.voiceId,
    modelId: row?.modelId ?? DEFAULTS.modelId,
    languageCode: row?.languageCode ?? DEFAULTS.languageCode,
    stability: row?.stability ?? DEFAULTS.stability,
    similarityBoost: row?.similarityBoost ?? DEFAULTS.similarityBoost,
    speed: row?.speed ?? DEFAULTS.speed,
  };
}

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function ensureChannelExists(channelId: string): void {
  const row = db.select({ id: schema.channels.id })
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
}

export const voiceConfigRoute = new Hono();

voiceConfigRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const row = db.select().from(schema.voiceConfig)
    .where(eq(schema.voiceConfig.channelId, channelId))
    .get();
  return c.json(toDto(channelId, row));
});

voiceConfigRoute.on(['PATCH', 'PUT'], '/', validateJson(updateVoiceConfigSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const patch = getValidatedJson<typeof updateVoiceConfigSchema>(c) as UpdateVoiceConfigInput;
  const result = db.transaction((tx) => {
    const existing = tx.select().from(schema.voiceConfig)
      .where(eq(schema.voiceConfig.channelId, channelId))
      .get();
    if (existing) {
      if (Object.keys(patch).length === 0) return existing;
      return tx.update(schema.voiceConfig)
        .set(patch)
        .where(eq(schema.voiceConfig.channelId, channelId))
        .returning()
        .get();
    }
    return tx.insert(schema.voiceConfig).values({
      channelId,
      ...patch,
    }).returning().get();
  });
  return c.json(toDto(channelId, result));
});
