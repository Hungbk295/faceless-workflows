import type { ChannelDto } from 'shared';

// Port từ v3 line 3339 — extractPillars.
// Matches: "### 🏠 PILLAR 1 — TÊN" or "### PILLAR 1 — TÊN".
export function extractPillars(topics: string): string[] {
  if (!topics) return [];
  const matches = [...topics.matchAll(/###\s*[^\n]*PILLAR\s*\d+\s*[—\-–]\s*([^(\n]+)/gi)];
  return matches.map((m) => (m[1] ?? '').trim().replace(/\(\d+%\)/, '').trim());
}

// Port từ v3 line 3347. 1-based index, fallback "Pillar N".
export function getPillarName(ch: Pick<ChannelDto, 'topics'> | null, idx: number): string {
  const pillars = extractPillars(ch?.topics ?? '');
  if (idx >= 1 && idx <= pillars.length) {
    const name = pillars[idx - 1];
    if (name) return name;
  }
  return `Pillar ${idx}`;
}

// Port từ v3 line 3354. Always returns 3 names with fallbacks.
export function getAllPillarNames(ch: Pick<ChannelDto, 'topics'> | null): [string, string, string] {
  const pillars = extractPillars(ch?.topics ?? '');
  return [
    pillars[0] ?? 'Pillar 1',
    pillars[1] ?? 'Pillar 2',
    pillars[2] ?? 'Pillar 3',
  ];
}

// Port từ v3 line 3360. Converts "P1"/"P2"/"P3" → real name; passes through otherwise.
export function pillarLabelToName(ch: Pick<ChannelDto, 'topics'> | null, label: string): string {
  if (!label) return '';
  const m = label.match(/^P(\d)$/i);
  if (m && m[1]) return getPillarName(ch, parseInt(m[1], 10));
  return label;
}
