// Port từ v3 extractTopicsFromMarkdown (line 3615).
// Parses markdown topic tables of the shape:
// | # | Chủ đề | Title (Formula) | Hook câu đầu | Góc kể unique | Pillar | Score CTR /50 |

export interface ParsedTopic {
  num: number;
  subject: string;
  title: string;
  hook: string;
  angle: string;
  pillar: string;
  format: string;
  score: string;
}

type ColKey = 'num' | 'subject' | 'title' | 'hook' | 'angle' | 'pillar' | 'score' | 'format';
type ColumnMap = Partial<Record<ColKey, number>>;

function clean(s: string): string {
  return s
    .replace(/^\*+|\*+$/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

export function parseTopicGenOutput(text: string): ParsedTopic[] {
  const topics: ParsedTopic[] = [];
  const lines = text.split('\n');

  let inTable = false;
  let columnMap: ColumnMap | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      if (inTable && trimmed === '') {
        inTable = false;
        columnMap = null;
      }
      continue;
    }

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;

    const lower = cells.map((c) => c.toLowerCase());

    if (
      !columnMap
      && (lower.some((c) => c.includes('chủ đề') || c.includes('topic'))
        || lower.some((c) => c.includes('title')))
    ) {
      const map: ColumnMap = {};
      cells.forEach((c, i) => {
        const cl = c.toLowerCase();
        if (cl.includes('#') || cl === 'no') map.num = i;
        else if (cl.includes('chủ đề') || cl.includes('topic')) map.subject = i;
        else if (cl.includes('title')) map.title = i;
        else if (cl.includes('hook')) map.hook = i;
        else if (cl.includes('góc') || cl.includes('angle') || cl.includes('unique')) map.angle = i;
        else if (cl.includes('pillar')) map.pillar = i;
        else if (cl.includes('score') || cl.includes('ctr')) map.score = i;
        else if (cl.includes('dạng') || cl.includes('format') || cl.includes('type')) map.format = i;
      });
      columnMap = map;
      inTable = true;
      continue;
    }

    if (trimmed.match(/^\|[\s\-:]+\|/)) continue;
    if (!columnMap || !inTable) continue;

    const get = (key: ColKey): string => {
      const idx = columnMap?.[key];
      if (idx === undefined) return '';
      return cells[idx] ?? '';
    };

    const numCell = get('num').replace(/[^\d]/g, '');
    const title = clean(get('title'));
    const subject = clean(get('subject'));
    if (!numCell && !subject && !title) continue;
    if (!title && !subject) continue;

    topics.push({
      num: numCell ? parseInt(numCell, 10) : topics.length + 1,
      subject,
      title,
      hook: clean(get('hook')),
      angle: clean(get('angle')),
      pillar: clean(get('pillar')),
      format: clean(get('format')),
      score: clean(get('score')),
    });
  }

  return topics;
}
