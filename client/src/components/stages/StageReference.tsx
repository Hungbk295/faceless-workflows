import { useMemo, useState } from 'react';
import type { ChannelDto } from 'shared';
import { PageHeader } from '../layout/PageHeader.tsx';
import { Card } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import { Textarea } from '../ui/Textarea.tsx';
import { Button } from '../ui/Button.tsx';
import { ClaudeRunPanel } from '../ui/ClaudeRunPanel.tsx';
import { OutputCapture } from '../ui/OutputCapture.tsx';
import { useUpdateChannel } from '../../hooks/useChannels.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';
import { referencePrompt } from '../../lib/prompts/reference.ts';
import { composeAttachmentsBlock } from '../../lib/prompts/attachments.ts';
import { useClaudeBridge } from '../../hooks/useClaudeBridge.ts';
import { useAttachments } from '../../hooks/useAttachments.ts';
import { SpyChannelPanel } from '../spy/SpyChannelPanel.tsx';
import { AttachmentsPanel } from '../spy/AttachmentsPanel.tsx';

interface Props {
  channel: ChannelDto;
}

export function StageReference({ channel }: Props) {
  const updateMut = useUpdateChannel();
  const setActiveStage = useUiStore((s) => s.setActiveStage);

  const [refUrl, setRefUrl] = useState(channel.refUrl);
  const [refNotes, setRefNotes] = useState(channel.refNotes);

  const bridge = useClaudeBridge({ persistKey: `${channel.id}:reference` });
  const attachments = useAttachments(channel.id);

  const finalPrompt = useMemo(
    () => referencePrompt(channel) + composeAttachmentsBlock(attachments.items),
    [channel, attachments.items],
  );

  const dirtyInfo = refUrl !== channel.refUrl || refNotes !== channel.refNotes;

  const saveInfo = () => {
    updateMut.mutate(
      { id: channel.id, patch: { refUrl: refUrl.trim(), refNotes: refNotes.trim() } },
      {
        onSuccess: () => toast('Đã lưu reference info', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  const saveAnalysis = (next: string) => {
    updateMut.mutate(
      { id: channel.id, patch: { refAnalysis: next.trim() } },
      {
        onSuccess: () => toast('Đã lưu analysis', 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[channel.name, 'Stage 01', 'Reference Analysis']}
        title={<>Reference <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--rust)' }}>Analysis</span></>}
        subtitle="Phân tích sâu kênh tham chiếu để hiểu công thức thành công của họ. Output sẽ làm input cho Stage 02 (DNA)."
      />

      <Card label="Step 01" title="Cập nhật reference URL">
        <Input
          label="Reference Channel URL"
          id="ref-url"
          value={refUrl}
          onChange={(e) => setRefUrl(e.target.value)}
          placeholder="https://youtube.com/@channelname"
        />
        <Textarea
          label="Notes (optional)"
          id="ref-notes"
          value={refNotes}
          onChange={(e) => setRefNotes(e.target.value)}
          placeholder="Quick notes về kênh này..."
          style={{ minHeight: 120 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button
            variant="rust"
            onClick={saveInfo}
            disabled={!dirtyInfo || updateMut.isPending}
          >
            {updateMut.isPending ? 'Saving…' : '💾 Save Reference Info'}
          </Button>
        </div>
      </Card>

      <SpyChannelPanel
        channel={channel}
        isAttached={attachments.isAttached}
        onToggleAttachment={attachments.toggle}
      />

      <Card
        label="Step 02"
        title="Chạy prompt qua Claude"
      >
        <p>
          Hai cách dùng:{' '}
          <strong>▶ Run Claude</strong> để gọi <code>claude -p</code> local (chờ chạy xong rồi hiện output), hoặc{' '}
          <strong>📋 Copy</strong> paste vào{' '}
          <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--rust)' }}>
            claude.ai
          </a>.
        </p>
        <AttachmentsPanel
          items={attachments.items}
          onRemove={attachments.removeFile}
          onUploadFile={attachments.uploadFile}
          onSaveToFolderNative={attachments.saveToFolderNative}
          lastSavedFolder={attachments.lastSavedFolder}
          onOpenFolder={attachments.openSavedFolder}
        />
        <ClaudeRunPanel
          bridge={bridge}
          prompt={finalPrompt}
          promptLabel="Prompt — Reference Analysis"
        />
      </Card>

      <Card label="Step 03" title="Output từ Claude (hoặc paste)">
        <p>
          Nếu dùng <strong>Run Claude</strong>, output sẽ tự fill vào ô dưới sau khi claude chạy xong. Nếu dùng claude.ai, copy
          toàn bộ output rồi paste vào đây.
        </p>
        <OutputCapture
          label="Reference Analysis Output"
          value={channel.refAnalysis}
          onSave={saveAnalysis}
          saving={updateMut.isPending}
          minHeight={280}
          placeholder="Paste output từ Claude, hoặc click ▶ Run Claude ở trên..."
          streamedText={bridge.status === 'done' ? bridge.output : null}
          isStreaming={bridge.status === 'loading'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setActiveStage('dna')}>
            Tiếp Stage 02 (DNA) →
          </Button>
        </div>
      </Card>
    </>
  );
}
