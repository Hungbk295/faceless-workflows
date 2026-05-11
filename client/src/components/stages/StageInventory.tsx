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
import { useScripts } from '../../hooks/useScripts.ts';
import { useInventory, useReplaceInventory, useClearInventory } from '../../hooks/useInventory.ts';
import { inventoryPrompt } from '../../lib/prompts/inventory.ts';
import { parseInventory } from '../../lib/parsers/parseInventory.ts';

interface Props {
  channel: ChannelDto;
}

export function StageInventory({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const scriptsQ = useScripts(channel.id);
  const invQ = useInventory(channel.id);
  const replaceMut = useReplaceInventory(channel.id);
  const clearMut = useClearInventory(channel.id);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:inventory` });

  const scripts = scriptsQ.data ?? [];
  const activeScript = scripts.find((s) => s.id === channel.currentScriptId) ?? scripts[0] ?? null;
  const scriptText = activeScript?.scriptText ?? '';

  const [output, setOutput] = useState('');

  const prompt = useMemo(() => inventoryPrompt(channel, scriptText), [channel, scriptText]);

  useEffect(() => {
    if (bridge.status === 'done' && bridge.output) {
      setOutput(bridge.output);
    }
  }, [bridge.status, bridge.output]);

  const onParseAndSave = () => {
    const text = output.trim();
    if (!text) {
      toast('Paste / Run output trước', 'warning');
      return;
    }
    const parsed = parseInventory(text);
    if (parsed.characters.length === 0 && parsed.locations.length === 0) {
      toast('Không parse được. Heading phải dùng "### Character0X — [name]" và block ```prompt', 'error');
      return;
    }
    replaceMut.mutate(
      {
        characters: parsed.characters,
        locations: parsed.locations,
        rawOutput: text,
      },
      {
        onSuccess: () => toast(`Saved ${parsed.characters.length} characters · ${parsed.locations.length} locations`, 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const onClear = () => {
    if (!confirm('Xóa hết inventory hiện tại?')) return;
    clearMut.mutate(undefined, {
      onSuccess: () => { toast('Đã xóa inventory', 'success'); setOutput(''); bridge.reset(); },
      onError: (e) => toast(e.message, 'error'),
    });
  };

  if (!scriptText) {
    return (
      <>
        <PageHeader
          crumbs={[channel.name, 'Stage 09', 'Asset Inventory']}
          title="Asset Inventory"
          subtitle="Cần script trước khi gen inventory."
        />
        <EmptyState
          icon="📜"
          title="Chưa có script"
          action={<Button variant="rust" onClick={() => setActiveStage('script')}>← Stage 07 (Script)</Button>}
        >
          Inventory được derive từ script. Hoàn thành Stage 07 trước.
        </EmptyState>
      </>
    );
  }

  const inv = invQ.data;

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 09', 'Asset Inventory']}
        title={<>Asset <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Inventory</span></>}
        subtitle="Mỗi character + location có 1 image-gen prompt độc lập. Sau khi gen ảnh ở G-Labs, dùng làm reference cho Stage 10 Scene Prompts."
      />

      <Card label="Prompt" title="Inventory Generation">
        <p>
          Prompt đã inject script ({scriptText.length}c) và 4 visual prompts của bạn. Claude sẽ trả về
          danh sách characters + locations với prompt riêng cho từng asset.
        </p>
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — Asset Inventory" />
      </Card>

      <Card label="Output" title="Paste / Run output rồi parse">
        <Textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="Paste output Claude, hoặc click ▶ Run Claude ở trên..."
          style={{ minHeight: 320 }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <Button variant="rust" onClick={onParseAndSave} disabled={replaceMut.isPending}>
            {replaceMut.isPending ? 'Saving…' : '⚡ Parse + Save Inventory'}
          </Button>
          <Button variant="secondary" onClick={() => setActiveStage('scene-prompts')}>
            Tiếp Stage 10 (Scene Prompts) →
          </Button>
        </div>
      </Card>

      {inv && (inv.characters.length > 0 || inv.locations.length > 0) && (
        <Card label="Saved" title={`Inventory: ${inv.characters.length} characters · ${inv.locations.length} locations`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {[...inv.characters, ...inv.locations].map((a) => (
              <div key={a.refId} style={{ padding: 12, background: 'var(--paper-2)', borderRadius: 4, fontSize: 12 }}>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--rust)' }}>{a.refId}</strong>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--ink-soft)' }}>Show prompt ({a.prompt.length}c)</summary>
                  <pre style={{ marginTop: 6, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                    {a.prompt}
                  </pre>
                </details>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClear}>🗑 Clear inventory</Button>
          </div>
        </Card>
      )}
    </>
  );
}
