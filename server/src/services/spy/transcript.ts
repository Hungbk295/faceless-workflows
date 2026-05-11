import { YoutubeTranscript } from 'youtube-transcript';
import type { SpyTranscriptStatus } from 'shared';

export interface TranscriptResult {
  text: string;
  status: SpyTranscriptStatus;
  lang: string | null;
}

const LANG_PRIORITY = ['vi', 'en'];

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  for (const lang of LANG_PRIORITY) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (segments.length > 0) {
        const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
        return { text, status: 'ok', lang };
      }
    } catch {
      /* try next */
    }
  }
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (segments.length > 0) {
      const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
      return { text, status: 'ok', lang: null };
    }
    return { text: '', status: 'missing', lang: null };
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('transcript') && msg.includes('disabled')) {
      return { text: '', status: 'missing', lang: null };
    }
    if (msg.includes('no transcript') || msg.includes('not available')) {
      return { text: '', status: 'missing', lang: null };
    }
    return { text: '', status: 'error', lang: null };
  }
}
