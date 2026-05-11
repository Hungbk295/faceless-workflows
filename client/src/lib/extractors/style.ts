// Port từ v3 line 3271 — extractVoiceRulesBlock.
// Matches the first ``` fenced block that contains "VOICE RULES".
export function extractVoiceRulesBlock(style: string): string | null {
  if (!style) return null;
  const match = style.match(/```[a-z]*\s*\n([\s\S]*?VOICE RULES[\s\S]*?)\n```/i);
  return match && match[1] ? match[1].trim() : null;
}
