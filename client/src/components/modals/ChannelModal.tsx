import { useState, type FormEvent } from 'react';
import type { ChannelDto, Lang } from 'shared';
import { Modal } from '../ui/Modal.tsx';
import { Input } from '../ui/Input.tsx';
import { Select } from '../ui/Select.tsx';
import { Button } from '../ui/Button.tsx';
import {
  useChannels,
  useCreateChannel,
  useUpdateChannel,
} from '../../hooks/useChannels.ts';
import { useUiStore } from '../../store/ui.ts';
import { toast } from '../../store/toast.ts';

interface FormState {
  name: string;
  niche: string;
  lang: Lang;
  refUrl: string;
}

const EMPTY_FORM: FormState = { name: '', niche: '', lang: 'vi', refUrl: '' };

function fromChannel(ch: ChannelDto): FormState {
  return { name: ch.name, niche: ch.niche, lang: ch.lang, refUrl: ch.refUrl };
}

export function ChannelModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const setActiveChannel = useUiStore((s) => s.setActiveChannel);

  const editing = modal?.kind === 'channel-edit';
  const open = modal?.kind === 'channel-create' || modal?.kind === 'channel-edit';
  const channelId = modal?.channelId;

  const channelsQ = useChannels();
  const editTarget: ChannelDto | undefined =
    editing && channelId
      ? channelsQ.data?.find((c) => c.id === channelId)
      : undefined;

  const [form, setForm] = useState<FormState>(
    editTarget ? fromChannel(editTarget) : EMPTY_FORM,
  );

  const createMut = useCreateChannel();
  const updateMut = useUpdateChannel();
  const busy = createMut.isPending || updateMut.isPending;

  // Re-seed form when modal target changes
  const seedKey = editTarget ? editTarget.id : (open ? 'create' : 'closed');
  const [lastKey, setLastKey] = useState<string>('closed');
  if (seedKey !== lastKey) {
    setLastKey(seedKey);
    setForm(editTarget ? fromChannel(editTarget) : EMPTY_FORM);
  }

  if (!open) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast('Cần nhập tên kênh', 'error');
      return;
    }

    if (editing && channelId) {
      updateMut.mutate(
        { id: channelId, patch: { name, niche: form.niche.trim(), lang: form.lang, refUrl: form.refUrl.trim() } },
        {
          onSuccess: () => {
            toast('Đã cập nhật kênh', 'success');
            closeModal();
          },
          onError: (err) => toast(err.message, 'error'),
        },
      );
      return;
    }

    createMut.mutate(
      { name, niche: form.niche.trim(), lang: form.lang },
      {
        onSuccess: (created) => {
          // Persist refUrl on the freshly created channel if provided.
          const refUrl = form.refUrl.trim();
          if (refUrl) {
            updateMut.mutate({ id: created.id, patch: { refUrl } });
          }
          setActiveChannel(created.id);
          toast('Đã tạo kênh mới', 'success');
          closeModal();
        },
        onError: (err) => toast(err.message, 'error'),
      },
    );
  };

  return (
    <Modal
      open={open}
      title={editing ? 'Edit Channel' : 'New Channel'}
      onClose={closeModal}
      footer={
        <>
          <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
          <Button variant="rust" onClick={onSubmit} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <Input
          label="Channel Name"
          id="ch-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Mystery Tales / Nature Wisdom / Tech Decoded"
          autoFocus
        />
        <Input
          label="Niche / Topic Area"
          id="ch-niche"
          value={form.niche}
          onChange={(e) => setForm({ ...form, niche: e.target.value })}
          placeholder="e.g. ancient survival skills + DIY + folklore"
        />
        <Select
          label="Language"
          id="ch-lang"
          value={form.lang}
          onChange={(e) => setForm({ ...form, lang: e.target.value as Lang })}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="other">Other</option>
        </Select>
        <Input
          label="Reference Channel URL (optional)"
          id="ch-ref"
          value={form.refUrl}
          onChange={(e) => setForm({ ...form, refUrl: e.target.value })}
          placeholder="https://youtube.com/@channelname"
        />
        {/* Hidden submit so Enter key submits */}
        <button type="submit" style={{ display: 'none' }} aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
