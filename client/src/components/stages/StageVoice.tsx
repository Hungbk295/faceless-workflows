import { useEffect, useState } from 'react';
import type { ChannelDto, UpdateVoiceConfigInput } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useScenes } from '../../hooks/useScenes.ts';
import {
  useVoiceConfig,
  useUpdateVoiceConfig,
  useClips,
  useGenerateClip,
  useDeleteClip,
  useClearClips,
} from '../../hooks/useVoice.ts';
import { clipUrl } from '../../api/voice.ts';

interface Props {
  channel: ChannelDto;
}

export function StageVoice({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const scenesQ = useScenes(channel.id);
  const cfgQ = useVoiceConfig(channel.id);
  const updateCfgMut = useUpdateVoiceConfig(channel.id);
  const clipsQ = useClips(channel.id);
  const genMut = useGenerateClip(channel.id);
  const delMut = useDeleteClip(channel.id);
  const clearMut = useClearClips(channel.id);

  const [draft, setDraft] = useState<UpdateVoiceConfigInput>({});
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const cfg = cfgQ.data;
  const scenes = scenesQ.data ?? [];
  const clips = clipsQ.data ?? [];

  useEffect(() => {
    if (cfg) {
      setDraft({
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        voiceId: cfg.voiceId,
        modelId: cfg.modelId,
        languageCode: cfg.languageCode,
        stability: cfg.stability,
        similarityBoost: cfg.similarityBoost,
        speed: cfg.speed,
      });
    }
  }, [cfg]);

  const onSaveConfig = () => {
    updateCfgMut.mutate(draft, {
      onSuccess: () => toast('Đã lưu voice config', 'success'),
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const generateOne = async (num: number) => {
    const scene = scenes.find((s) => s.num === num);
    if (!scene) return;
    if (!cfg?.apiKey || !cfg?.voiceId) {
      toast('Cần API key + Voice ID', 'warning');
      return;
    }
    try {
      await genMut.mutateAsync({ num, text: scene.vo });
    } catch (e) {
      toast((e as Error).message.slice(0, 100), 'error');
    }
  };

  const generateAll = async (mode: 'all' | 'pending') => {
    if (!cfg?.apiKey || !cfg?.voiceId) {
      toast('Cần API key + Voice ID', 'warning');
      return;
    }
    const targets = mode === 'all'
      ? scenes
      : scenes.filter((s) => !clips.find((c) => c.num === s.num && c.status === 'done'));
    if (!confirm(`Generate ${targets.length} clips? Sẽ tốn ElevenLabs credits.`)) return;
    setBatchProgress({ done: 0, total: targets.length });
    let done = 0;
    let errors = 0;
    for (const scene of targets) {
      try {
        await genMut.mutateAsync({ num: scene.num, text: scene.vo });
        done++;
      } catch {
        errors++;
      }
      setBatchProgress({ done: done + errors, total: targets.length });
    }
    setBatchProgress(null);
    toast(`Done ${done}/${targets.length} clips · ${errors} errors`, errors > 0 ? 'warning' : 'success');
  };

  const onDelete = (num: number) => {
    delMut.mutate(num, { onError: (e) => toast(e.message, 'error') });
  };

  const onClear = () => {
    if (!confirm(`Xóa hết ${clips.length} clips?`)) return;
    clearMut.mutate();
  };

  if (scenes.length === 0) {
    return (
      <>
        <PageHeader
          crumbs={[channel.name, 'Stage 11', 'Create Voice']}
          title="Create Voice"
          subtitle="Cần scenes (Stage 08) trước."
        />
        <EmptyState icon="🎙" title="Chưa có scenes" action={
          <Button variant="rust" onClick={() => setActiveStage('splitter')}>← Stage 08</Button>
        }>Hoàn thành splitter để có VO text cho mỗi scene.</EmptyState>
      </>
    );
  }

  const doneCount = clips.filter((c) => c.status === 'done').length;
  const errorCount = clips.filter((c) => c.status === 'error').length;

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 11', 'Create Voice']}
        title={<>Create <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Voice</span></>}
        subtitle={`Tạo MP3 cho ${scenes.length} scenes via ElevenLabs. Filename = 001.mp3, 002.mp3, ...`}
      />

      <Card label="Step 01" title="ElevenLabs config">
        <p style={{ fontSize: 13 }}>
          API key lưu vào DB local (~/.faceless-studio/faceless.db) — chỉ máy bạn biết. Server-side fetch
          để tránh CORS.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Input
            label="API Key 🔐"
            type="password"
            value={draft.apiKey ?? ''}
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            placeholder="sk_..."
          />
          <Input
            label="Voice ID"
            value={draft.voiceId ?? ''}
            onChange={(e) => setDraft({ ...draft, voiceId: e.target.value })}
            placeholder="JBFqnCBsd6RMkjVDRZzb"
          />
          <Input
            label="Model ID"
            value={draft.modelId ?? ''}
            onChange={(e) => setDraft({ ...draft, modelId: e.target.value })}
            placeholder="eleven_multilingual_v2"
          />
          <Select
            label="Language"
            value={draft.languageCode ?? 'vi'}
            onChange={(e) => setDraft({ ...draft, languageCode: e.target.value })}
          >
            <option value="vi">vi (Tiếng Việt)</option>
            <option value="en">en (English)</option>
            <option value="es">es (Español)</option>
            <option value="">auto-detect</option>
          </Select>
          <Input
            label="Stability (0-1)" type="number" min={0} max={1} step={0.1}
            value={draft.stability ?? 0.5}
            onChange={(e) => setDraft({ ...draft, stability: parseFloat(e.target.value) })}
          />
          <Input
            label="Similarity boost (0-1)" type="number" min={0} max={1} step={0.05}
            value={draft.similarityBoost ?? 0.75}
            onChange={(e) => setDraft({ ...draft, similarityBoost: parseFloat(e.target.value) })}
          />
          <Input
            label="Speed (0.5-2)" type="number" min={0.5} max={2} step={0.1}
            value={draft.speed ?? 1}
            onChange={(e) => setDraft({ ...draft, speed: parseFloat(e.target.value) })}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="rust" onClick={onSaveConfig} disabled={updateCfgMut.isPending}>
            {updateCfgMut.isPending ? 'Saving…' : '💾 Save Config'}
          </Button>
        </div>
      </Card>

      <Card label="Step 02" title={`Generate voices (${doneCount}/${scenes.length} done${errorCount ? `, ${errorCount} errors` : ''})`}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Button variant="rust" onClick={() => generateAll('all')} disabled={genMut.isPending}>
            ⚡ Generate ALL ({scenes.length})
          </Button>
          <Button variant="secondary" onClick={() => generateAll('pending')} disabled={genMut.isPending}>
            ▶ Generate pending only ({scenes.length - doneCount})
          </Button>
          <Button variant="ghost" onClick={onClear} disabled={clips.length === 0}>
            🗑 Clear all clips
          </Button>
        </div>
        {batchProgress && (
          <div style={{ padding: 10, background: 'var(--paper-2)', borderLeft: '3px solid var(--olive)', fontSize: 13, marginBottom: 10 }}>
            ⏳ Generating… {batchProgress.done}/{batchProgress.total}
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)' }}>
                <th style={{ padding: 8, textAlign: 'left', width: 60 }}>STT</th>
                <th style={{ padding: 8, textAlign: 'left', width: 90 }}>File</th>
                <th style={{ padding: 8, textAlign: 'left' }}>VO</th>
                <th style={{ padding: 8, textAlign: 'left', width: 80 }}>Duration</th>
                <th style={{ padding: 8, textAlign: 'left', width: 100 }}>Status</th>
                <th style={{ padding: 8, textAlign: 'left', width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s) => {
                const clip = clips.find((c) => c.num === s.num);
                const filename = `${String(s.num).padStart(3, '0')}.mp3`;
                return (
                  <tr key={s.num} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{s.num}</td>
                    <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{filename}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.vo}
                      </div>
                    </td>
                    <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{s.duration}s</td>
                    <td style={{ padding: 8 }}>
                      {!clip && <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                      {clip?.status === 'pending' && <span>⏳ pending</span>}
                      {clip?.status === 'processing' && <span style={{ color: 'var(--gold)' }}>⏳ processing</span>}
                      {clip?.status === 'done' && (
                        <span style={{ color: 'var(--olive)' }}>
                          ✓ {clip.size ? `${(clip.size / 1024).toFixed(1)}KB` : 'done'}
                        </span>
                      )}
                      {clip?.status === 'error' && (
                        <span style={{ color: 'var(--crimson)' }} title={clip.error ?? ''}>
                          ✗ error
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>
                      <Button variant="ghost" onClick={() => generateOne(s.num)} disabled={genMut.isPending}>
                        {clip?.status === 'done' ? '🔄 Regen' : '▶ Gen'}
                      </Button>
                      {clip?.status === 'done' && (
                        <>
                          <a href={clipUrl(channel.id, s.num)} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>
                            <Button variant="ghost">▶ Play</Button>
                          </a>
                          <a href={clipUrl(channel.id, s.num)} download={filename} style={{ marginLeft: 6 }}>
                            <Button variant="ghost">⬇</Button>
                          </a>
                        </>
                      )}
                      {clip && (
                        <Button variant="ghost" onClick={() => onDelete(s.num)} style={{ marginLeft: 6 }}>
                          🗑
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <Button variant="secondary" onClick={() => setActiveStage('thumbnail')}>
            Tiếp Stage 12 (Thumbnail) →
          </Button>
        </div>
      </Card>
    </>
  );
}
