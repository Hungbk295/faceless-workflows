import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto, SceneInput, ScriptDto, SceneDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { useScripts } from '../../hooks/useScripts.ts';
import { useScenes, useReplaceScenes, useClearScenes, useUpdateScene } from '../../hooks/useScenes.ts';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { runSplit, type SplitScene } from '../../lib/splitter/runSplit.ts';
import { extractSources } from '../../lib/extractors/sources.ts';
import { downloadFile, safeFilename } from '../../lib/download.ts';
import styles from './StageSplitter.module.css';

interface Props {
  channel: ChannelDto;
}

const DEFAULT_OPTS = { minChar: 30, maxChar: 180, wpm: 150 };

function toCsv(rows: string[][]): string {
  const escape = (cell: string) => {
    if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

function fmtSec(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m${String(s).padStart(2, '0')}s`;
}

export function StageSplitter({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const updateChannelMut = useUpdateChannel();

  const scriptsQ = useScripts(channel.id);
  const scenesQ = useScenes(channel.id);
  const replaceMut = useReplaceScenes(channel.id);
  const clearMut = useClearScenes(channel.id);
  const updateSceneMut = useUpdateScene(channel.id);

  const scripts = scriptsQ.data ?? [];
  const activeScript: ScriptDto | null =
    scripts.find((s) => s.id === channel.currentScriptId) ?? null;

  const [scriptText, setScriptText] = useState('');
  const [opts, setOpts] = useState(DEFAULT_OPTS);

  // Re-seed input when active script changes.
  useEffect(() => {
    setScriptText(activeScript?.scriptText ?? '');
  }, [activeScript?.id, activeScript?.scriptText]);

  const sources = useMemo(() => extractSources(scriptText), [scriptText]);

  const onRun = () => {
    if (!scriptText.trim()) {
      toast('Chưa có script', 'warning');
      return;
    }
    const result = runSplit(scriptText, opts);
    if (result.scenes.length === 0) {
      toast('Không tìm thấy phần SCRIPT — kiểm tra format heading', 'error');
      return;
    }
    const payload: SceneInput[] = result.scenes.map((s) => ({
      num: s.num,
      level: s.level,
      vo: s.vo,
      character: s.character,
      background: s.background,
      camera: s.camera,
      duration: s.duration,
      chars: s.chars,
      words: s.words,
    }));
    replaceMut.mutate(payload, {
      onSuccess: (next) => {
        toast(`✅ Split thành ${next.length} scenes (~${fmtSec(result.totalDurationSec)})`, 'success');
      },
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const onClear = () => {
    if (!window.confirm('Xóa toàn bộ scenes của channel này?')) return;
    clearMut.mutate(undefined, {
      onSuccess: () => toast('Đã xóa scenes', 'info'),
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const onActivateScript = (scriptId: string) => {
    updateChannelMut.mutate(
      { id: channel.id, patch: { currentScriptId: scriptId } },
      {
        onSuccess: () => toast('Đã đổi active script', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const updateCell = (scene: SceneDto, key: 'character' | 'background' | 'camera' | 'vo', value: string) => {
    if (scene[key] === value) return;
    updateSceneMut.mutate(
      { num: scene.num, patch: { [key]: value } },
      {
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const exportScenesCSV = () => {
    const data = scenesQ.data ?? [];
    if (data.length === 0) { toast('Chưa có scenes', 'warning'); return; }
    const rows: string[][] = [['#', 'Level', 'VO', 'Character', 'Background', 'Camera', 'Duration(s)', 'Chars', 'Words']];
    for (const s of data) {
      rows.push([
        String(s.num), s.level, s.vo, s.character, s.background, s.camera,
        String(s.duration), String(s.chars), String(s.words),
      ]);
    }
    const safe = safeFilename(activeScript?.topic ?? channel.name);
    downloadFile(toCsv(rows), `${safe}_scenes.csv`, 'text/csv');
  };

  const exportScenesJSON = () => {
    const data = scenesQ.data ?? [];
    if (data.length === 0) { toast('Chưa có scenes', 'warning'); return; }
    const safe = safeFilename(activeScript?.topic ?? channel.name);
    downloadFile(JSON.stringify(data, null, 2), `${safe}_scenes.json`, 'application/json');
  };

  const exportSourcesCSV = () => {
    if (sources.length === 0) { toast('Chưa có nguồn', 'warning'); return; }
    const rows: string[][] = [['#', 'Title', 'URL', 'Raw']];
    for (const s of sources) rows.push([String(s.num), s.title, s.url, s.raw]);
    const safe = safeFilename(activeScript?.topic ?? channel.name);
    downloadFile(toCsv(rows), `${safe}_sources.csv`, 'text/csv');
  };

  const copyAllSources = async () => {
    if (sources.length === 0) { toast('Chưa có nguồn', 'warning'); return; }
    const text = sources.map((s) => `${s.num}. ${s.title}${s.url ? ` (${s.url})` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã copy nguồn', 'success');
    } catch { toast('Copy failed', 'error'); }
  };

  const scenes = scenesQ.data ?? [];
  const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
  const totalWords = scenes.reduce((a, s) => a + s.words, 0);

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 08', 'Scene Splitter']}
        title={<>Scene <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Splitter</span></>}
        subtitle="Split script thành scenes (sentences) + tính giây voice + assign character/background. 100% offline JavaScript — không tốn API."
      />

      {scripts.length === 0 && (
        <EmptyState
          icon="∅"
          title="Chưa có script"
          action={<Button variant="rust" onClick={() => setActiveStage('script')}>Viết script ở Stage 07 →</Button>}
        >
          Stage 08 cần ít nhất 1 script trong channel này.
        </EmptyState>
      )}

      {scripts.length > 0 && (
        <Card label="Active script" title={activeScript ? (activeScript.topic || `Script ${activeScript.idx + 1}`) : 'Chưa chọn script'}>
          <Select
            label="Select script to split"
            id="splitter-script"
            value={activeScript?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (id && id !== activeScript?.id) onActivateScript(id);
            }}
          >
            {!activeScript && <option value="">— pick a script —</option>}
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.idx + 1).padStart(2, '0')} · {s.topic || '(untitled)'}
              </option>
            ))}
          </Select>
          {activeScript && (
            <p className={styles.meta}>
              {activeScript.scriptText.length}c · ~{Math.round(activeScript.scriptText.split(/\s+/).filter(Boolean).length / 150)}p · created {new Date(activeScript.createdAt).toLocaleString()}
            </p>
          )}
        </Card>
      )}

      {scripts.length > 0 && (
        <Card label="Split parameters" title="Cấu hình split">
          <div className={styles.formGrid}>
            <Input
              label="Min char/scene"
              id="split-min"
              type="number"
              min={5}
              max={300}
              value={opts.minChar}
              onChange={(e) => setOpts({ ...opts, minChar: parseInt(e.target.value, 10) || 30 })}
            />
            <Input
              label="Max char/scene"
              id="split-max"
              type="number"
              min={20}
              max={500}
              value={opts.maxChar}
              onChange={(e) => setOpts({ ...opts, maxChar: parseInt(e.target.value, 10) || 180 })}
            />
            <Input
              label="Voice WPM"
              id="split-wpm"
              type="number"
              min={80}
              max={250}
              value={opts.wpm}
              onChange={(e) => setOpts({ ...opts, wpm: parseInt(e.target.value, 10) || 150 })}
            />
          </div>
          <Textarea
            label="Script text (auto-loaded từ active script — edit nếu cần)"
            id="splitter-text"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Paste full script ở đây..."
            style={{ minHeight: 280 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
            {scenes.length > 0 && (
              <Button variant="ghost" onClick={onClear} disabled={clearMut.isPending}>
                {clearMut.isPending ? 'Clearing…' : '× Clear scenes'}
              </Button>
            )}
            <Button variant="rust" onClick={onRun} disabled={replaceMut.isPending}>
              {replaceMut.isPending ? 'Splitting…' : '⚡ Run split'}
            </Button>
          </div>
        </Card>
      )}

      {scenes.length > 0 && (
        <Card label="Scenes" title={`${scenes.length} scenes`}>
          <div className={styles.summary}>
            <span><strong>Total duration:</strong> {fmtSec(totalDuration)}</span>
            <span><strong>Total words:</strong> {totalWords.toLocaleString()}</span>
            <span><strong>Avg per scene:</strong> {Math.round(totalWords / scenes.length)} words</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Level</th>
                  <th>VO</th>
                  <th>Character</th>
                  <th>Background</th>
                  <th>Camera</th>
                  <th>Sec</th>
                </tr>
              </thead>
              <tbody>
                {scenes.map((s) => (
                  <tr key={s.num}>
                    <td className={styles.num}>{String(s.num).padStart(3, '0')}</td>
                    <td><span className={styles.level}>{s.level}</span></td>
                    <td className={styles.voCell}>
                      <input
                        type="text"
                        defaultValue={s.vo}
                        className={styles.cellInput}
                        onBlur={(e) => updateCell(s, 'vo', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={s.character}
                        placeholder="Character01…"
                        className={styles.cellInput}
                        onBlur={(e) => updateCell(s, 'character', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={s.background}
                        placeholder="Location01…"
                        className={styles.cellInput}
                        onBlur={(e) => updateCell(s, 'background', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={s.camera}
                        className={styles.cellInput}
                        onBlur={(e) => updateCell(s, 'camera', e.target.value)}
                      />
                    </td>
                    <td className={styles.meta}>{s.duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={exportScenesJSON}>⬇ JSON</Button>
            <Button variant="ghost" onClick={exportScenesCSV}>⬇ CSV</Button>
            <Button variant="secondary" onClick={() => setActiveStage('inventory')}>
              Tiếp Stage 09 (Inventory) →
            </Button>
          </div>
        </Card>
      )}

      {sources.length > 0 && (
        <Card label="Sources" title={`${sources.length} nguồn trích dẫn detected`}>
          <ul style={{ margin: '8px 0 12px 18px' }}>
            {sources.map((s) => (
              <li key={s.num} style={{ marginBottom: 6 }}>
                <strong>{s.num}.</strong> {s.title || s.raw}
                {s.url && (
                  <> · <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--rust)' }}>{s.url}</a></>
                )}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={copyAllSources}>📋 Copy all</Button>
            <Button variant="ghost" onClick={exportSourcesCSV}>⬇ CSV</Button>
          </div>
        </Card>
      )}
    </>
  );
}

// Type re-exports kept narrow for the file's local needs.
export type { SplitScene };
