import type { ChannelDto, ScriptDto } from 'shared';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { downloadFile, safeFilename } from '../../lib/download.ts';
import { toast } from '../../store/toast.ts';

interface Props {
  open: boolean;
  channel: ChannelDto;
  currentScript: ScriptDto | null;
  nextScript: ScriptDto | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ScriptSwitchConfirmModal({
  open, channel, currentScript, nextScript, onCancel, onConfirm,
}: Props) {
  const onBackup = () => {
    if (!currentScript) return;
    const safe = safeFilename(currentScript.topic || 'untitled');
    const date = new Date(currentScript.createdAt).toISOString().substring(0, 10);
    const bundle = {
      _bundleType: 'faceless_studio_project',
      _bundleVersion: 1,
      _exportedAt: new Date().toISOString(),
      channel: {
        id: channel.id,
        name: channel.name,
        niche: channel.niche,
        lang: channel.lang,
        dna: channel.dna,
        style: channel.style,
        topics: channel.topics,
      },
      script: currentScript,
    };
    downloadFile(
      JSON.stringify(bundle, null, 2),
      `${safe}_${date}.faceless.json`,
      'application/json',
    );
    toast('Đã export project bundle', 'success');
  };

  return (
    <Modal
      open={open}
      title="Switch active script?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          {currentScript && (
            <Button variant="ghost" onClick={onBackup}>⬇ Backup current as JSON</Button>
          )}
          <Button variant="rust" onClick={onConfirm}>Switch script</Button>
        </>
      }
    >
      <p>
        Đổi active script sẽ làm Stage 08-13 (Splitter, Inventory, Scene Prompts, Voice,
        Thumbnail, Metadata) hiển thị data của script mới — data của script cũ vẫn còn
        trong DB nhưng workflow sẽ chuyển hướng.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Current:</strong>{' '}
        {currentScript ? (currentScript.topic || `Script ${currentScript.idx + 1}`) : '— (none)'}
      </p>
      <p>
        <strong>Switch to:</strong>{' '}
        {nextScript ? (nextScript.topic || `Script ${nextScript.idx + 1}`) : '— (none)'}
      </p>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
        Khuyến nghị: backup project hiện tại ra JSON trước khi switch.
      </p>
    </Modal>
  );
}
