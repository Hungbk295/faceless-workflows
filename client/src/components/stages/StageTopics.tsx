import { useMemo } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { DataGrid, type DataCell } from '../ui/DataGrid.tsx';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { topicsPrompt } from '../../lib/prompts/topics.ts';
import { extractPillars } from '../../lib/extractors/topics.ts';

interface Props {
  channel: ChannelDto;
}

export function StageTopics({ channel }: Props) {
  const updateMut = useUpdateChannel();
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:topics` });

  const pillars = useMemo(() => extractPillars(channel.topics), [channel.topics]);

  const saveTopics = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { topics: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu Topics', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const cells: DataCell[] = pillars.map((p, i) => ({
    label: `Pillar ${i + 1}`,
    value: <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15 }}>{p}</span>,
  }));

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 04', 'Topics File']}
        title={<>Topics <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>File</span></>}
        subtitle="24+ topics chia thành 3 pillars + Series concepts + Launch sequence + Topic scoring."
      />

      <Card label="Prompt" title="Topics Generation">
        <ClaudeRunPanel bridge={bridge} prompt={topicsPrompt(channel)} promptLabel="Prompt — Topics" />
      </Card>

      <Card label="Output capture" title="Paste Topics output">
        <OutputCapture
          label="Topics Output"
          value={channel.topics}
          onSave={saveTopics}
          saving={updateMut.isPending}
          minHeight={340}
          placeholder="Paste output từ Claude, hoặc click ▶ Run Claude..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setActiveStage('visual')}>
            Tiếp Stage 05 (Visual) →
          </Button>
        </div>
      </Card>

      {channel.topics.length > 100 && (
        <Card label="Auto-extracted" title={`Pillars detected: ${pillars.length}`}>
          {pillars.length === 0 ? (
            <p style={{ color: 'var(--crimson)' }}>
              ⚠️ Không detect được pillars. Heading phải dùng "### 🏠 PILLAR 1 — [TÊN]" hoặc "### PILLAR 1 — [TÊN]"
            </p>
          ) : (
            <DataGrid cells={cells} />
          )}
        </Card>
      )}
    </>
  );
}
