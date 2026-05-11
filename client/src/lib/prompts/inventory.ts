import type { ChannelDto } from 'shared';

/** Stage 09 — Asset Inventory. Port từ v3 PROMPTS.inventory line 2216. */
export function inventoryPrompt(channel: ChannelDto, scriptText: string): string {
  const v = (channel as unknown as { visual?: { charStyle?: string; bgStyle?: string; sceneStyle?: string } }).visual;
  return `You are a visual production analyst for faceless YouTube videos. Analyze a script and produce an ASSET INVENTORY — a complete list of every unique character and every unique location, each with a fully-formed image generation prompt that references the channel's visual identity.

═══ CONTEXT ═══

- Channel: ${channel.name}
- Niche: ${channel.niche || '[NICHE]'}
- Language: ${channel.lang || 'vi'}

═══ VISUAL IDENTITY (from Stage 05) ═══

The channel has 4 master visual prompts already defined:

[charStyle — protagonist identity]
${v?.charStyle || '[NOT YET DEFINED — please complete Stage 05 first]'}

[bgStyle — background language]
${v?.bgStyle || '[NOT YET DEFINED]'}

[sceneStyle — universal aesthetic, ~40 words, applied to every frame]
${v?.sceneStyle || '[NOT YET DEFINED]'}

═══ SCRIPT TO ANALYZE ═══

\`\`\`
${scriptText || '[PASTE SCRIPT — paste full script with section headings]'}
\`\`\`

═══ TASK ═══

Step 1 — Read the script carefully. Identify EVERY unique character mentioned, including:
- The protagonist (always Character01)
- Any supporting characters mentioned by name or role (neighbors, family members, experts, historical figures, case-study people, etc.)
- Any character that appears in 2+ scenes deserves a unique ID

Step 2 — Identify EVERY unique location/setting where action takes place:
- The first/main location is always Location01
- Each new physical setting gets the next ID
- Distinct lighting moods of the same place can be one location with note

Step 3 — For each Character and each Location, write a self-contained image generation prompt that:
- Inherits the universal aesthetic (sceneStyle)
- Inherits the visual language from charStyle (for characters) or bgStyle (for locations)
- Differentiates this specific entity from others
- Ends with a reference-sheet structure

═══ OUTPUT FORMAT (STRICT — app will parse this) ═══

# ASSET INVENTORY

## CHARACTERS

### Character01 — [name or role label]
**Role in story:** [protagonist / supporting / cameo]
**Appears in scenes:** [scene numbers or "throughout"]

\`\`\`prompt
[Full image-generation prompt for Character01, 80-130 words.
- Open with the universal aesthetic from sceneStyle
- Describe age, body proportions, skin tone, face, hair, eyes
- Describe clothing and signature accessories specific to THIS character
- End with reference sheet layout (TOP ROW 4 angles full-body; BOTTOM ROW 6 expression close-ups). pure white background. NO TEXT NO WORDS on image.]
\`\`\`

### Character02 — [name or role label]
[same structure]

[... continue for ALL unique characters detected]

## LOCATIONS

### Location01 — [setting label]
**Description:** [one-sentence summary]
**Appears in scenes:** [scene numbers]

\`\`\`prompt
[Full image-generation prompt for Location01, 70-120 words. End with 4-camera × 2-lighting reference sheet. NO characters NO people NO text NO words. cinematic 16:9 composition.]
\`\`\`

[... continue for ALL unique locations]

## SUMMARY TABLE

| ID | Type | Label | First scene | Total scenes |
|---|---|---|---|---|

## SCENE → ASSET MAP

| Scene # | Character(s) | Location |
|---|---|---|

═══ CRITICAL RULES ═══

1. EVERY character/location code block MUST be wrapped in \`\`\`prompt ... \`\`\` — the app parses these.
2. Heading format MUST be \`### Character0X — [label]\` and \`### Location0X — [label]\` (with em-dash).
3. Numbering is sequential starting from 01, never skip.
4. Same character in different lighting/outfit = SAME ID.
5. Background-only scenes → assign Location0X but leave character cell empty in the map.
6. The Scene → Asset Map MUST cover every scene number.

Begin.`;
}
