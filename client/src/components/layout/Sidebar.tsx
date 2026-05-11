import { STAGES, type ChannelDto, type StageId } from 'shared';
import { useChannels } from '../../hooks/useChannels.ts';
import { useUiStore } from '../../store/ui.ts';
import { getStageStatus } from '../../lib/stageStatus.ts';
import { sectionLabelClass } from '../../lib/classes.ts';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const channelsQ = useChannels();
  const activeChannelId = useUiStore((s) => s.activeChannelId);
  const activeStage = useUiStore((s) => s.activeStage);
  const setActiveChannel = useUiStore((s) => s.setActiveChannel);
  const setActiveStage = useUiStore((s) => s.setActiveStage);
  const toggleDark = useUiStore((s) => s.toggleDark);
  const openModal = useUiStore((s) => s.openModal);

  const channels = channelsQ.data ?? [];
  const activeChannel: ChannelDto | null =
    channels.find((c) => c.id === activeChannelId) ?? null;

  const onStageClick = (id: StageId) => setActiveStage(id);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          Faceless<span className={styles.accent}>/Studio</span>
        </div>
        <div className={styles.tag}>Workbench v1.0 · TS rewrite</div>
      </div>

      <div className={sectionLabelClass}>Channels</div>
      <div className={styles.list}>
        {channels.length === 0 && (
          <div className={styles.empty}>Chưa có kênh nào</div>
        )}
        {channels.map((ch) => {
          const cls = [styles.item, ch.id === activeChannelId ? styles.active : ''].filter(Boolean).join(' ');
          return (
            <div
              key={ch.id}
              className={cls}
              onClick={() => setActiveChannel(ch.id)}
              role="button"
              tabIndex={0}
            >
              <span className={styles.dot} />
              <span className={styles.itemLabel}>{ch.name}</span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.newBtn}
        onClick={() => openModal({ kind: 'channel-create' })}
      >
        + New Channel
      </button>

      <div className={sectionLabelClass}>Pipeline</div>
      <nav className={styles.stageNav}>
        {STAGES.map((stage) => {
          const status = getStageStatus(stage.id, activeChannel);
          const statusIcon = status === 'done' ? '✓' : status === 'pending' ? '◐' : '';
          const cls = [styles.stage, activeStage === stage.id ? styles.active : ''].filter(Boolean).join(' ');
          const stCls = [styles.stageStatus, status === 'done' ? styles.done : ''].filter(Boolean).join(' ');
          return (
            <div
              key={stage.id}
              className={cls}
              onClick={() => onStageClick(stage.id)}
              role="button"
              tabIndex={0}
            >
              <span className={styles.stageNum}>{stage.num}</span>
              <span>{stage.name}</span>
              <span className={stCls}>{statusIcon}</span>
            </div>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button type="button" className={styles.footerBtn} onClick={toggleDark}>
          ◑ Toggle Theme
        </button>
        <div className={styles.footerNote}>
          Self-hosted · No API · No tracking
        </div>
      </div>
    </aside>
  );
}
