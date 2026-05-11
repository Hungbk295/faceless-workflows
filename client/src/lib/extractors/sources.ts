// Port từ v3 extractSources (line 4601). Reads "## NGUỒN TRÍCH DẪN" /
// "## SOURCES" / "## REFERENCES" section then parses each numbered item.

export interface SourceItem {
  num: number;
  title: string;
  url: string;
  raw: string;
}

export function extractSources(text: string): SourceItem[] {
  if (!text) return [];

  const sectionRe = /^#{1,3}\s*[^\n]*\b(NGUỒN(?:\s*TRÍCH\s*DẪN)?|SOURCES|REFERENCES|TRÍCH\s*DẪN)\b[^\n]*$/im;
  const m = text.match(sectionRe);
  if (!m || !m[0]) return [];

  const start = text.indexOf(m[0]) + m[0].length;
  const tail = text.substring(start);

  const nextHeading = tail.match(/^##\s+\S/m);
  const body = nextHeading && nextHeading[0]
    ? tail.substring(0, tail.indexOf(nextHeading[0]))
    : tail;

  const sources: SourceItem[] = [];
  const lines = body.split('\n');
  let current: SourceItem | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (current) { sources.push(current); current = null; }
      continue;
    }

    const numMatch = t.match(/^(\d+)[\.\)]\s+(.+)/);
    if (numMatch && numMatch[1] && numMatch[2]) {
      if (current) sources.push(current);
      let body = numMatch[2].replace(/\*\*(.*?)\*\*/g, '$1');

      const urlMatch = body.match(/(https?:\/\/[^\s\)\]]+)/);
      const url = urlMatch && urlMatch[1] ? urlMatch[1] : '';

      let title = body;
      if (urlMatch && urlMatch[0]) {
        title = body.substring(0, body.indexOf(urlMatch[0])).replace(/[—–\-\(\[]\s*$/, '').trim();
      }
      const linkMatch = title.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && linkMatch[1]) {
        title = linkMatch[1];
      }

      current = {
        num: parseInt(numMatch[1], 10),
        title: title.trim(),
        url,
        raw: body.trim(),
      };
    } else if (current && t.startsWith('-')) {
      current.raw += ' · ' + t.replace(/^[-•]\s*/, '');
    } else if (current) {
      current.raw += ' ' + t;
      const urlMatch = t.match(/(https?:\/\/[^\s\)\]]+)/);
      if (urlMatch && urlMatch[1] && !current.url) current.url = urlMatch[1];
    }
  }
  if (current) sources.push(current);

  return sources;
}

// Port từ v3 extractResearch (line 4673)
export function extractResearch(text: string): string | null {
  if (!text) return null;

  const sectionRe = /^#{1,3}\s*[^\n]*\bRESEARCH(?:\s*PHASE)?\b[^\n]*$/im;
  const m = text.match(sectionRe);
  if (!m || !m[0]) return null;

  const start = text.indexOf(m[0]) + m[0].length;
  const tail = text.substring(start);

  const stopRe = /^##\s+(?:🎬\s*)?(SCRIPT|OUTLINE|🗺|NGUỒN|SOURCES|CHECKLIST)/im;
  const stopMatch = tail.match(stopRe);
  const body = stopMatch && stopMatch[0] ? tail.substring(0, tail.indexOf(stopMatch[0])) : tail;

  return body.trim();
}
