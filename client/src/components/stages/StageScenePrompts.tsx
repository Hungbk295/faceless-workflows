import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useScenes } from '../../hooks/useScenes.ts';
import { useInventory } from '../../hooks/useInventory.ts';
import {
  useScenePrompts,
  useReplaceScenePrompts,
  useAppendScenePrompts,
  useClearScenePrompts,
} from '../../hooks/useScenePrompts.ts';
import { scenePromptsPrompt } from '../../lib/prompts/scenePrompts.ts';
import { parseScenePrompts } from '../../lib/parsers/parseScenePrompts.ts';

interface Props {
  channel: ChannelDto;
}

type Tab = 'image' | 'video';

export function StageScenePrompts({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const scenesQ = useScenes(channel.id);
  const invQ = useInventory(channel.id);
  const spQ = useScenePrompts(channel.id);
  const replaceMut = useReplaceScenePrompts(channel.id);
  const appendMut = useAppendScenePrompts(channel.id);
  const clearMut = useClearScenePrompts(channel.id);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:scene-prompts` });

  const scenes = scenesQ.data ?? [];
  const inv = invQ.data;
  const sp = spQ.data;

  const [output, setOutput] = useState('');
  const [tab, setTab] = useState<Tab>('image');

  const inventoryBlock = useMemo(() => {
    if (!inv) return '';
    const parts: string[] = [];
    if (inv.characters.length) {
      parts.push('## CHARACTERS');
      for (const c of inv.characters) {
        parts.push(`\n### ${c.refId} — ${c.label}\n\`\`\`prompt\n${c.prompt}\n\`\`\`\n`);
      }
    }
    if (inv.locations.length) {
      parts.push('\n## LOCATIONS');
      for (const l of inv.locations) {
        parts.push(`\n### ${l.refId} — ${l.label}\n\`\`\`prompt\n${l.prompt}\n\`\`\`\n`);
      }
    }
    return parts.join('');
  }, [inv]);

  const scenesBlock = useMemo(
    () => scenes.map((s) =>
      `Scene ${String(s.num).padStart(3, '0')} | ${s.level} | ${s.duration}s\nVO: ${s.vo}`
    ).join('\n\n'),
    [scenes],
  );

  const prompt = useMemo(
    () => scenePromptsPrompt(channel, scenesBlock, inventoryBlock),
    [channel, scenesBlock, inventoryBlock],
  );

  useEffect(() => {
    if (bridge.status === 'done' && bridge.output) {
      setOutput(bridge.output);
    }
  }, [bridge.status, bridge.output]);

  const onParse = (mode: 'replace' | 'append') => {
    const text = output.trim();
    if (!text) {
      toast('Paste / Run output trước', 'warning');
      return;
    }
    const parsed = parseScenePrompts(text);
    if (parsed.imagePrompts.length === 0 && parsed.videoPrompts.length === 0) {
      toast('Không parse được — heading phải dùng "## SCENE 001 | LEVEL | 6s ..."', 'error');
      return;
    }
    const body = {
      imagePrompts: parsed.imagePrompts,
      videoPrompts: parsed.videoPrompts,
      rawOutput: text,
    };
    const mut = mode === 'replace' ? replaceMut : appendMut;
    mut.mutate(body, {
      onSuccess: () => toast(`${mode === 'replace' ? 'Replaced' : 'Appended'} ${parsed.imagePrompts.length} img + ${parsed.videoPrompts.length} vid prompts`, 'success'),
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const onClear = () => {
    if (!confirm('Xóa hết scene prompts?')) return;
    clearMut.mutate(undefined, {
      onSuccess: () => { toast('Đã xóa', 'success'); setOutput(''); bridge.reset(); },
    });
  };

  if (scenes.length === 0) {
    return (
      <>
        <PageHeader
          crumbs={[channel.name, 'Stage 10', 'Scene Prompts']}
          title="Scene Prompts"
          subtitle="Cần scenes (Stage 08) trước."
        />
        <EmptyState icon="🎬" title="Chưa có scenes" action={
          <Button variant="rust" onClick={() => setActiveStage('splitter')}>← Stage 08 (Splitter)</Button>
        }>Hoàn thành Stage 08 (Splitter) trước.</EmptyState>
      </>
    );
  }

  if (!inv || (inv.characters.length === 0 && inv.locations.length === 0)) {
    return (
      <>
        <PageHeader
          crumbs={[channel.name, 'Stage 10', 'Scene Prompts']}
          title="Scene Prompts"
          subtitle="Cần inventory (Stage 09) trước."
        />
        <EmptyState icon="📦" title="Chưa có inventory" action={
          <Button variant="rust" onClick={() => setActiveStage('inventory')}>← Stage 09 (Inventory)</Button>
        }>Hoàn thành Stage 09 (Inventory) trước — scene prompts dùng [Character0X] / [Location0X] placeholders.</EmptyState>
      </>
    );
  }

  const items = sp ? (tab === 'image' ? sp.imagePrompts : sp.videoPrompts) : [];

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 10', 'Scene Prompts']}
        title={<>Scene <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Prompts</span></>}
        subtitle={`${scenes.length} scenes · ${inv.characters.length} chars · ${inv.locations.length} locs. Output 2 prompts/scene (G-Labs Image + Veo3 Video).`}
      />

      <Card label="Prompt" title="Scene-by-scene Prompts">
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — Scene Prompts" />
      </Card>

      <Card label="Output" title="Paste / Run output rồi parse">
        <Textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="Paste output Claude, hoặc click ▶ Run Claude..."
          style={{ minHeight: 320 }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <Button variant="ghost" onClick={() => onParse('append')} disabled={appendMut.isPending}>
            ＋ Parse + Append
          </Button>
          <Button variant="rust" onClick={() => onParse('replace')} disabled={replaceMut.isPending}>
            {replaceMut.isPending ? 'Saving…' : '⚡ Parse + Replace All'}
          </Button>
          <Button variant="secondary" onClick={() => setActiveStage('voice')}>
            Tiếp Stage 11 (Voice) →
          </Button>
        </div>
      </Card>

      {sp && (sp.imagePrompts.length > 0 || sp.videoPrompts.length > 0) && (
        <Card label="Saved" title={`${sp.imagePrompts.length} image · ${sp.videoPrompts.length} video prompts`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <Button variant={tab === 'image' ? 'rust' : 'ghost'} onClick={() => setTab('image')}>
              🖼 Image ({sp.imagePrompts.length})
            </Button>
            <Button variant={tab === 'video' ? 'rust' : 'ghost'} onClick={() => setTab('video')}>
              🎥 Video ({sp.videoPrompts.length})
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
            {items.map((p) => (
              <div key={`${tab}-${p.num}`} style={{ padding: 10, background: 'var(--paper-2)', borderRadius: 4, fontSize: 12 }}>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  Scene {String(p.num).padStart(3, '0')} · {p.level || '—'} · {p.character || '—'} @ {p.location || '—'}
                </strong>
                <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontSize: 11 }}>{p.prompt}</pre>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClear}>🗑 Clear all prompts</Button>
          </div>
        </Card>
      )}
    </>
  );
}
