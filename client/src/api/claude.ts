import type { ClaudeRunResult } from 'shared';

export interface RunClaudeOpts {
  prompt: string;
  sessionId?: string;
  signal?: AbortSignal;
}

export async function runClaude(opts: RunClaudeOpts): Promise<ClaudeRunResult> {
  const res = await fetch('/api/claude/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: opts.prompt, sessionId: opts.sessionId }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<ClaudeRunResult>;
}
