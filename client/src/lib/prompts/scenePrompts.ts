import type { ChannelDto } from 'shared';

/** Stage 10 — Scene Prompts (G-Labs Image + Veo3 Video). Port từ v3 PROMPTS.scenePrompts line 2334. */
export function scenePromptsPrompt(
  channel: ChannelDto,
  scenesBlock: string,
  inventoryBlock: string,
): string {
  return `You are a scene-by-scene visual prompt engineer following the SIX INGREDIENTS rule for image generation prompts: Subject + Context + Action + Camera + Aesthetic + Technical Constraints.

The character and location aesthetics are ALREADY DEFINED in the asset inventory (uploaded to G-Labs as Character01.png, Character02.png, Location01.png, etc.). Your prompts MUST use these placeholder IDs and stay SHORT — do NOT re-describe the aesthetic, palette, lighting style, or character details. The reference images carry that.

═══ CONTEXT ═══

Channel: ${channel.name}
Niche: ${channel.niche || ''}

═══ ASSET INVENTORY (USE THESE IDS — DO NOT INLINE DESCRIPTIONS) ═══

${inventoryBlock || '[Complete Stage 09 first to generate inventory]'}

═══ SCENE BREAKDOWN ═══

${scenesBlock || '[No scenes — complete Stage 08 first]'}

═══ TASK ═══

For every scene in the breakdown, produce TWO prompts back-to-back:

A) **G-LABS IMAGE PROMPT** — single short paragraph (40-80 words). Uses [Character0X] and [Location0X] placeholders. Reference image carries aesthetic — your prompt only adds: shot type, action, atmosphere modifier.

B) **VEO3 VIDEO PROMPT** — single short paragraph (40-90 words) describing motion only. Tagged with source image filename (e.g. [001.png]).

═══ G-LABS IMAGE PROMPT — TEMPLATE ═══

CHARACTER + LOCATION SHOT:
  "A [wide / medium / close-up / detail] shot captures [Character0X] at [Location0X] as [action ≤ 20 words]. [optional 1-sentence atmosphere modifier ≤ 12 words]. NO TEXT NO WORDS on image."

CLOSE-UP (add consistency reminder):
  "MAINTAIN CHARACTER CONSISTENCY IN CLOSE-UP — keep proportions, same eye style, same outline weight as reference, do NOT switch to realistic proportions. A close-up on [Character0X] at [Location0X] as [action ≤ 18 words]. NO TEXT NO WORDS on image."

LOCATION ONLY / B-ROLL:
  "A [wide / detail / overhead] shot of [Location0X] showing [environmental detail ≤ 18 words]. NO characters NO people. NO TEXT NO WORDS on image."

CRITICAL: DO NOT include the channel's aesthetic description. The reference image handles all of that. Keep prompts SHORT.

═══ VEO3 VIDEO PROMPT — TEMPLATE ═══

Format (single paragraph, ~50-90 words):

"[Scene N | shot type | duration] [filename.png] [Subject motion 1 sentence]. [Camera motion: subtle 5% push-in over Xs / STATIC / slow pan left over Xs / etc]. [Ambient sound 1 sentence]. [Mood word + descriptor]. preserve character and background from reference image exactly."

Header conventions:
  - Scene number same as image scene number
  - Duration: 3s if VO ≤ 3s, 5s if VO 3-6s, 8s if VO > 6s
  - Filename: zero-padded 3-digit format: 001.png, 002.png, ...

═══ OUTPUT FORMAT (STRICT — app parser depends on these headings) ═══

For EVERY scene, output exactly:

## SCENE [###] | [LEVEL] | [Xs] | [Character0X] @ [Location0X]

### G-LABS IMAGE PROMPT
[Single short paragraph — 40-80 words]

### VEO3 VIDEO PROMPT
[Single paragraph — opens with [Scene N | shot type | Xs] [###.png]]

### SHOT NOTES
- **Shot type:** [wide / medium / close-up / detail / B-roll]
- **Emotional beat:** [opening / build / reveal / climax / cooldown]
- **Cuts to next:** [hard cut / dissolve / match cut / continuous]

═══ CRITICAL RULES ═══

1. **NO aesthetic blob.** Reference image carries this. Prompts must be SHORT.
2. **Always use [Character0X] / [Location0X] placeholders.** Never inline a character description.
3. **Image prompt ≤ 80 words.**
4. **Veo3 prompt MUST open with [Scene N | shot | duration] [###.png]**.
5. **Scene numbering matches image filenames:** Scene 1 → 001.png, padded to 3 digits.
6. **Camera variety:** do not repeat the exact same shot type more than 3 scenes in a row.
7. **Output every single scene from the breakdown.** No skipping.

Begin.`;
}
