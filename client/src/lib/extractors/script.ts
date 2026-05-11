// Port từ v3 extractScriptBody (line 4561). Used by Stage 07 preview AND Stage 08 splitter.
export function extractScriptBody(text: string): string {
  if (!text) return '';

  let scriptStart = -1;

  // Strategy 1: level-2 / level-3 heading that is JUST "SCRIPT" (optional emoji/marker prefix, no " — Topic Title")
  const sectionHeadingRe = /^##{1,2}\s*(?:[^\w\s\n]+\s*)?SCRIPT\b(?!\s*[—\-–])[^\n]*$/im;
  const sectionMatch = text.match(sectionHeadingRe);
  if (sectionMatch && sectionMatch[0]) {
    scriptStart = text.indexOf(sectionMatch[0]) + sectionMatch[0].length;
  }

  // Strategy 2: first "### [PHẦN N" / "[LEVEL N" / "[PART N" / "[CHAPTER N"
  if (scriptStart === -1) {
    const phanRe = /^#{2,4}\s*\[?\s*(PHẦN|LEVEL|PART|CHAPTER)\s+\d+/im;
    const phanMatch = text.match(phanRe);
    if (phanMatch && phanMatch[0]) {
      scriptStart = text.indexOf(phanMatch[0]);
    }
  }

  // Strategy 3: no marker — assume whole text is body
  if (scriptStart === -1) return text;

  const endMarkers = /^#{1,3}\s*[^\n]*\b(NGUỒN|CHECKLIST|STATS|REFERENCES|SOURCES|TRÍCH DẪN|FINAL\s+STATS|TỔNG\s+KẾT|FOOTNOTES)/im;
  const tail = text.substring(scriptStart);
  const endMatch = tail.match(endMarkers);
  if (endMatch && endMatch[0]) {
    return tail.substring(0, tail.indexOf(endMatch[0]));
  }
  return tail;
}

export interface ScriptStructurePreview {
  bodyLength: number;
  fullLength: number;
  hasScriptHeading: boolean;
  wordCount: number;
  estMinutes: number;
  sections: string[];
}

export function previewScriptStructure(text: string): ScriptStructurePreview {
  const body = extractScriptBody(text);
  const sections = [...body.matchAll(/^#{2,4}\s*(.+?)$/gm)]
    .map((m) => (m[1] ?? '').replace(/^\[|\]$/g, '').trim())
    .filter((s) => s.length > 0 && s.length < 80);
  const wordCount = body.split(/\s+/).filter((w) => w.length > 0).length;
  return {
    bodyLength: body.length,
    fullLength: text.length,
    hasScriptHeading: body.length !== text.length,
    wordCount,
    estMinutes: Math.round(wordCount / 150),
    sections,
  };
}
