// Port từ v3 parseScenePrompts line 5229. Splits Claude output into image + video prompt items.

export interface ParsedScenePrompt {
  num: number;
  level: string;
  character: string;
  location: string;
  prompt: string;
}

export interface ParsedScenePrompts {
  imagePrompts: ParsedScenePrompt[];
  videoPrompts: ParsedScenePrompt[];
}

export function parseScenePrompts(text: string): ParsedScenePrompts {
  const imagePrompts: ParsedScenePrompt[] = [];
  const videoPrompts: ParsedScenePrompt[] = [];

  // Split by "## SCENE NNN" headings (lookahead so heading stays in block).
  const blocks = text.split(/(?=^##\s*SCENE\s+\d+)/m);

  for (const block of blocks) {
    const headerMatch = block.match(
      /^##\s*SCENE\s+(\d+)\s*\|\s*([^|]+?)\s*\|\s*\d+s(?:\s*\|\s*([^@\n]+?)(?:\s*@\s*([^\n]+))?)?/i,
    );
    if (!headerMatch || !headerMatch[1]) continue;

    const num = parseInt(headerMatch[1], 10);
    const level = (headerMatch[2] ?? '').trim();
    const character = (headerMatch[3] ?? '').trim();
    const location = (headerMatch[4] ?? '').trim();

    const imgMatch = block.match(/###\s*G-LABS\s+IMAGE\s+PROMPT\s*\n+([\s\S]*?)(?=\n###|\n##|$)/i);
    if (imgMatch && imgMatch[1]) {
      imagePrompts.push({ num, level, character, location, prompt: imgMatch[1].trim() });
    }

    const vidMatch = block.match(/###\s*VEO3?\s+VIDEO\s+PROMPT\s*\n+([\s\S]*?)(?=\n###|\n##|$)/i);
    if (vidMatch && vidMatch[1]) {
      videoPrompts.push({ num, level, character, location, prompt: vidMatch[1].trim() });
    }
  }

  imagePrompts.sort((a, b) => a.num - b.num);
  videoPrompts.sort((a, b) => a.num - b.num);

  return { imagePrompts, videoPrompts };
}
