import { useMemo } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { PromptBlock } from '../ui/PromptBlock.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { stylePrompt } from '../../lib/prompts/style.ts';
import { extractVoiceRulesBlock } from '../../lib/extractors/style.ts';

interface Props {
  channel: ChannelDto;
}

export function StageStyle({ channel }: Props) {
  const updateMut = useUpdateChannel();
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:style` });

  const dnaReady = channel.dna.length > 500;
  const voiceBlock = useMemo(() => extractVoiceRulesBlock(channel.style), [channel.style]);

  const saveStyle = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { style: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu Style Guide', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 03', 'Style Guide']}
        title={<>Style <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Guide</span></>}
        subtitle="Voice rules + benchmark passages + thumbnail rules. Đặc biệt mục 3 (Voice Rules Block) sẽ paste vào Claude khi viết script."
      />

      {!dnaReady && (
        <Card label="Heads up" title="Cần làm DNA trước">
          <p>
            Style Guide build dựa trên DNA. Vui lòng{' '}
            <a
              href="#dna"
              onClick={(e) => {
                e.preventDefault();
                setActiveStage('dna');
              }}
              style={{ color: 'var(--rust)', textDecoration: 'underline' }}
            >
              làm Stage 02 (DNA)
            </a>{' '}
            trước.
          </p>
        </Card>
      )}

      <Card label="Prompt" title="Style Guide Generation">
        <p>
          Prompt đã tự inject DNA của bạn ({channel.dna.length} chars). Claude sẽ tạo Style
          Guide nhất quán với DNA.
        </p>
        <ClaudeRunPanel
          bridge={bridge}
          prompt={stylePrompt(channel)}
          promptLabel="Prompt — Style Guide"
          disabledReason={dnaReady ? undefined : 'Cần làm DNA (Stage 02) trước'}
        />
      </Card>

      <Card label="Output capture" title="Paste Style Guide output">
        <OutputCapture
          label="Style Guide Output"
          value={channel.style}
          onSave={saveStyle}
          saving={updateMut.isPending}
          minHeight={340}
          placeholder="Paste output từ Claude, hoặc click ▶ Run Claude..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setActiveStage('topics')}>
            Tiếp Stage 04 (Topics) →
          </Button>
        </div>
      </Card>

      {channel.style.length > 100 && (
        <Card label="Auto-extracted" title="Voice Rules Block (paste vào Tool Script Writer)">
          {!voiceBlock ? (
            <p style={{ color: 'var(--crimson)' }}>
              ⚠️ Không detect được Voice Rules Block. Style Guide phải có block ``` chứa "VOICE RULES"
            </p>
          ) : (
            <>
              <p>Block này paste vào system prompt khi viết script:</p>
              <PromptBlock label="Voice Rules Block" prompt={voiceBlock} />
            </>
          )}
        </Card>
      )}
    </>
  );
}
