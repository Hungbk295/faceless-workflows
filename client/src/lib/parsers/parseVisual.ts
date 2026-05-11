// Port từ v3 parseVisualOutput (line 3454).
// Returns 4 prompts in order [charStyle, bgStyle, sceneStyle, styleRef] or null when fewer than 4 fenced blocks were found.

export interface ParsedVisualPrompts {
  charStyle: string;
  bgStyle: string;
  sceneStyle: string;
  styleRef: string;
  totalBlocks: number;
}

export function parseVisualOutput(text: string): ParsedVisualPrompts | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const blocks = [...trimmed.matchAll(/```(?:prompt|text)?\s*\n([\s\S]*?)\n```/g)]
    .map((m) => (m[1] ?? '').trim());

  if (blocks.length < 4) {
    return blocks.length > 0
      ? {
          charStyle: blocks[0] ?? '',
          bgStyle: blocks[1] ?? '',
          sceneStyle: blocks[2] ?? '',
          styleRef: blocks[3] ?? '',
          totalBlocks: blocks.length,
        }
      : null;
  }

  return {
    charStyle: blocks[0] ?? '',
    bgStyle: blocks[1] ?? '',
    sceneStyle: blocks[2] ?? '',
    styleRef: blocks[3] ?? '',
    totalBlocks: blocks.length,
  };
}
