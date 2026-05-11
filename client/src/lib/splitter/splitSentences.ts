// Port từ v3 splitSentencesText (line 4691).
// Splits a paragraph into sentences with min/max char hints, protecting decimals,
// abbreviations, and timestamps from being split across.

const ABBREVS = [
  'Tp\\.', 'TP\\.', 'TS\\.', 'GS\\.', 'PGS\\.', 'ThS\\.', 'BS\\.', 'KS\\.',
  'Mr\\.', 'Mrs\\.', 'Dr\\.', 'St\\.', 'No\\.', 'vs\\.', 'etc\\.',
  'i\\.e\\.', 'e\\.g\\.', 'v\\.v\\.',
];

export function splitSentencesText(text: string, minChar: number, maxChar: number): string[] {
  let working = text;
  const protections: { ph: string; original: string }[] = [];

  // Decimals like 3.14 → 3<__DOT0__>14
  working = working.replace(/(\d)\.(\d)/g, (_, a: string, b: string) => {
    const ph = `__DOT${protections.length}__`;
    protections.push({ ph, original: '.' });
    return `${a}${ph}${b}`;
  });

  // Abbreviations
  for (const abbr of ABBREVS) {
    const re = new RegExp(abbr, 'gi');
    working = working.replace(re, (m) => {
      const ph = `__ABBR${protections.length}__`;
      protections.push({ ph, original: m });
      return ph;
    });
  }

  // Timestamps like 12:34
  working = working.replace(/\d{1,2}:\d{2}/g, (m) => {
    const ph = `__TIME${protections.length}__`;
    protections.push({ ph, original: m });
    return ph;
  });

  // Split on sentence-end punct followed by whitespace (also collapse trailing punct).
  working = working.replace(/([.!?…]+)\s+/g, '$1|||').replace(/([.!?…]+)$/g, '$1');
  let sentences = working.split('|||').map((s) => s.trim()).filter((s) => s.length > 0);

  // Restore protected segments
  sentences = sentences.map((s) => {
    let restored = s;
    for (const p of protections) {
      restored = restored.split(p.ph).join(p.original);
    }
    return restored;
  });

  // Merge short fragments into the previous sentence
  const merged: string[] = [];
  for (const s of sentences) {
    if (merged.length > 0 && s.length < minChar) {
      const last = merged[merged.length - 1];
      merged[merged.length - 1] = (last ?? '') + ' ' + s;
    } else {
      merged.push(s);
    }
  }
  sentences = merged;

  // Split overly-long sentences on commas
  const split: string[] = [];
  for (const s of sentences) {
    if (s.length > maxChar && s.includes(',')) {
      const parts = s.split(/,\s+/);
      let buffer = '';
      parts.forEach((part, i) => {
        if ((buffer + ' ' + part).length > maxChar && buffer.length >= minChar) {
          split.push((buffer + (i > 0 ? ',' : '')).trim());
          buffer = part;
        } else {
          buffer = buffer ? buffer + ', ' + part : part;
        }
      });
      if (buffer.trim()) split.push(buffer.trim());
    } else {
      split.push(s);
    }
  }
  return split.filter((s) => s.length > 0);
}
