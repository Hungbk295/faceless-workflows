import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  niche: text('niche').default(''),
  lang: text('lang').notNull().default('vi'),

  refUrl: text('ref_url').default(''),
  refNotes: text('ref_notes').default(''),
  refAnalysis: text('ref_analysis').default(''),

  dna: text('dna').default(''),
  style: text('style').default(''),
  topics: text('topics').default(''),

  thumbnails: text('thumbnails').default(''),
  metadata: text('metadata').default(''),

  currentScriptId: text('current_script_id'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const visualPrompts = sqliteTable('visual_prompts', {
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull().default(''),
}, (t) => ({ pk: primaryKey({ columns: [t.channelId, t.key] }) }));

export const voiceConfig = sqliteTable('voice_config', {
  channelId: text('channel_id').primaryKey().references(() => channels.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('elevenlabs'),
  apiKey: text('api_key').default(''),
  voiceId: text('voice_id').default(''),
  modelId: text('model_id').default('eleven_multilingual_v2'),
  languageCode: text('language_code').default('vi'),
  stability: real('stability').default(0.5),
  similarityBoost: real('similarity_boost').default(0.75),
  speed: real('speed').default(1.0),
});

export const scripts = sqliteTable('scripts', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  idx: integer('idx').notNull(),

  topic: text('topic').default(''),
  hook: text('hook').default(''),
  angle: text('angle').default(''),
  pillar: text('pillar').default('P1'),
  minutes: integer('minutes').default(18),
  structure: text('structure').default('auto'),
  sections: text('sections').default('auto'),
  pov: text('pov').default('mixed-1-2-3'),
  customStructure: text('custom_structure').default(''),
  scriptText: text('script_text').notNull().default(''),

  createdAt: text('created_at').notNull(),
}, (t) => ({ uq: uniqueIndex('scripts_channel_idx').on(t.channelId, t.idx) }));

export const scenes = sqliteTable('scenes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  num: integer('num').notNull(),
  level: text('level').default(''),
  vo: text('vo').notNull().default(''),
  character: text('character').default(''),
  background: text('background').default(''),
  camera: text('camera').default('medium shot'),
  duration: integer('duration').default(0),
  chars: integer('chars').default(0),
  words: integer('words').default(0),
}, (t) => ({ uq: uniqueIndex('scenes_channel_num').on(t.channelId, t.num) }));

export const inventoryItems = sqliteTable('inventory_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  refId: text('ref_id').notNull(),
  label: text('label').default(''),
  prompt: text('prompt').notNull().default(''),
}, (t) => ({ uq: uniqueIndex('inv_channel_type_ref').on(t.channelId, t.type, t.refId) }));

export const inventoryMeta = sqliteTable('inventory_meta', {
  channelId: text('channel_id').primaryKey().references(() => channels.id, { onDelete: 'cascade' }),
  rawOutput: text('raw_output').default(''),
});

export const scenePrompts = sqliteTable('scene_prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  num: integer('num').notNull(),
  level: text('level').default(''),
  character: text('character').default(''),
  location: text('location').default(''),
  prompt: text('prompt').notNull().default(''),
}, (t) => ({ uq: uniqueIndex('sp_channel_type_num').on(t.channelId, t.type, t.num) }));

export const scenePromptsMeta = sqliteTable('scene_prompts_meta', {
  channelId: text('channel_id').primaryKey().references(() => channels.id, { onDelete: 'cascade' }),
  rawOutput: text('raw_output').default(''),
});

export const voiceClips = sqliteTable('voice_clips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  num: integer('num').notNull(),
  status: text('status').notNull().default('pending'),
  filePath: text('file_path'),
  size: integer('size'),
  generatedAt: text('generated_at'),
  error: text('error'),
}, (t) => ({ uq: uniqueIndex('vc_channel_num').on(t.channelId, t.num) }));

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export const formDrafts = sqliteTable('form_drafts', {
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  formKey: text('form_key').notNull(),
  data: text('data').notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.channelId, t.formKey] }) }));

export const spyRuns = sqliteTable('spy_runs', {
  channelId: text('channel_id').primaryKey().references(() => channels.id, { onDelete: 'cascade' }),
  sourceUrl: text('source_url').notNull().default(''),
  channelTitle: text('channel_title').notNull().default(''),
  status: text('status').notNull().default('idle'),
  step: text('step'),
  progress: integer('progress').notNull().default(0),
  total: integer('total').notNull().default(0),
  error: text('error'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
});

export const spyVideos = sqliteTable('spy_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  videoId: text('video_id').notNull(),
  rank: integer('rank').notNull(),
  title: text('title').notNull().default(''),
  viewCount: integer('view_count').notNull().default(0),
  durationSec: integer('duration_sec').notNull().default(0),
  publishedAt: text('published_at'),
  thumbnailPath: text('thumbnail_path'),
  transcript: text('transcript').notNull().default(''),
  transcriptStatus: text('transcript_status').notNull().default('pending'),
  framesStatus: text('frames_status').notNull().default('skipped'),
}, (t) => ({ uq: uniqueIndex('spy_channel_video').on(t.channelId, t.videoId) }));

export const spyFrames = sqliteTable('spy_frames', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoRowId: integer('video_row_id').notNull().references(() => spyVideos.id, { onDelete: 'cascade' }),
  idx: integer('idx').notNull(),
  timestampSec: integer('timestamp_sec').notNull(),
  framePath: text('frame_path').notNull(),
}, (t) => ({ uq: uniqueIndex('spy_frame_video_idx').on(t.videoRowId, t.idx) }));
