import { useEffect, useMemo, useState } from 'react';
import type { ChannelDto, SpyFrameDto, SpyVideoDto } from 'shared';
import { Card } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';
import {
  useCancelSpy,
  useDeleteSpy,
  useRunSpy,
  useSpyEvents,
  useSpyResult,
} from '../../hooks/useSpy.ts';
import type { AttachmentItem } from '../../hooks/useAttachments.ts';
import { toast } from '../../store/toast.ts';
import styles from './SpyChannelPanel.module.css';

interface Props {
  channel: ChannelDto;
  isAttached: (id: string) => boolean;
  onToggleAttachment: (item: AttachmentItem) => void;
}

export function videoAttachmentId(videoId: string): string {
  return `video:${videoId}`;
}
export function frameAttachmentId(videoId: string, idx: number): string {
  return `frame:${videoId}:${idx}`;
}

function buildVideoAttachment(v: SpyVideoDto): AttachmentItem | null {
  if (!v.thumbnailPath) return null;
  return {
    id: videoAttachmentId(v.videoId),
    kind: 'video',
    label: v.title,
    previewUrl: v.thumbnailUrl ?? undefined,
    serverPath: v.thumbnailPath,
    transcript: v.transcript,
    videoTitle: v.title,
    videoId: v.videoId,
    viewCount: v.viewCount,
  };
}

function buildFrameAttachment(v: SpyVideoDto, f: SpyFrameDto): AttachmentItem {
  return {
    id: frameAttachmentId(v.videoId, f.idx),
    kind: 'frame',
    label: `${v.title} — frame ${f.idx} (${f.timestampSec}s)`,
    previewUrl: f.url,
    serverPath: f.path,
    videoTitle: v.title,
    videoId: v.videoId,
  };
}

const STEP_LABELS: Record<string, string> = {
  list: 'Listing videos',
  metadata: 'Fetching metadata',
  thumbnails: 'Downloading thumbnails',
  transcripts: 'Fetching transcripts',
  frames: 'Extracting frames',
  done: 'Done',
};

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function SpyChannelPanel({ channel, isAttached, onToggleAttachment }: Props) {
  const [url, setUrl] = useState(channel.refUrl);
  const [lightbox, setLightbox] = useState<string | null>(null);
  useEffect(() => { setUrl(channel.refUrl); }, [channel.refUrl]);

  const result = useSpyResult(channel.id);
  const runMut = useRunSpy(channel.id);
  const cancelMut = useCancelSpy(channel.id);
  const deleteMut = useDeleteSpy(channel.id);

  const isRunning = result.data?.run?.status === 'running';
  const live = useSpyEvents(channel.id, isRunning);

  const step = live.step ?? result.data?.run?.step ?? null;
  const progress = isRunning ? live.progress : (result.data?.run?.progress ?? 0);
  const total = isRunning ? live.total : (result.data?.run?.total ?? 0);
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  const errorMsg = live.error || result.data?.run?.error || null;

  const videos = result.data?.videos ?? [];
  const framesVideos = useMemo(
    () => videos.filter((v) => v.frames.length > 0).slice(0, 3),
    [videos],
  );

  const onRun = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast('Cần URL channel', 'error');
      return;
    }
    runMut.mutate(
      { url: trimmed },
      { onError: (e) => toast(e.message, 'error') },
    );
  };

  const onCancel = () => cancelMut.mutate();
  const onClear = () => {
    if (!confirm('Xoá toàn bộ dữ liệu spy của kênh này?')) return;
    deleteMut.mutate(undefined, {
      onSuccess: () => toast('Đã xoá', 'success'),
      onError: (e) => toast(e.message, 'error'),
    });
  };

  return (
    <Card label="Step 01.5" title={<>🕵️ Spy <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Reference Channel</span></>}>
      <p style={{ marginBottom: 12 }}>
        Lấy top 10 video view cao nhất của kênh tham chiếu (thumbnail + transcript), kèm 3 frame ngẫu nhiên từ 3 video top. Hữu ích để tìm cảm hứng cho thumbnail + nội dung.
      </p>
      <div className={styles.bar}>
        <div className={styles.urlWrap}>
          <Input
            label="Channel URL"
            id="spy-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/@channelname"
            disabled={isRunning}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isRunning ? (
            <Button variant="secondary" onClick={onCancel} disabled={cancelMut.isPending}>
              ⏹ Cancel
            </Button>
          ) : (
            <Button variant="rust" onClick={onRun} disabled={runMut.isPending}>
              {runMut.isPending ? 'Starting…' : '🕵️ Spy'}
            </Button>
          )}
          {videos.length > 0 && !isRunning && (
            <Button variant="ghost" onClick={onClear} disabled={deleteMut.isPending}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {(isRunning || live.message) && (
        <div className={styles.progress}>
          <div>
            <strong>{step ? (STEP_LABELS[step] ?? step) : 'Working'}</strong>
            {total > 0 && <span> — {progress}/{total} ({pct}%)</span>}
          </div>
          {live.message && <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>{live.message}</div>}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {errorMsg && !isRunning && (
        <div className={styles.errorBox}>⚠ {errorMsg}</div>
      )}

      {videos.length > 0 && (
        <>
          <div className={styles.sectionLabel}>
            Top {videos.length} Videos
            <span className={styles.sectionHint}>Tick để đưa thumbnail + transcript vào prompt</span>
          </div>
          <div className={styles.videoGrid}>
            {videos.map((v) => {
              const att = buildVideoAttachment(v);
              const id = videoAttachmentId(v.videoId);
              return (
                <VideoCard
                  key={v.videoId}
                  v={v}
                  onOpenImage={setLightbox}
                  checked={isAttached(id)}
                  onToggleVideo={att ? () => onToggleAttachment(att) : undefined}
                />
              );
            })}
          </div>
        </>
      )}

      {framesVideos.length > 0 && (
        <>
          <div className={styles.sectionLabel}>
            Random Frames — Top {framesVideos.length} Videos
            <span className={styles.sectionHint}>Tick từng frame để gắn vào prompt</span>
          </div>
          {framesVideos.map((v) => (
            <div key={v.videoId} className={styles.framesGroup}>
              <h4>#{v.rank} · {v.title}</h4>
              <div className={styles.framesRow}>
                {v.frames.map((f) => {
                  const fid = frameAttachmentId(v.videoId, f.idx);
                  const checked = isAttached(fid);
                  return (
                    <div key={f.idx} className={styles.frameWrap}>
                      <label className={styles.frameCheckbox}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleAttachment(buildFrameAttachment(v, f))}
                        />
                      </label>
                      <img
                        className={`${styles.frame} ${checked ? styles.frameChecked : ''}`}
                        src={f.url}
                        alt={`frame at ${f.timestampSec}s`}
                        onClick={() => setLightbox(f.url)}
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="enlarged" />
        </div>
      )}
    </Card>
  );
}

interface VideoCardProps {
  v: SpyVideoDto;
  onOpenImage: (u: string) => void;
  checked: boolean;
  onToggleVideo?: () => void;
}

function VideoCard({ v, onOpenImage, checked, onToggleVideo }: VideoCardProps) {
  const statusBadge = v.transcriptStatus !== 'ok'
    ? <span className={`${styles.statusBadge} ${styles[v.transcriptStatus] ?? ''}`}>transcript: {v.transcriptStatus}</span>
    : null;
  const disabled = !onToggleVideo;
  return (
    <div className={`${styles.videoCard} ${checked ? styles.videoCardChecked : ''}`}>
      <label className={styles.videoCheckbox} title={disabled ? 'Thumbnail chưa sẵn sàng' : 'Đưa video này vào prompt'}>
        <input type="checkbox" checked={checked} onChange={() => onToggleVideo?.()} disabled={disabled} />
        <span>Attach</span>
      </label>
      <div className={styles.thumbWrap}>
        {v.thumbnailUrl ? (
          <img
            className={styles.thumb}
            src={v.thumbnailUrl}
            alt={v.title}
            onClick={() => v.thumbnailUrl && onOpenImage(v.thumbnailUrl)}
            loading="lazy"
          />
        ) : (
          <div className={styles.thumb} />
        )}
      </div>
      <div className={styles.videoMeta}>
        <p className={styles.title}>#{v.rank} {v.title}</p>
        <div className={styles.stats}>
          <span>{fmtViews(v.viewCount)} views</span>
          <span>{fmtDuration(v.durationSec)}</span>
          {v.publishedAt && <span>{v.publishedAt}</span>}
          {statusBadge}
        </div>
        {v.transcript && (
          <details className={styles.transcript}>
            <summary>▼ Transcript ({v.transcript.length.toLocaleString()} chars)</summary>
            <div className={styles.text}>{v.transcript}</div>
          </details>
        )}
        <a
          href={`https://youtu.be/${v.videoId}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}
        >
          ↗ youtu.be/{v.videoId}
        </a>
      </div>
    </div>
  );
}

