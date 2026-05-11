import { useEffect, useState } from 'react';
import type { ChannelDto, VisualPromptKey } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useVisualPrompts, useUpdateVisualPrompts } from '../../hooks/useVisualPrompts.ts';
import { visualPrompt } from '../../lib/prompts/visual.ts';
import { parseVisualOutput } from '../../lib/parsers/parseVisual.ts';

interface Props {
  channel: ChannelDto;
}

interface DraftState {
  charStyle: string;
  bgStyle: string;
  sceneStyle: string;
  styleRef: string;
}

const EMPTY: DraftState = { charStyle: '', bgStyle: '', sceneStyle: '', styleRef: '' };

const FIELDS: { key: VisualPromptKey; label: string; minHeight: number; placeholder: string }[] = [
  { key: 'charStyle',  label: '1. charStyle (~80-120 từ)',         minHeight: 160, placeholder: 'Mô tả nhân vật chính...' },
  { key: 'bgStyle',    label: '2. bgStyle (~60-100 từ)',           minHeight: 130, placeholder: 'Mô tả backgrounds...' },
  { key: 'sceneStyle', label: '3. sceneStyle / Aesthetic (~40 từ)', minHeight: 90,  placeholder: 'Universal aesthetic...' },
  { key: 'styleRef',   label: '4. Style Reference Prompt (~80-120 từ)', minHeight: 160, placeholder: 'Moodboard prompt 3 sections...' },
];

export function StageVisual({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const visualQ = useVisualPrompts(channel.id);
  const updateMut = useUpdateVisualPrompts(channel.id);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:visual` });

  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [fullOutput, setFullOutput] = useState('');

  useEffect(() => {
    if (visualQ.data) {
      setDraft({
        charStyle: visualQ.data.charStyle,
        bgStyle: visualQ.data.bgStyle,
        sceneStyle: visualQ.data.sceneStyle,
        styleRef: visualQ.data.styleRef,
      });
    }
  }, [visualQ.data]);

  // Auto-fill the parse textarea when bridge run completes.
  useEffect(() => {
    if (bridge.status === 'done' && bridge.output) {
      setFullOutput(bridge.output);
    }
  }, [bridge.status, bridge.output]);

  const dirty =
    !!visualQ.data && (
      draft.charStyle !== visualQ.data.charStyle
      || draft.bgStyle !== visualQ.data.bgStyle
      || draft.sceneStyle !== visualQ.data.sceneStyle
      || draft.styleRef !== visualQ.data.styleRef
    );

  const onParse = () => {
    const parsed = parseVisualOutput(fullOutput);
    if (!parsed) {
      toast('Paste output trước đã', 'warning');
      return;
    }
    if (parsed.totalBlocks < 4) {
      toast(`Chỉ tìm thấy ${parsed.totalBlocks} blocks (cần 4)`, 'error');
      return;
    }
    setDraft({
      charStyle: parsed.charStyle,
      bgStyle: parsed.bgStyle,
      sceneStyle: parsed.sceneStyle,
      styleRef: parsed.styleRef,
    });
    toast('Đã parse 4 prompts! Click "Save All" để lưu.', 'success');
  };

  const onSave = () => {
    updateMut.mutate(
      {
        charStyle: draft.charStyle.trim(),
        bgStyle: draft.bgStyle.trim(),
        sceneStyle: draft.sceneStyle.trim(),
        styleRef: draft.styleRef.trim(),
      },
      {
        onSuccess: () => toast('Đã lưu 4 visual prompts', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const copyAll = async () => {
    const text = [
      'CHAR STYLE:\n' + draft.charStyle,
      '\n\nBG STYLE:\n' + draft.bgStyle,
      '\n\nSCENE STYLE:\n' + draft.sceneStyle,
      '\n\nSTYLE REF:\n' + draft.styleRef,
    ].join('');
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã copy 4 prompts', 'success');
    } catch {
      toast('Copy failed', 'error');
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 05', 'Visual Prompts']}
        title={<>4 Visual <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Prompts</span></>}
        subtitle="charStyle + bgStyle + sceneStyle + Style Reference. Layer-aware để character + background nhất quán across video."
      />

      <Card label="Prompt" title="4 Visual Prompts Generation">
        <p>
          Prompt đã inject DNA của bạn. Claude sẽ tạo 4 prompts theo layer-separation strict
          (sceneStyle universal, charStyle identity). Run xong, output tự fill vào ô parse bên dưới.
        </p>
        <ClaudeRunPanel bridge={bridge} prompt={visualPrompt(channel)} promptLabel="Prompt — 4 Visual Prompts" />
      </Card>

      <Card label="Output capture (full)" title="Paste full output từ Claude">
        <p>
          Paste output đầy đủ vào ô dưới. App sẽ tự extract 4 prompts từ block code prompt.
        </p>
        <Textarea
          value={fullOutput}
          onChange={(e) => setFullOutput(e.target.value)}
          placeholder="Paste full output từ Claude (chứa 4 prompt code blocks)..."
          style={{ minHeight: 240 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="rust" onClick={onParse}>⚡ Parse 4 prompts tự động</Button>
        </div>
      </Card>

      <Card label="Manual edit" title="4 Prompts (edit thủ công nếu cần)">
        {visualQ.isLoading && <p>Loading…</p>}
        {visualQ.isError && <p style={{ color: 'var(--crimson)' }}>Error: {visualQ.error.message}</p>}
        {visualQ.data && (
          <>
            {FIELDS.map((f) => (
              <Textarea
                key={f.key}
                label={`${f.label} ${draft[f.key].trim() ? '✓' : '—'}`}
                id={`vp-${f.key}`}
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                style={{ minHeight: f.minHeight }}
              />
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
              <Button variant="ghost" onClick={copyAll}>📋 Copy All</Button>
              <Button
                variant="rust"
                onClick={onSave}
                disabled={!dirty || updateMut.isPending}
              >
                {updateMut.isPending ? 'Saving…' : '💾 Save All 4 Prompts'}
              </Button>
              <Button variant="secondary" onClick={() => setActiveStage('topic-gen')}>
                Tiếp Production →
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
