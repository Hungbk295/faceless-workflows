import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto, ScriptDto, Pillar } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { UploadZone } from '../ui/UploadZone.tsx';
import { ScriptSwitchConfirmModal } from '../modals/ScriptSwitchConfirmModal.tsx';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useScriptParams } from '../../store/scriptParams.ts';
import { useScripts, useCreateScript, useDeleteScript } from '../../hooks/useScripts.ts';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { getPillarName } from '../../lib/extractors/topics.ts';
import { previewScriptStructure } from '../../lib/extractors/script.ts';
import {
  scriptWriterPrompt,
  type StructureKey,
  type PovKey,
  type ScriptWriterParams,
} from '../../lib/prompts/scriptWriter.ts';
import { downloadFile, safeFilename } from '../../lib/download.ts';
import styles from './StageScript.module.css';

interface Props {
  channel: ChannelDto;
}

const PILLAR_KEYS: Pillar[] = ['P1', 'P2', 'P3'];

const STRUCTURE_OPTIONS: { value: StructureKey; label: string; group: string }[] = [
  { value: 'levels-escalation',     label: 'Levels — Escalation (POV)',         group: 'POV / Escalation' },
  { value: 'acts-story-arc',        label: 'Acts — Story Arc (Narrative)',      group: 'POV / Escalation' },
  { value: 'timeline-chronological',label: 'Timeline — Chronological',          group: 'Educational' },
  { value: 'chapters-topic-based',  label: 'Chapters — Topic-based',            group: 'Educational' },
  { value: 'parts-flexible',        label: 'Parts — Flexible (DNA default)',    group: 'Educational' },
  { value: 'auto',                  label: 'Auto — Claude tự quyết (recommended)', group: 'Smart' },
  { value: 'custom',                label: 'Custom — Tự nhập structure',         group: 'Smart' },
];

const POV_OPTIONS: { value: PovKey; label: string }[] = [
  { value: 'mixed-1-2-3', label: 'Mixed (tôi + bạn + ngôi 3)' },
  { value: 'mixed-2-3',   label: 'Mixed (bạn + ngôi 3)' },
  { value: '2nd',         label: 'Ngôi 2 (Bạn)' },
  { value: '3rd',         label: 'Ngôi 3 (Người ấy)' },
  { value: 'narrator',    label: 'Narrator (kể chuyện)' },
  { value: 'custom',      label: 'Custom (theo Style Guide)' },
];

const SECTION_OPTIONS = ['auto', '5', '6', '7', '8', '10', '12'];

function asPillar(s: string): Pillar {
  return (PILLAR_KEYS as string[]).includes(s) ? (s as Pillar) : 'P1';
}

export function StageScript({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const updateChannelMut = useUpdateChannel();

  const scriptsQ = useScripts(channel.id);
  const createMut = useCreateScript(channel.id);
  const deleteMut = useDeleteScript(channel.id);

  const params = useScriptParams((s) => s.byChannel[channel.id]) ?? {
    topic: '', hook: '', angle: '', pillar: 'P1', minutes: 18,
    structure: 'auto' as StructureKey, sections: 'auto', pov: 'mixed-1-2-3' as PovKey,
    customStructure: '',
  };
  const setParams = useScriptParams((s) => s.set);
  const resetParams = useScriptParams((s) => s.reset);

  const [output, setOutput] = useState('');
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingSwitchTo, setPendingSwitchTo] = useState<string | null>(null);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:script` });

  // Auto-fill output textarea when bridge run completes.
  useEffect(() => {
    if (bridge.status === 'done' && bridge.output) {
      setOutput(bridge.output);
      setUploadedName(null);
    }
  }, [bridge.status, bridge.output]);

  const scripts = scriptsQ.data ?? [];
  const currentScript: ScriptDto | null =
    scripts.find((s) => s.id === channel.currentScriptId) ?? null;
  const nextScript: ScriptDto | null =
    pendingSwitchTo ? scripts.find((s) => s.id === pendingSwitchTo) ?? null : null;

  // Cast pillar/structure/pov to typed unions for the prompt fn
  const normalisedParams: ScriptWriterParams = {
    topic: params.topic,
    hook: params.hook,
    angle: params.angle,
    pillar: params.pillar,
    minutes: params.minutes,
    structure: (STRUCTURE_OPTIONS.some((o) => o.value === params.structure)
      ? params.structure as StructureKey
      : 'auto'),
    sections: params.sections,
    pov: (POV_OPTIONS.some((o) => o.value === params.pov)
      ? params.pov as PovKey
      : 'mixed-1-2-3'),
    customStructure: params.customStructure,
  };

  const prompt = useMemo(() => scriptWriterPrompt(channel, normalisedParams), [channel, normalisedParams]);
  const preview = useMemo(() => previewScriptStructure(output), [output]);

  const set = (patch: Partial<{
    topic: string; hook: string; angle: string; pillar: string;
    minutes: number; structure: string; sections: string; pov: string; customStructure: string;
  }>) => setParams(channel.id, patch);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      setOutput(text);
      setUploadedName(`${file.name} · ${(file.size / 1024).toFixed(1)}KB`);
      setShowPreview(true);
      toast('Đã load file ' + file.name, 'success');
    };
    reader.onerror = () => toast('Không đọc được file', 'error');
    reader.readAsText(file);
  };

  const onSave = () => {
    const scriptText = output.trim();
    if (!scriptText) {
      toast('Chưa có script để lưu', 'warning');
      return;
    }
    createMut.mutate(
      {
        topic: params.topic || 'Untitled',
        hook: params.hook,
        angle: params.angle,
        pillar: asPillar(params.pillar),
        minutes: params.minutes || 18,
        structure: params.structure,
        sections: params.sections,
        pov: params.pov,
        customStructure: params.customStructure,
        scriptText,
      },
      {
        onSuccess: (created) => {
          updateChannelMut.mutate(
            { id: channel.id, patch: { currentScriptId: created.id } },
            {
              onSuccess: () => {
                toast('Đã lưu script + đặt active', 'success');
                setOutput('');
                setUploadedName(null);
                setShowPreview(false);
                setActiveStage('splitter');
              },
              onError: (e) => toast(e.message, 'error'),
            },
          );
        },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const requestSwitchTo = (scriptId: string) => {
    if (channel.currentScriptId && channel.currentScriptId !== scriptId) {
      setPendingSwitchTo(scriptId);
      return;
    }
    confirmSwitchTo(scriptId);
  };

  const confirmSwitchTo = (scriptId: string) => {
    updateChannelMut.mutate(
      { id: channel.id, patch: { currentScriptId: scriptId } },
      {
        onSuccess: () => {
          toast('Đã đổi active script', 'success');
          setPendingSwitchTo(null);
          setActiveStage('splitter');
        },
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const onDelete = (script: ScriptDto) => {
    if (!window.confirm(`Xóa script "${script.topic || `Script ${script.idx + 1}`}"?`)) return;
    deleteMut.mutate(script.id, {
      onSuccess: () => toast('Đã xóa', 'info'),
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const onExport = (script: ScriptDto) => {
    const safe = safeFilename(script.topic || 'untitled');
    const date = new Date(script.createdAt).toISOString().substring(0, 10);
    const bundle = {
      _bundleType: 'faceless_studio_project',
      _bundleVersion: 1,
      _exportedAt: new Date().toISOString(),
      channel: {
        id: channel.id, name: channel.name, niche: channel.niche, lang: channel.lang,
        dna: channel.dna, style: channel.style, topics: channel.topics,
      },
      script,
    };
    downloadFile(JSON.stringify(bundle, null, 2), `${safe}_${date}.faceless.json`, 'application/json');
    toast('Project bundle exported', 'success');
  };

  // Preview auto-shows when output non-empty after upload, but stays user-controlled afterwards
  useEffect(() => {
    if (!output) setShowPreview(false);
  }, [output]);

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 07', 'Script Writer']}
        title={<>Script <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Writer</span></>}
        subtitle="Viết full script theo Voice Rules từ Style Guide. Có Research phase. Cấu hình structure/POV linh hoạt."
      />

      <Card label="Topic Input" title="Cấu hình video">
        <Input
          label="Topic title"
          id="param-topic"
          value={params.topic}
          onChange={(e) => set({ topic: e.target.value })}
          placeholder="paste topic title hoặc dùng từ Topic Generator"
        />
        <Textarea
          label="Hook câu đầu (từ Topics file)"
          id="param-hook"
          value={params.hook}
          onChange={(e) => set({ hook: e.target.value })}
          placeholder="Hook 50-90 từ..."
          style={{ minHeight: 80 }}
        />
        <Textarea
          label="Góc kể unique"
          id="param-angle"
          value={params.angle}
          onChange={(e) => set({ angle: e.target.value })}
          placeholder="Góc kể độc đáo, twist khác đối thủ..."
          style={{ minHeight: 60 }}
        />

        <div className={styles.formGrid}>
          <Select
            label="Pillar"
            id="param-pillarS"
            value={params.pillar}
            onChange={(e) => set({ pillar: e.target.value })}
          >
            {PILLAR_KEYS.map((p, i) => (
              <option key={p} value={p}>{getPillarName(channel, i + 1)}</option>
            ))}
          </Select>
          <Input
            label="Target minutes"
            id="param-minutes"
            type="number"
            min={5}
            max={40}
            value={params.minutes}
            onChange={(e) => set({ minutes: parseInt(e.target.value, 10) || 18 })}
          />
          <Select
            label="Sections count"
            id="param-sections"
            value={params.sections}
            onChange={(e) => set({ sections: e.target.value })}
          >
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'auto' ? 'Auto (Claude tự quyết)' : s}</option>
            ))}
          </Select>
        </div>

        <div className={styles.formGrid}>
          <Select
            label="Structure type"
            id="param-structure"
            value={params.structure}
            onChange={(e) => set({ structure: e.target.value })}
          >
            {(['POV / Escalation', 'Educational', 'Smart'] as const).map((g) => (
              <optgroup key={g} label={g}>
                {STRUCTURE_OPTIONS.filter((o) => o.group === g).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select
            label="POV style"
            id="param-pov"
            value={params.pov}
            onChange={(e) => set({ pov: e.target.value })}
          >
            {POV_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>

        {params.structure === 'custom' && (
          <Textarea
            label="Custom structure (mô tả chi tiết)"
            id="param-custom"
            value={params.customStructure}
            onChange={(e) => set({ customStructure: e.target.value })}
            placeholder="VD: Phần 1 Hook → Phần 2 Setup → Phần 3 Conflict → Phần 4 Resolution..."
            style={{ minHeight: 80 }}
          />
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          {scripts.length > 0 && (
            <Button variant="ghost" onClick={() => resetParams(channel.id)}>↺ Reset form</Button>
          )}
        </div>
      </Card>

      <Card label="Prompt" title="Script Writer Prompt">
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — Script Writer" />
      </Card>

      <Card label="Output capture" title="Paste hoặc upload script">
        <UploadZone
          accept=".md,.txt"
          uploaded={Boolean(uploadedName)}
          text={uploadedName ? `✓ Đã nhận: ${uploadedName.split(' · ')[0] ?? ''}` : '📂 Drop file .md vào đây hoặc click chọn'}
          hint={uploadedName ? `${uploadedName.split(' · ')[1] ?? ''} — click để chọn file khác` : 'Hoặc paste vào ô bên dưới'}
          onFile={onFile}
        />
        <div style={{ marginTop: 14 }}>
          <Textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder="Hoặc paste full script từ Claude vào đây..."
            style={{ minHeight: 340 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setShowPreview((v) => !v)}>
            👁 {showPreview ? 'Hide' : 'Preview'} structure
          </Button>
          <Button variant="secondary" onClick={() => setActiveStage('splitter')}>
            Skip sang Splitter →
          </Button>
          <Button variant="rust" onClick={onSave} disabled={createMut.isPending || updateChannelMut.isPending}>
            {createMut.isPending ? 'Saving…' : '💾 Save Script + Tiếp Splitter →'}
          </Button>
        </div>

        {showPreview && output.trim() && (
          <div className={[styles.preview, preview.hasScriptHeading ? '' : styles.warn].filter(Boolean).join(' ')}>
            <strong>📊 Script analysis</strong>
            {!preview.hasScriptHeading && (
              <div className={styles.previewLine}>
                ⚠️ Không tìm thấy ## SCRIPT heading — toàn bộ text sẽ được splice. Khuyến nghị thêm <code>## SCRIPT</code> trước phần lời thoại.
              </div>
            )}
            {preview.hasScriptHeading && (
              <div className={styles.previewLine}>
                ✓ Đã tách được SCRIPT body từ research/sources — splitter sẽ chỉ làm việc với phần thoại.
              </div>
            )}
            <div className={styles.previewLine}>
              <strong>Body length:</strong> {preview.bodyLength.toLocaleString()}c (vs full {preview.fullLength.toLocaleString()}c)
            </div>
            <div className={styles.previewLine}>
              <strong>Word count:</strong> {preview.wordCount.toLocaleString()} từ → ~{preview.estMinutes} phút
            </div>
            <div className={styles.previewLine}>
              <strong>Sections detected:</strong> {preview.sections.length}
            </div>
            {preview.sections.length > 0 && (
              <div className={styles.sectionList}>
                {preview.sections.slice(0, 12).map((s, i) => (
                  <div key={i} className={styles.sectionItem}>{i + 1}. {s.substring(0, 70)}</div>
                ))}
                {preview.sections.length > 12 && (
                  <div className={styles.sectionItem}>... và {preview.sections.length - 12} sections khác</div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {scripts.length > 0 && (
        <Card label="History" title={`${scripts.length} scripts đã viết`}>
          <table className={styles.history}>
            <thead>
              <tr>
                <th>#</th>
                <th>Topic</th>
                <th>Created</th>
                <th>Length</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((s) => {
                const active = s.id === channel.currentScriptId;
                return (
                  <tr key={s.id} className={active ? styles.activeRow : ''}>
                    <td className={styles.histNum}>{String(s.idx + 1).padStart(2, '0')}</td>
                    <td>
                      {s.topic || <em style={{ color: 'var(--ink-soft)' }}>(untitled)</em>}
                      {active && <span style={{ marginLeft: 8, color: 'var(--rust)', fontSize: 10, fontWeight: 700 }}>● ACTIVE</span>}
                    </td>
                    <td className={styles.histMeta}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className={styles.histMeta}>
                      {s.scriptText.length}c · ~{Math.round(s.scriptText.split(/\s+/).filter(Boolean).length / 150)}p
                    </td>
                    <td>
                      <button type="button" className={styles.iconBtn} onClick={() => requestSwitchTo(s.id)}>
                        → Activate
                      </button>
                      <button type="button" className={styles.iconBtn} onClick={() => onExport(s)}>⬇ JSON</button>
                      <button type="button" className={`${styles.iconBtn} ${styles.delete}`} onClick={() => onDelete(s)}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ScriptSwitchConfirmModal
        open={Boolean(pendingSwitchTo)}
        channel={channel}
        currentScript={currentScript}
        nextScript={nextScript}
        onCancel={() => setPendingSwitchTo(null)}
        onConfirm={() => {
          if (pendingSwitchTo) confirmSwitchTo(pendingSwitchTo);
        }}
      />
    </>
  );
}
