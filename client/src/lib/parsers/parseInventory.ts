// Port từ v3 parseInventory line 5028. Returns parsed characters + locations
// from Claude's asset inventory output.

export interface ParsedAsset {
  refId: string;          // 'Character01' | 'Location01'
  label: string;
  prompt: string;
}

export interface ParsedInventory {
  characters: ParsedAsset[];
  locations: ParsedAsset[];
}

const charRe = /###\s+Character(\d+)\s*[—\-–]\s*([^\n]+)[\s\S]*?```(?:prompt|text)?\s*\n([\s\S]*?)\n```/g;
const locRe  = /###\s+Location(\d+)\s*[—\-–]\s*([^\n]+)[\s\S]*?```(?:prompt|text)?\s*\n([\s\S]*?)\n```/g;

export function parseInventory(text: string): ParsedInventory {
  const characters: ParsedAsset[] = [];
  const locations: ParsedAsset[] = [];

  charRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = charRe.exec(text)) !== null) {
    if (!m[1] || !m[2] || !m[3]) continue;
    characters.push({
      refId: 'Character' + m[1].padStart(2, '0'),
      label: m[2].trim(),
      prompt: m[3].trim(),
    });
  }

  locRe.lastIndex = 0;
  while ((m = locRe.exec(text)) !== null) {
    if (!m[1] || !m[2] || !m[3]) continue;
    locations.push({
      refId: 'Location' + m[1].padStart(2, '0'),
      label: m[2].trim(),
      prompt: m[3].trim(),
    });
  }

  return { characters, locations };
}
