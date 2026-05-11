import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { newChannelId, newScriptId, nowIso } from '../lib/id.ts';
import { writeClip } from './voiceClips.ts';

export interface ImportResult {
  channels: number;
  scripts: number;
  scenes: number;
  inventoryItems: number;
  scenePrompts: number;
  voiceClips: number;
  warnings: string[];
}

interface RawScene {
  num: number;
  level?: string;
  vo?: string;
  character?: string;
  background?: string;
  camera?: string;
  duration?: number;
  chars?: number;
  words?: number;
}

interface RawScriptEntry {
  projectId?: string;
  topic?: string;
  hook?: string;
  angle?: string;
  pillar?: string;
  minutes?: number;
  structure?: string;
  sections?: string;
  pov?: string;
  customStructure?: string;
  script?: string;
  scriptText?: string;
  createdAt?: string;
}

interface RawInventoryItem {
  id?: string;
  refId?: string;
  label?: string;
  prompt?: string;
}

interface RawScenePrompt {
  num: number;
  level?: string;
  character?: string;
  location?: string;
  prompt?: string;
}

interface RawClip {
  num: number;
  status?: string;
  size?: number;
  generatedAt?: string;
  error?: string;
  blobBase64?: string;
}

interface RawProject {
  projectId?: string;
  scripts?: RawScriptEntry[];
  scenes?: RawScene[];
  inventory?: { characters?: RawInventoryItem[]; locations?: RawInventoryItem[]; rawOutput?: string };
  scenePrompts?: { imagePrompts?: RawScenePrompt[]; videoPrompts?: RawScenePrompt[]; rawOutput?: string };
}

interface RawChannel {
  id?: string;
  name?: string;
  niche?: string;
  lang?: string;
  reference?: { url?: string; notes?: string; analysis?: string };
  refUrl?: string;
  refNotes?: string;
  refAnalysis?: string;
  dna?: string;
  style?: string;
  topics?: string;
  thumbnails?: string;
  metadata?: string;
  visual?: { charStyle?: string; bgStyle?: string; sceneStyle?: string; styleRef?: string };
  voice?: {
    apiKey?: string; voiceId?: string; modelId?: string; languageCode?: string;
    stability?: number; similarityBoost?: number; speed?: number;
    clips?: RawClip[];
  };
  scripts?: RawScriptEntry[];
  scenes?: RawScene[];
  inventory?: { characters?: RawInventoryItem[]; locations?: RawInventoryItem[]; rawOutput?: string };
  scenePrompts?: { imagePrompts?: RawScenePrompt[]; videoPrompts?: RawScenePrompt[]; rawOutput?: string };
  projects?: RawProject[];
  _activeProjectId?: string;
  _currentScriptIndex?: number | null;
}

export interface ExportState {
  schemaVersion: string;
  exportedAt: string;
  settings: Record<string, string | null>;
  channels: ExportChannel[];
}

interface ExportChannel {
  id: string;
  name: string;
  niche: string;
  lang: string;
  reference: { url: string; notes: string; analysis: string };
  dna: string;
  style: string;
  topics: string;
  thumbnails: string;
  metadata: string;
  currentScriptId: string | null;
  createdAt: string;
  updatedAt: string;
  visual: { charStyle: string; bgStyle: string; sceneStyle: string; styleRef: string };
  voice: {
    apiKey: string; voiceId: string; modelId: string; languageCode: string;
    stability: number; similarityBoost: number; speed: number;
    clips: { num: number; status: string; size: number | null; generatedAt: string | null; error: string | null }[];
  };
  scripts: {
    id: string; idx: number; topic: string; hook: string; angle: string;
    pillar: string; minutes: number; structure: string; sections: string; pov: string;
    customStructure: string; scriptText: string; createdAt: string;
  }[];
  scenes: { num: number; level: string; vo: string; character: string; background: string; camera: string; duration: number; chars: number; words: number }[];
  inventory: {
    characters: { refId: string; label: string; prompt: string }[];
    locations: { refId: string; label: string; prompt: string }[];
    rawOutput: string;
  };
  scenePrompts: {
    imagePrompts: { num: number; level: string; character: string; location: string; prompt: string }[];
    videoPrompts: { num: number; level: string; character: string; location: string; prompt: string }[];
    rawOutput: string;
  };
}

interface RawState {
  channels?: RawChannel[];
  schemaVersion?: string | number;
  activeChannelId?: string | null;
  activeStage?: string | null;
  dark?: boolean;
}

const VISUAL_KEYS = ['charStyle', 'bgStyle', 'sceneStyle', 'styleRef'] as const;

function decodeBase64(b64: string): ArrayBuffer | null {
  try {
    const cleaned = b64.replace(/^data:[^;]+;base64,/, '');
    const bin = atob(cleaned);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out.buffer;
  } catch {
    return null;
  }
}

function ensureChannelId(raw: string | undefined): string {
  if (raw && /^ch_[a-z0-9]+$/.test(raw)) return raw;
  return newChannelId();
}

function ensureScriptId(raw: string | undefined): string {
  if (raw && /^proj_[a-z0-9]+$/.test(raw)) return raw;
  return newScriptId();
}

function pickActiveProject(channel: RawChannel): { project: RawProject | null; warning: string | null } {
  const projects = channel.projects;
  if (!Array.isArray(projects) || projects.length === 0) return { project: null, warning: null };
  if (projects.length === 1) return { project: projects[0]!, warning: null };
  const active = projects.find((p) => p.projectId === channel._activeProjectId);
  const chosen = active ?? projects[projects.length - 1]!;
  const otherCount = projects.length - 1;
  const warning = `channel "${channel.name ?? channel.id}": SHIP shape — kept project ${chosen.projectId ?? '(unknown)'}, dropped ${otherCount} other project(s)`;
  return { project: chosen, warning };
}

export async function importFromJson(payload: unknown): Promise<ImportResult> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload must be a JSON object');
  }
  const state = payload as RawState;
  if (!Array.isArray(state.channels)) {
    throw new Error('payload.channels[] is required');
  }

  const result: ImportResult = {
    channels: 0, scripts: 0, scenes: 0,
    inventoryItems: 0, scenePrompts: 0, voiceClips: 0,
    warnings: [],
  };

  const pendingClipWrites: { channelId: string; num: number; data: ArrayBuffer }[] = [];

  db.transaction((tx) => {
    for (const rawChannel of state.channels!) {
      const channelId = ensureChannelId(rawChannel.id);
      const now = nowIso();

      const { project, warning } = pickActiveProject(rawChannel);
      if (warning) result.warnings.push(warning);

      const scriptsSrc = project?.scripts ?? rawChannel.scripts ?? [];
      const scenesSrc = project?.scenes ?? rawChannel.scenes ?? [];
      const inventorySrc = project?.inventory ?? rawChannel.inventory;
      const scenePromptsSrc = project?.scenePrompts ?? rawChannel.scenePrompts;

      tx.insert(schema.channels).values({
        id: channelId,
        name: rawChannel.name ?? '(unnamed)',
        niche: rawChannel.niche ?? '',
        lang: rawChannel.lang ?? 'vi',
        refUrl: rawChannel.reference?.url ?? rawChannel.refUrl ?? '',
        refNotes: rawChannel.reference?.notes ?? rawChannel.refNotes ?? '',
        refAnalysis: rawChannel.reference?.analysis ?? rawChannel.refAnalysis ?? '',
        dna: rawChannel.dna ?? '',
        style: rawChannel.style ?? '',
        topics: rawChannel.topics ?? '',
        thumbnails: rawChannel.thumbnails ?? '',
        metadata: rawChannel.metadata ?? '',
        currentScriptId: null,
        createdAt: now,
        updatedAt: now,
      }).run();
      result.channels += 1;

      const visual = rawChannel.visual ?? {};
      tx.insert(schema.visualPrompts).values(
        VISUAL_KEYS.map((key) => ({ channelId, key, value: visual[key] ?? '' })),
      ).run();

      const voice = rawChannel.voice;
      tx.insert(schema.voiceConfig).values({
        channelId,
        provider: 'elevenlabs',
        apiKey: voice?.apiKey ?? '',
        voiceId: voice?.voiceId ?? '',
        modelId: voice?.modelId ?? 'eleven_multilingual_v2',
        languageCode: voice?.languageCode ?? 'vi',
        stability: voice?.stability ?? 0.5,
        similarityBoost: voice?.similarityBoost ?? 0.75,
        speed: voice?.speed ?? 1.0,
      }).run();

      let currentScriptId: string | null = null;
      if (scriptsSrc.length > 0) {
        const rows = scriptsSrc.map((s, idx) => {
          const id = ensureScriptId(s.projectId);
          if (idx === (rawChannel._currentScriptIndex ?? -1)) currentScriptId = id;
          return {
            id, channelId, idx,
            topic: s.topic ?? '',
            hook: s.hook ?? '',
            angle: s.angle ?? '',
            pillar: s.pillar ?? 'P1',
            minutes: typeof s.minutes === 'number' ? s.minutes : 18,
            structure: s.structure ?? 'auto',
            sections: s.sections ?? 'auto',
            pov: s.pov ?? 'mixed-1-2-3',
            customStructure: s.customStructure ?? '',
            scriptText: s.scriptText ?? s.script ?? '',
            createdAt: s.createdAt ?? now,
          };
        });
        tx.insert(schema.scripts).values(rows).run();
        result.scripts += rows.length;
      }
      if (currentScriptId) {
        tx.update(schema.channels)
          .set({ currentScriptId })
          .where(eq(schema.channels.id, channelId))
          .run();
      }

      if (scenesSrc.length > 0) {
        const seen = new Set<number>();
        const rows = scenesSrc
          .filter((s) => Number.isFinite(s.num) && !seen.has(s.num) && (seen.add(s.num), true))
          .map((s) => ({
            channelId, num: s.num,
            level: s.level ?? '',
            vo: s.vo ?? '',
            character: s.character ?? '',
            background: s.background ?? '',
            camera: s.camera ?? 'medium shot',
            duration: typeof s.duration === 'number' ? s.duration : 0,
            chars: typeof s.chars === 'number' ? s.chars : (s.vo?.length ?? 0),
            words: typeof s.words === 'number' ? s.words : 0,
          }));
        if (rows.length > 0) {
          tx.insert(schema.scenes).values(rows).run();
          result.scenes += rows.length;
        }
      }

      if (inventorySrc) {
        const items = [
          ...(inventorySrc.characters ?? []).map((i) => ({
            channelId, type: 'character' as const,
            refId: i.refId ?? i.id ?? '',
            label: i.label ?? '',
            prompt: i.prompt ?? '',
          })),
          ...(inventorySrc.locations ?? []).map((i) => ({
            channelId, type: 'location' as const,
            refId: i.refId ?? i.id ?? '',
            label: i.label ?? '',
            prompt: i.prompt ?? '',
          })),
        ].filter((i) => i.refId);
        if (items.length > 0) {
          tx.insert(schema.inventoryItems).values(items).run();
          result.inventoryItems += items.length;
        }
        if (inventorySrc.rawOutput) {
          tx.insert(schema.inventoryMeta).values({ channelId, rawOutput: inventorySrc.rawOutput }).run();
        }
      }

      if (scenePromptsSrc) {
        const seenImg = new Set<number>();
        const seenVid = new Set<number>();
        const sp = [
          ...(scenePromptsSrc.imagePrompts ?? [])
            .filter((p) => Number.isFinite(p.num) && !seenImg.has(p.num) && (seenImg.add(p.num), true))
            .map((p) => ({
              channelId, type: 'image' as const, num: p.num,
              level: p.level ?? '', character: p.character ?? '', location: p.location ?? '',
              prompt: p.prompt ?? '',
            })),
          ...(scenePromptsSrc.videoPrompts ?? [])
            .filter((p) => Number.isFinite(p.num) && !seenVid.has(p.num) && (seenVid.add(p.num), true))
            .map((p) => ({
              channelId, type: 'video' as const, num: p.num,
              level: p.level ?? '', character: p.character ?? '', location: p.location ?? '',
              prompt: p.prompt ?? '',
            })),
        ];
        if (sp.length > 0) {
          tx.insert(schema.scenePrompts).values(sp).run();
          result.scenePrompts += sp.length;
        }
        if (scenePromptsSrc.rawOutput) {
          tx.insert(schema.scenePromptsMeta).values({ channelId, rawOutput: scenePromptsSrc.rawOutput }).run();
        }
      }

      const clips = voice?.clips ?? [];
      const seenClipNums = new Set<number>();
      for (const clip of clips) {
        if (!Number.isFinite(clip.num)) continue;
        if (seenClipNums.has(clip.num)) continue;
        seenClipNums.add(clip.num);
        let writePath: string | null = null;
        if (clip.blobBase64 && clip.status === 'done') {
          const buf = decodeBase64(clip.blobBase64);
          if (buf) {
            pendingClipWrites.push({ channelId, num: clip.num, data: buf });
            writePath = `clips/${channelId}/${String(clip.num).padStart(3, '0')}.mp3`;
          } else {
            result.warnings.push(`channel "${rawChannel.name ?? channelId}" clip ${clip.num}: base64 decode failed`);
          }
        }
        tx.insert(schema.voiceClips).values({
          channelId,
          num: clip.num,
          status: clip.status === 'done' && writePath ? 'done' : (clip.status ?? 'pending'),
          filePath: writePath,
          size: typeof clip.size === 'number' ? clip.size : null,
          generatedAt: clip.generatedAt ?? null,
          error: clip.error ?? null,
        }).run();
        result.voiceClips += 1;
      }
    }
  });

  for (const w of pendingClipWrites) {
    await writeClip(w.channelId, w.num, w.data);
  }

  return result;
}

export function exportToJson(): ExportState {
  const channels = db.select().from(schema.channels).all();
  const settingsRows = db.select().from(schema.settings).all();
  const settings: Record<string, string | null> = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  const out: ExportState = {
    schemaVersion: 'faceless-ts-1',
    exportedAt: nowIso(),
    settings,
    channels: [],
  };

  for (const ch of channels) {
    const visualRows = db.select().from(schema.visualPrompts)
      .where(eq(schema.visualPrompts.channelId, ch.id)).all();
    const visualMap: Record<string, string> = {};
    for (const v of visualRows) visualMap[v.key] = v.value;

    const voice = db.select().from(schema.voiceConfig)
      .where(eq(schema.voiceConfig.channelId, ch.id)).get();

    const scripts = db.select().from(schema.scripts)
      .where(eq(schema.scripts.channelId, ch.id)).orderBy(schema.scripts.idx).all();

    const scenes = db.select().from(schema.scenes)
      .where(eq(schema.scenes.channelId, ch.id)).orderBy(schema.scenes.num).all();

    const invItems = db.select().from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.channelId, ch.id)).all();
    const invMeta = db.select().from(schema.inventoryMeta)
      .where(eq(schema.inventoryMeta.channelId, ch.id)).get();

    const sp = db.select().from(schema.scenePrompts)
      .where(eq(schema.scenePrompts.channelId, ch.id)).orderBy(schema.scenePrompts.num).all();
    const spMeta = db.select().from(schema.scenePromptsMeta)
      .where(eq(schema.scenePromptsMeta.channelId, ch.id)).get();

    const clips = db.select().from(schema.voiceClips)
      .where(eq(schema.voiceClips.channelId, ch.id)).orderBy(schema.voiceClips.num).all();

    out.channels.push({
      id: ch.id,
      name: ch.name,
      niche: ch.niche ?? '',
      lang: ch.lang,
      reference: {
        url: ch.refUrl ?? '',
        notes: ch.refNotes ?? '',
        analysis: ch.refAnalysis ?? '',
      },
      dna: ch.dna ?? '',
      style: ch.style ?? '',
      topics: ch.topics ?? '',
      thumbnails: ch.thumbnails ?? '',
      metadata: ch.metadata ?? '',
      currentScriptId: ch.currentScriptId ?? null,
      createdAt: ch.createdAt,
      updatedAt: ch.updatedAt,
      visual: {
        charStyle: visualMap.charStyle ?? '',
        bgStyle: visualMap.bgStyle ?? '',
        sceneStyle: visualMap.sceneStyle ?? '',
        styleRef: visualMap.styleRef ?? '',
      },
      voice: {
        apiKey: voice?.apiKey ?? '',
        voiceId: voice?.voiceId ?? '',
        modelId: voice?.modelId ?? 'eleven_multilingual_v2',
        languageCode: voice?.languageCode ?? 'vi',
        stability: voice?.stability ?? 0.5,
        similarityBoost: voice?.similarityBoost ?? 0.75,
        speed: voice?.speed ?? 1.0,
        clips: clips.map((c) => ({
          num: c.num,
          status: c.status,
          size: c.size,
          generatedAt: c.generatedAt,
          error: c.error,
        })),
      },
      scripts: scripts.map((s) => ({
        id: s.id,
        idx: s.idx,
        topic: s.topic ?? '',
        hook: s.hook ?? '',
        angle: s.angle ?? '',
        pillar: s.pillar ?? 'P1',
        minutes: s.minutes ?? 18,
        structure: s.structure ?? 'auto',
        sections: s.sections ?? 'auto',
        pov: s.pov ?? 'mixed-1-2-3',
        customStructure: s.customStructure ?? '',
        scriptText: s.scriptText,
        createdAt: s.createdAt,
      })),
      scenes: scenes.map((s) => ({
        num: s.num,
        level: s.level ?? '',
        vo: s.vo,
        character: s.character ?? '',
        background: s.background ?? '',
        camera: s.camera ?? 'medium shot',
        duration: s.duration ?? 0,
        chars: s.chars ?? 0,
        words: s.words ?? 0,
      })),
      inventory: {
        characters: invItems.filter((i) => i.type === 'character').map((i) => ({
          refId: i.refId, label: i.label ?? '', prompt: i.prompt,
        })),
        locations: invItems.filter((i) => i.type === 'location').map((i) => ({
          refId: i.refId, label: i.label ?? '', prompt: i.prompt,
        })),
        rawOutput: invMeta?.rawOutput ?? '',
      },
      scenePrompts: {
        imagePrompts: sp.filter((p) => p.type === 'image').map((p) => ({
          num: p.num, level: p.level ?? '', character: p.character ?? '', location: p.location ?? '',
          prompt: p.prompt,
        })),
        videoPrompts: sp.filter((p) => p.type === 'video').map((p) => ({
          num: p.num, level: p.level ?? '', character: p.character ?? '', location: p.location ?? '',
          prompt: p.prompt,
        })),
        rawOutput: spMeta?.rawOutput ?? '',
      },
    });
  }

  return out;
}
