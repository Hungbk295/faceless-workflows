import { PromptBlock } from './PromptBlock.tsx';
import { Button } from './Button.tsx';
import type { UseClaudeBridgeReturn } from '../../hooks/useClaudeBridge.ts';

interface Props {
  bridge: UseClaudeBridgeReturn;
  prompt: string;
  promptLabel: string;
  /** Disable Run button (e.g. prerequisite missing). */
  disabledReason?: string;
  /** Override what runs when user clicks the button. Default: bridge.run(prompt). */
  onRun?: () => void;
}

/**
 * Wraps PromptBlock + status / error / interrupted banners in one panel.
 * Stage components stay tiny — they just provide the prompt + render this.
 */
export function ClaudeRunPanel({ bridge, prompt, promptLabel, disabledReason, onRun }: Props) {
  const isLoading = bridge.status === 'loading';
  const elapsedSec = Math.floor(bridge.elapsedMs / 1000);

  const handleRun = onRun ?? (() => {
    if (isLoading) bridge.abort();
    else void bridge.run(prompt);
  });

  return (
    <>
      <PromptBlock
        label={promptLabel}
        prompt={prompt}
        onRunClaude={disabledReason ? undefined : handleRun}
        runLabel={isLoading ? 'Stop' : 'Run Claude'}
      />
      {disabledReason && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
          ⚠ {disabledReason}
        </div>
      )}
      {isLoading && (
        <div style={{ marginTop: 12, padding: 10, background: 'var(--paper-2)', borderLeft: '3px solid var(--olive)', fontSize: 13 }}>
          ⏳ Đang chạy claude… {elapsedSec}s (có thể mất vài phút khi cần web search)
        </div>
      )}
      {bridge.error && (
        <div style={{ marginTop: 12, padding: 10, background: 'var(--paper-2)', borderLeft: '3px solid var(--rust)', fontSize: 13 }}>
          <strong>Bridge error:</strong> {bridge.error}
        </div>
      )}
      {bridge.wasInterrupted && (
        <div style={{ marginTop: 12, padding: 10, background: 'var(--paper-2)', borderLeft: '3px solid var(--gold)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>⏸ Run trước bị interrupt (refresh giữa chừng).</span>
          <Button variant="ghost" onClick={bridge.dismissInterrupted}>OK</Button>
          <Button variant="ghost" onClick={bridge.reset}>Reset</Button>
        </div>
      )}
      {bridge.status === 'done' && bridge.durationMs != null && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
          ✓ Done in {(bridge.durationMs / 1000).toFixed(1)}s
          {bridge.costUsd != null && bridge.costUsd > 0 && <> · ${bridge.costUsd.toFixed(4)}</>}
          {bridge.sessionId && <> · session <code>{bridge.sessionId.slice(0, 8)}</code></>}
          <Button variant="ghost" onClick={bridge.reset} style={{ marginLeft: 12 }}>Clear</Button>
        </div>
      )}
    </>
  );
}
