// Port từ v3 runSplit (line 4446). Pure function — no DOM access.

import { extractScriptBody } from '../extractors/script.ts';
import { splitSentencesText } from './splitSentences.ts';

export interface SplitOptions {
  minChar?: number;
  maxChar?: number;
  wpm?: number;
}

export interface SplitScene {
  num: number;
  level: string;
  vo: string;
  character: string;
  background: string;
  camera: string;
  duration: number;
  chars: number;
  words: number;
}

export interface SplitResult {
  scenes: SplitScene[];
  totalDurationSec: number;
  bodyLength: number;
}

interface LineGroup {
  section: string;
  lines: string[];
}

const STAGE_MARKER_LINE =
  /^\s*(\[VISUAL[:\s]|\[B-?ROLL[:\s]|\[NHẠC[:\s]|\[MUSIC[:\s]|\[SOUND[:\s]|\[SFX[:\s]|\[NARRATOR\]?\s*:?\s*$|\[chậm\]\s*$|\[pause\b)/i;

const SPEAKER_LABEL =
  /^\s*\*{0,2}(NARRATOR|HOST|VOICE\s*OVER|VO|NGƯỜI\s*KỂ)\s*:?\*{0,2}\s*/i;

export function runSplit(scriptText: string, opts: SplitOptions = {}): SplitResult {
  const minChar = opts.minChar ?? 30;
  const maxChar = opts.maxChar ?? 180;
  const wpm = opts.wpm ?? 150;

  const scriptBody = extractScriptBody(scriptText);
  if (!scriptBody.trim()) {
    return { scenes: [], totalDurationSec: 0, bodyLength: 0 };
  }

  const lines = scriptBody.split('\n');
  const lineGroups: LineGroup[] = [];
  let currentGroup: LineGroup = { section: '[INTRO]', lines: [] };

  for (const line of lines) {
    const sectionMatch = line.match(/^#{1,4}\s*(.+?)\s*$/);
    if (sectionMatch && line.match(/^#{1,4}\s/)) {
      if (currentGroup.lines.length > 0) {
        lineGroups.push(currentGroup);
      }
      const rawTitle = (sectionMatch[1] ?? '').replace(/^\[|\]$/g, '').trim();
      const timeMatch = rawTitle.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      const phanMatch =
        rawTitle.match(/PHẦN\s*(\d+)/i)
        || rawTitle.match(/LEVEL\s*(\d+)/i)
        || rawTitle.match(/PART\s*(\d+)/i)
        || rawTitle.match(/CHAPTER\s*(\d+)/i);
      let label = rawTitle.substring(0, 50);
      if (timeMatch && timeMatch[1] && timeMatch[2]) {
        const phan = phanMatch && phanMatch[1] ? phanMatch[1] : String(lineGroups.length + 1);
        label = `[${timeMatch[1]} - ${timeMatch[2]}] P${phan}`;
      } else if (phanMatch && phanMatch[1]) {
        label = `P${phanMatch[1]} — ${rawTitle.substring(0, 30)}`;
      }
      currentGroup = { section: label, lines: [] };
      continue;
    }

    if (STAGE_MARKER_LINE.test(line)) continue;
    if (line.trim().startsWith('>')) continue;
    if (line.trim().startsWith('|') && line.includes('|')) continue;
    if (/^-{3,}$/.test(line.trim())) continue;

    const cleaned = line
      .replace(SPEAKER_LABEL, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[pause\s+\d+\.?\d*s?\]/gi, '')
      .replace(/\[VISUAL:[^\]]*\]/gi, '')
      .replace(/\[B-?ROLL:[^\]]*\]/gi, '')
      .replace(/\[NHẠC:[^\]]*\]/gi, '')
      .replace(/\[NHẤN MẠNH:\s*"?([^\]"]*)"?\]/gi, '$1')
      .replace(/\[chậm\]/gi, '')
      .replace(/\[NARRATOR\]?:?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned && cleaned.length > 2) currentGroup.lines.push(cleaned);
  }
  if (currentGroup.lines.length > 0) lineGroups.push(currentGroup);

  const scenes: SplitScene[] = [];
  let sceneNum = 1;

  for (const group of lineGroups) {
    const groupText = group.lines.join(' ');
    if (!groupText.trim()) continue;
    const sentences = splitSentencesText(groupText, minChar, maxChar);
    for (const s of sentences) {
      const wordCount = s.split(/\s+/).filter((w) => w.length > 0).length;
      const duration = Math.max(1, Math.round((wordCount / wpm) * 60));
      scenes.push({
        num: sceneNum++,
        level: group.section,
        vo: s,
        character: '',
        background: '',
        camera: 'medium shot',
        duration,
        chars: s.length,
        words: wordCount,
      });
    }
  }

  const totalDurationSec = scenes.reduce((a, s) => a + s.duration, 0);
  return { scenes, totalDurationSec, bodyLength: scriptBody.length };
}
