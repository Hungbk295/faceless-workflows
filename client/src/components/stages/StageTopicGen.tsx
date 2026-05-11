import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { UploadZone } from '../ui/UploadZone.tsx';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import {
  topicGenPrompt,
  DEFAULT_TOPIC_GEN_PARAMS,
  type PillarSelection,
  type TopicGenParams,
} from '../../lib/prompts/topicGen.ts';
import { parseTopicGenOutput, type ParsedTopic } from '../../lib/parsers/parseTopics.ts';
import { getPillarName } from '../../lib/extractors/topics.ts';
import { useScriptParams } from '../../store/scriptParams.ts';
import styles from './StageTopicGen.module.css';

interface Props {
  channel: ChannelDto;
}

const FOCUS_OPTIONS = [
  'CTR cao nhất',
  'Evergreen nhất',
  'Góc độ độc đáo',
  'Dễ làm nhất',
  'Cân bằng',
];

export function StageTopicGen({ channel }: Props) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const updateMut = useUpdateChannel();
  const setScriptParams = useScriptParams((s) => s.set);
  const bridge = useClaudeBridge({ persistKey: `${channel.id}:topic-gen` });

  const [params, setParams] = useState<TopicGenParams>(DEFAULT_TOPIC_GEN_PARAMS);
  const [output, setOutput] = useState('');
  const [parsed, setParsed] = useState<ParsedTopic[]>([]);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const prompt = useMemo(() => topicGenPrompt(channel, params), [channel, params]);

  // Auto-fill output textarea when bridge run completes.
  useEffect(() => {
    if (bridge.status === 'done' && bridge.output) {
      setOutput(bridge.output);
      setUploadedName(null);
    }
  }, [bridge.status, bridge.output]);

  const onParse = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast('Paste output trước', 'warning');
      return;
    }
    const items = parseTopicGenOutput(text);
    if (items.length === 0) {
      toast('Không parse được — kiểm tra format bảng | # | Chủ đề | Title | Hook | ... |', 'error');
      return;
    }
    setParsed(items);
    toast(`Đã parse ${items.length} topics`, 'success');
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      setOutput(text);
      setUploadedName(`${file.name} · ${(file.size / 1024).toFixed(1)}KB`);
      toast('Đã load ' + file.name, 'success');
      // Auto-parse — ignore parse errors here (will surface via toast in onParse)
      try { onParse(text); } catch { /* noop */ }
    };
    reader.onerror = () => toast('Không đọc được file', 'error');
    reader.readAsText(file);
  };

  const onAppend = () => {
    const newOutput = output.trim();
    if (!newOutput) {
      toast('Chưa có output để append', 'warning');
      return;
    }
    const dateStr = new Date().toLocaleDateString();
    const next =
      (channel.topics ? channel.topics + '\n\n' : '') +
      `## ADDITIONAL TOPICS (generated ${dateStr})\n\n` +
      newOutput;
    updateMut.mutate(
      { id: channel.id, patch: { topics: next } },
      {
        onSuccess: () => toast('Đã append vào file Topics', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const onUseTopic = (t: ParsedTopic) => {
    const pillarMatch = t.pillar.match(/P\d/i);
    const pillar = pillarMatch ? pillarMatch[0].toUpperCase() : 'P1';
    setScriptParams(channel.id, {
      topic: t.title || t.subject,
      hook: t.hook,
      angle: t.angle,
      pillar,
    });
    toast(`Đã chọn: "${t.title || t.subject}"`, 'success');
    setActiveStage('script');
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 06', 'Topic Generator']}
        title={<>Topic <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Generator</span></>}
        subtitle="Tạo topics MỚI ngoài 24 topics có sẵn trong file Topics."
      />

      <Card label="Parameters" title="Cấu hình">
        <div className={styles.formGrid}>
          <Select
            label="Pillar focus"
            id="param-pillar"
            value={params.pillar}
            onChange={(e) => setParams({ ...params, pillar: e.target.value as PillarSelection })}
          >
            <option value="MIXED">Mixed (đa pillar)</option>
            <option value="P1">{getPillarName(channel, 1)} only</option>
            <option value="P2">{getPillarName(channel, 2)} only</option>
            <option value="P3">{getPillarName(channel, 3)} only</option>
          </Select>
          <Input
            label="Số topics"
            id="param-count"
            type="number"
            min={5}
            max={30}
            value={params.count}
            onChange={(e) => setParams({ ...params, count: parseInt(e.target.value, 10) || 10 })}
          />
          <Select
            label="Focus"
            id="param-focus"
            value={params.focus}
            onChange={(e) => setParams({ ...params, focus: e.target.value })}
          >
            {FOCUS_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>
        <Textarea
          label="Yêu cầu bổ sung (optional)"
          id="param-note"
          value={params.note}
          onChange={(e) => setParams({ ...params, note: e.target.value })}
          placeholder="VD: tránh topic về thuốc/bệnh hiểm nghèo"
          style={{ minHeight: 80 }}
        />
      </Card>

      <Card label="Prompt" title="Topic Generator Prompt">
        <ClaudeRunPanel bridge={bridge} prompt={prompt} promptLabel="Prompt — Topic Generator" />
      </Card>

      <Card label="Output" title="Paste hoặc upload topics output">
        <p>
          Paste output Claude vào ô dưới HOẶC upload file <code>.md</code>. App sẽ parse bảng
          topics + recommendations.
        </p>
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
            placeholder="Hoặc paste output từ Claude vào đây..."
            style={{ minHeight: 240 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <Button variant="secondary" onClick={onAppend} disabled={updateMut.isPending}>
            {updateMut.isPending ? 'Saving…' : '+ Append vào file Topics'}
          </Button>
          <Button variant="rust" onClick={() => onParse(output)}>⚡ Parse topics</Button>
        </div>
      </Card>

      {parsed.length > 0 && (
        <Card label="Parsed" title={`${parsed.length} topics — click "Use" để chuyển sang Script Writer`}>
          <div className={styles.list}>
            {parsed.map((t, i) => (
              <div key={i} className={styles.row}>
                <div className={styles.rowInner}>
                  <div className={styles.left}>
                    <div className={styles.num}>#{String(t.num).padStart(2, '0')}</div>
                    {t.score && <div className={styles.score}>{t.score}</div>}
                    {t.pillar && <div className={styles.pillarTag}>{t.pillar}</div>}
                  </div>
                  <div className={styles.middle}>
                    {t.title && <div className={styles.title}>{t.title}</div>}
                    {t.subject && t.subject !== t.title && (
                      <div className={styles.subject}><strong>Chủ đề:</strong> {t.subject}</div>
                    )}
                    {t.hook && <div className={styles.hook}>{t.hook}</div>}
                    {t.angle && <div className={styles.angle}><strong>Góc kể:</strong> {t.angle}</div>}
                  </div>
                  <div className={styles.actions}>
                    <Button variant="rust" size="sm" onClick={() => onUseTopic(t)}>Use →</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
