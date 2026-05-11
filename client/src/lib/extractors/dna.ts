import type { ValidationItem } from '../../components/ui/ValidationChecklist.tsx';

export interface TitleFormula {
  label: string;
  name: string;
}

// Port từ v3 line 3173 — extractTitleFormulas
export function extractTitleFormulas(dna: string): TitleFormula[] {
  if (!dna) return [];
  const matches = [...dna.matchAll(/###\s*Formula\s+([A-Z])\s*[—\-–]\s*(.+)/g)];
  return matches.map((m) => ({
    label: 'Formula ' + (m[1] ?? ''),
    name: (m[2] ?? '').trim(),
  }));
}

// Port từ v3 line 3188 — validateDNA. Returns checklist items consumable by ValidationChecklist.
export function validateDNA(dna: string): ValidationItem[] {
  return [
    { label: 'Có 7 sections (## headings)', ok: (dna.match(/^##\s/gm) || []).length >= 7 },
    { label: 'Có 5 Title Formulas (### Formula A-E)', ok: extractTitleFormulas(dna).length >= 5 },
    { label: 'Có Hook Types (≥3)', ok: (dna.match(/###\s*Hook Type/gi) || []).length >= 3 },
    {
      label: 'Có Differentiation table',
      ok: dna.includes('DIFFERENTIATION') || dna.includes('Differentiation'),
    },
    {
      label: 'Có Protagonist section',
      ok: dna.includes('PROTAGONIST') || dna.includes('Protagonist'),
    },
    { label: 'Length > 2000 chars', ok: dna.length > 2000 },
  ];
}
