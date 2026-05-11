export interface ClaudeRunResult {
  output: string;
  sessionId: string;
  durationMs: number;
  costUsd: number;
  usage: unknown;
}
