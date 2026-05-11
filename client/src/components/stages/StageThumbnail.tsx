import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useScripts } from '../../hooks/useScripts.ts';
import { thumbnailPrompt, DEFAULT_THUMBNAIL_PARAMS, type ThumbnailParams } from '../../lib/prompts/thumbnail.ts';

interface Props {
  channel: ChannelDto;
}

const PILLARS = ['P1', 'P2', 'P3'];

export function StageThumbnail({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const updateMut = useUpdateChannel();
  const scriptsQ = useScripts(channel.id);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:thumbnail` });

  const activeScript = scriptsQ.data?.find((s) => s.id === channel.currentScriptId)
    ?? scriptsQ.data?.[0];

  const [params, setParams] = useState<ThumbnailParams>(() => ({
    ...DEFAULT_THUMBNAIL_PARAMS,
    title: activeScript?.topic ?? '',
    pillar: activeScript?.pillar ?? 'P1',
  }));

  useEffect(() => {
    if (activeScript) {
      setParams((p) => ({
        ...p,
        title: p.title || activeScript.topic,
        pillar: p.pillar || activeScript.pillar,
      }));
    }
  }, [activeScript]);

  const prompt = useMemo(() => thumbnailPrompt(channel, params), [channel, params]);

  const saveOutput = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { thumbnails: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu thumbnail concepts', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 12', 'Thumbnail']}
        title={<>Thumbnail <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Concepts</span></>}
        subtitle="3 concept variations với G-Labs prompt + text overlay design + CTR prediction."
      />

      <Card label="Step 01" title="Inputs cho thumbnail">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Topic title"
            value={params.title}
            onChange={(e) => setParams({ ...params, title: e.target.value })}
          />
          <Input
            label="Key insight (cái shock)"
            value={params.insight}
            onChange={(e) => setParams({ ...params, insight: e.target.value })}
          />
          <Select
            label="Pillar"
            value={params.pillar}
            onChange={(e) => setParams({ ...params, pillar: e.target.value })}
          >
            {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input
            label="Số liệu shock"
            value={params.number}
            onChange={(e) => setParams({ ...params, number: e.target.value })}
            placeholder="1.000.000đ / 99% / ..."
          />
        </div>
      </Card>

      <Card label="Step 02" title="Thumbnail Generation Prompt">
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — 3 Thumbnail Concepts" />
      </Card>

      <Card label="Step 03" title="Output">
        <OutputCapture
          label="Thumbnail Concepts"
          value={channel.thumbnails}
          onSave={saveOutput}
          saving={updateMut.isPending}
          minHeight={340}
          placeholder="Paste output Claude, hoặc click ▶ Run Claude..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setActiveStage('metadata')}>
            Tiếp Stage 13 (Metadata) →
          </Button>
        </div>
      </Card>
    </>
  );
}
