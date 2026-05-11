import { randomUUID } from 'node:crypto';
import type { ClaudeRunResult } from 'shared';

export type { ClaudeRunResult };

export interface RunClaudeOpts {
  prompt: string;
  sessionId?: string;
  signal?: AbortSignal;
}

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const PERMISSION_MODE = process.env.BRIDGE_PERMISSION_MODE || 'bypassPermissions';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'opus';

interface ClaudeJsonResponse {
  result?: string;
  session_id?: string;
  duration_ms?: number;
  total_cost_usd?: number;
  usage?: unknown;
  is_error?: boolean;
  error?: string;
}

export async function runClaude(opts: RunClaudeOpts): Promise<ClaudeRunResult> {
  const { prompt, sessionId: incomingSessionId, signal } = opts;
  const sessionId = incomingSessionId ?? randomUUID();

  const args = [
    '-p',
    '--model', CLAUDE_MODEL,
    '--permission-mode', PERMISSION_MODE,
    '--output-format', 'json',
    '--input-format', 'text',
  ];
  if (incomingSessionId) {
    args.push('--resume', incomingSessionId);
  } else {
    args.push('--session-id', sessionId);
  }

  const start = Date.now();
  const proc = Bun.spawn([CLAUDE_BIN, ...args], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const onAbort = () => { try { proc.kill('SIGTERM'); } catch { /* ignore */ } };
  signal?.addEventListener('abort', onAbort);

  try {
    proc.stdin.write(prompt);
    await proc.stdin.end();

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (signal?.aborted) {
      throw new Error('claude aborted');
    }

    if (exitCode !== 0) {
      const msg = stderr.trim() || `claude exited with code ${exitCode}`;
      throw new Error(msg);
    }

    let parsed: ClaudeJsonResponse;
    try {
      parsed = JSON.parse(stdout) as ClaudeJsonResponse;
    } catch {
      throw new Error(`claude output not JSON: ${stdout.slice(0, 200)}`);
    }

    if (parsed.is_error) {
      throw new Error(parsed.error || parsed.result || 'claude returned is_error=true');
    }

    return {
      output: parsed.result ?? '',
      sessionId: parsed.session_id ?? sessionId,
      durationMs: parsed.duration_ms ?? (Date.now() - start),
      costUsd: parsed.total_cost_usd ?? 0,
      usage: parsed.usage ?? null,
    };
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
