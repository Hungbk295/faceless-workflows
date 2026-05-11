import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { toast } from '../../store/toast.ts';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useScripts } from '../../hooks/useScripts.ts';
import { metadataPrompt, DEFAULT_METADATA_PARAMS, type MetadataParams } from '../../lib/prompts/metadata.ts';

interface Props {
  channel: ChannelDto;
}

const PILLARS = ['P1', 'P2', 'P3'];

export function StageMetadata({ channel }: Props) {
  const updateMut = useUpdateChannel();
  const scriptsQ = useScripts(channel.id);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:metadata` });

  const scripts = scriptsQ.data ?? [];
  const activeScript = scripts.find((s) => s.id === channel.currentScriptId) ?? scripts[0] ?? null;

  const [params, setParams] = useState<MetadataParams>(() => ({
    ...DEFAULT_METADATA_PARAMS,
    topic: activeScript?.topic ?? '',
    pillar: activeScript?.pillar ?? 'P1',
    script: activeScript?.scriptText ?? '',
  }));

  useEffect(() => {
    if (activeScript) {
      setParams((p) => ({
        ...p,
        topic: p.topic || activeScript.topic,
        pillar: p.pillar || activeScript.pillar,
        script: p.script || activeScript.scriptText,
      }));
    }
  }, [activeScript]);

  const prompt = useMemo(() => metadataPrompt(channel, params), [channel, params]);

  const saveOutput = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { metadata: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu metadata', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const switchScript = (id: string) => {
    const s = scripts.find((x) => x.id === id);
    if (!s) return;
    setParams({
      ...params,
      topic: s.topic,
      pillar: s.pillar,
      script: s.scriptText,
    });
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 13', 'Video Metadata']}
        title={<>Video <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Metadata</span></>}
        subtitle="Title (5 options A/B test) + description + tags + pinned comment + end screens + SEO analysis."
      />

      <Card label="Step 01" title="Inputs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Input
            label="Topic"
            value={params.topic}
            onChange={(e) => setParams({ ...params, topic: e.target.value })}
          />
          <Select
            label="Pillar"
            value={params.pillar}
            onChange={(e) => setParams({ ...params, pillar: e.target.value })}
          >
            {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          {scripts.length > 0 && (
            <Select
              label="Load from script"
              value={activeScript?.id ?? ''}
              onChange={(e) => switchScript(e.target.value)}
            >
              <option value="">— select —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.topic} ({s.scriptText.length}c)</option>
              ))}
            </Select>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
          Script auto-loaded ({params.script.length}c — chỉ 6000c đầu được inject vào prompt). Edit topic/pillar nếu cần.
        </p>
      </Card>

      <Card label="Step 02" title="Metadata Prompt">
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — YouTube Metadata" />
      </Card>

      <Card label="Step 03" title="Output">
        <OutputCapture
          label="Metadata"
          value={channel.metadata}
          onSave={saveOutput}
          saving={updateMut.isPending}
          minHeight={400}
          placeholder="Paste output Claude, hoặc click ▶ Run Claude..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
      </Card>
    </>
  );
}
