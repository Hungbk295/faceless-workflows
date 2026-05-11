import type { AttachmentItem } from '../../hooks/useAttachments.ts';

function trimTranscript(text: string, max = 20_000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n…[transcript truncated]';
}

/**
 * Build a text block that lists every attached item with absolute server
 * paths for images, plus inline transcripts. Claude `-p` can Read the images
 * via tools.
 */
export function composeAttachmentsBlock(items: AttachmentItem[]): string {
  if (items.length === 0) return '';

  const videos = items.filter((i) => i.kind === 'video');
  const frames = items.filter((i) => i.kind === 'frame');
  const files = items.filter((i) => i.kind === 'file');

  const parts: string[] = ['', '═══ ATTACHED REFERENCE MATERIAL ═══', ''];

  if (videos.length > 0) {
    parts.push(`## Reference videos (${videos.length})`);
    parts.push('');
    for (const v of videos) {
      parts.push(`### ${v.videoTitle ?? v.label}`);
      if (v.viewCount !== undefined) parts.push(`- Views: ${v.viewCount.toLocaleString()}`);
      if (v.videoId) parts.push(`- URL: https://youtu.be/${v.videoId}`);
      parts.push(`- Thumbnail (read this image): ${v.serverPath}`);
      if (v.transcript) {
        parts.push('');
        parts.push('Transcript:');
        parts.push('```');
        parts.push(trimTranscript(v.transcript));
        parts.push('```');
      }
      parts.push('');
    }
  }

  if (frames.length > 0) {
    parts.push(`## Reference frames (${frames.length})`);
    parts.push('Read the images below to extract visual style cues:');
    parts.push('');
    for (const f of frames) {
      parts.push(`- ${f.label} → ${f.serverPath}`);
    }
    parts.push('');
  }

  if (files.length > 0) {
    parts.push(`## User-uploaded files (${files.length})`);
    parts.push('');
    for (const f of files) {
      const sizeKb = f.size ? ` (${(f.size / 1024).toFixed(1)} KB)` : '';
      parts.push(`- ${f.label}${sizeKb} → ${f.serverPath}`);
    }
    parts.push('');
  }

  parts.push('Use the Read tool to inspect any image / file path listed above before answering.');
  parts.push('');

  return parts.join('\n');
}
