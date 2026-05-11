import { useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { DataGrid, type DataCell } from '../ui/DataGrid.tsx';
import { ValidationChecklist, type ValidationItem } from '../ui/ValidationChecklist.tsx';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { dnaPrompt } from '../../lib/prompts/dna.ts';
import { extractTitleFormulas, validateDNA } from '../../lib/extractors/dna.ts';
import styles from './StageDNA.module.css';

interface Props {
  channel: ChannelDto;
}

export function StageDNA({ channel }: Props) {
  const updateMut = useUpdateChannel();
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:dna` });

  const [validation, setValidation] = useState<ValidationItem[] | null>(null);

  const formulas = useMemo(() => extractTitleFormulas(channel.dna), [channel.dna]);

  const saveDNA = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { dna: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu DNA', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const onValidate = () => {
    const items = validateDNA(channel.dna);
    setValidation(items);
    const passing = items.filter((i) => i.ok).length;
    if (passing === items.length) {
      toast(`DNA valid — ${passing}/${items.length} checks passed`, 'success');
    } else {
      toast(`DNA cần sửa — ${passing}/${items.length} checks passed`, 'warning');
    }
  };

  const formulaCells: DataCell[] = formulas.map((f) => ({
    label: f.label,
    value: <span className={styles.formulaName}>{f.name}</span>,
  }));

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 02', 'Channel DNA']}
        title={<>Channel <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>DNA</span></>}
        subtitle="Bản sắc kênh — 7 mục: Title patterns, Hook patterns, Video structure, Thumbnail style, Human touch, Differentiation, Protagonist. Quan trọng nhất trong cả pipeline."
      />

      <Card label="How to use" title="3 bước tạo DNA">
        <div className={styles.steps}>
          {[
            { n: 'A', h: 'Copy prompt → Claude.ai', p: 'Prompt đã inject Reference Analysis (nếu có) và channel info. Claude sẽ trả về DNA theo format cố định.' },
            { n: 'B', h: 'Review output', p: 'Đọc lướt: có đủ 7 mục không? Title formulas có 5 cái không? Differentiation có ≥5 điểm không?' },
            { n: 'C', h: 'Paste vào ô lưu trữ', p: 'App sẽ parse + extract title formulas tự động cho stages tiếp theo.' },
          ].map((step) => (
            <div key={step.n} className={styles.step}>
              <div className={styles.stepNum}>{step.n}</div>
              <div className={styles.stepContent}>
                <h4>{step.h}</h4>
                <p>{step.p}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card label="Prompt" title="Channel DNA Generation">
        <ClaudeRunPanel bridge={bridge} prompt={dnaPrompt(channel)} promptLabel="Prompt — Channel DNA" />
      </Card>

      <Card label="Output capture" title="Paste DNA output">
        <OutputCapture
          label="DNA Output"
          value={channel.dna}
          onSave={saveDNA}
          saving={updateMut.isPending}
          minHeight={340}
          placeholder="Paste output từ Claude, hoặc click ▶ Run Claude ở trên..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <Button variant="secondary" onClick={onValidate}>✓ Validate Schema</Button>
          <Button variant="secondary" onClick={() => setActiveStage('style')}>
            Tiếp Stage 03 (Style Guide) →
          </Button>
        </div>
        {validation && (
          <div style={{ marginTop: 16 }}>
            <ValidationChecklist items={validation} />
          </div>
        )}
      </Card>

      {channel.dna.length > 100 && (
        <Card label="Auto-extracted" title="Title Formulas detected">
          {formulas.length === 0 ? (
            <p className={styles.warn}>
              ⚠️ Không detect được formulas. Check format DNA: heading phải dùng "### Formula A — [Tên]"
            </p>
          ) : (
            <>
              <p>Đã extract {formulas.length} formulas từ DNA:</p>
              <DataGrid cells={formulaCells} />
            </>
          )}
        </Card>
      )}
    </>
  );
}
