import { STAGES, type ChannelDto } from 'shared';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { DataGrid, type DataCell } from '../ui/DataGrid.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { PageHeader } from '../layout/PageHeader.tsx';
import { useUiStore } from '../../store/ui.ts';
import { getStageStatus } from '../../lib/stageStatus.ts';
import styles from './StageOverview.module.css';

interface OverviewProps {
  channel: ChannelDto | null;
  channelCount: number;
}

export function StageOverview({ channel, channelCount }: OverviewProps) {
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const openModal = useUiStore((s) => s.openModal);
  const activeStage = useUiStore((s) => s.activeStage);

  if (!channel) {
    return (
      <>
        <PageHeader
          crumbs={['Stage 00', 'Overview']}
          title={<>Welcome to <span className={styles.italic}>Faceless Studio</span></>}
          subtitle="Workbench đa kênh cho YouTube faceless. Schema-enforced prompts. Server-backed. Multi-channel."
        />

        <Card label="Bắt đầu" title="Tạo kênh đầu tiên">
          <p>Faceless Studio giúp bạn build kênh YouTube faceless qua 13 stages có schema-enforced prompts. Mỗi stage:</p>
          <ul>
            <li>Hướng dẫn cụ thể bạn cần làm gì</li>
            <li>Prompt copy-paste-ready cho Claude.ai (Opus 4.7)</li>
            <li>Output capture — paste kết quả Claude vào, app parse + lưu</li>
            <li>Auto-generate prompts cho stages tiếp theo</li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <Button variant="rust" onClick={() => openModal({ kind: 'channel-create' })}>
              + Tạo kênh đầu tiên
            </Button>
          </div>
        </Card>

        <Card label="Triết lý" title="Tại sao app này khác?">
          <ul>
            <li><strong>Server-first:</strong> SQLite + Bun + Hono. Data persisted, multi-device ready.</li>
            <li><strong>Bring your own brain:</strong> Stage prompts được copy-paste vào Claude.ai (Pro/Free).</li>
            <li><strong>Schema enforcement:</strong> Mỗi prompt buộc Claude trả output đúng format → app parse được → feed sang stage sau.</li>
            <li><strong>Multi-channel:</strong> Switch giữa các kênh dễ như tab browser.</li>
            <li><strong>No vendor lock-in:</strong> Export full data ra JSON bất kỳ lúc nào.</li>
          </ul>
          {channelCount === 0 && (
            <EmptyState icon="∅" title="Chưa có kênh nào" />
          )}
        </Card>
      </>
    );
  }

  // Channel-specific overview
  const stagesDone = STAGES.filter((s) => getStageStatus(s.id, channel) === 'done').length;
  const totalStages = STAGES.length;

  const cells: DataCell[] = [
    { label: 'Progress', value: `${stagesDone}/${totalStages}` },
    {
      label: 'Channel DNA',
      value: channel.dna.length > 100 ? '✓ Done' : '— Empty',
      tone: channel.dna.length > 100 ? 'done' : 'muted',
    },
    {
      label: 'Style Guide',
      value: channel.style.length > 100 ? '✓ Done' : '— Empty',
      tone: channel.style.length > 100 ? 'done' : 'muted',
    },
    {
      label: 'Topics File',
      value: channel.topics.length > 100 ? '✓ Done' : '— Empty',
      tone: channel.topics.length > 100 ? 'done' : 'muted',
    },
    {
      label: 'Reference',
      value: channel.refUrl || channel.refNotes ? '✓ Set' : '— Empty',
      tone: channel.refUrl || channel.refNotes ? 'done' : 'muted',
    },
    {
      label: 'Language',
      value: channel.lang.toUpperCase(),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Overview']}
        title={channel.name}
        subtitle={
          <>
            {channel.niche || 'Chưa định nghĩa niche'} · Reference:{' '}
            {channel.refUrl ? (
              <a href={channel.refUrl} target="_blank" rel="noreferrer" className={styles.refLink}>
                {channel.refUrl}
              </a>
            ) : (
              'chưa có'
            )}
          </>
        }
      />

      <DataGrid cells={cells} />

      <Card label="Pipeline" title="Workflow 13 stages">
        <p>Pipeline được chia thành 2 phần: <strong>Setup (Stage 1-5)</strong> làm 1 lần khi tạo kênh + <strong>Production (Stage 6-13)</strong> lặp lại cho mỗi video.</p>
        <div className={styles.workflow}>
          {STAGES.slice(1).map((s, i, arr) => {
            const status = getStageStatus(s.id, channel);
            const cls = [
              styles.step,
              status === 'done' ? styles.done : '',
              activeStage === s.id ? styles.current : '',
            ].filter(Boolean).join(' ');
            return (
              <div key={s.id} style={{ display: 'contents' }}>
                <div
                  className={cls}
                  onClick={() => setActiveStage(s.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.stepNum}>{s.num}</div>
                  <div className={styles.stepName}>{s.name}</div>
                </div>
                {i < arr.length - 1 && <div className={styles.arrow}>→</div>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card label="Quick actions" title="Bắt đầu từ đâu?">
        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div className={styles.stepCardNum}>01</div>
            <div className={styles.stepCardContent}>
              <h4>Phân tích reference channel (Stage 01)</h4>
              <p>Nếu bạn có kênh tham chiếu, làm Stage 01 trước. Nếu không, skip thẳng sang Stage 02 (DNA).</p>
            </div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepCardNum}>02</div>
            <div className={styles.stepCardContent}>
              <h4>Tạo Channel DNA (Stage 02)</h4>
              <p>Tạo bản sắc kênh — title patterns, hook patterns, visual style, protagonist. Quan trọng nhất.</p>
            </div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepCardNum}>03</div>
            <div className={styles.stepCardContent}>
              <h4>Style + Topics + Visual (Stage 03-05)</h4>
              <p>Dựa trên DNA, gen 3 outputs còn lại. Sau Stage 05, kênh đã sẵn sàng làm video.</p>
            </div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepCardNum}>04</div>
            <div className={styles.stepCardContent}>
              <h4>Production loop (Stage 06-13)</h4>
              <p>Cho mỗi video mới: chọn topic → script → split scenes → gen prompts → voice → thumbnail → metadata.</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={() => openModal({ kind: 'channel-edit', channelId: channel.id })}>
          ✎ Edit channel
        </Button>
      </Card>
    </>
  );
}
