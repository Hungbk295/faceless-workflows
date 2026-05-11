import type { ChannelDto } from 'shared';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { StageOverview } from '../stages/StageOverview.tsx';
import { StageReference } from '../stages/StageReference.tsx';
import { StageDNA } from '../stages/StageDNA.tsx';
import { StageStyle } from '../stages/StageStyle.tsx';
import { StageTopics } from '../stages/StageTopics.tsx';
import { StageVisual } from '../stages/StageVisual.tsx';
import { StageTopicGen } from '../stages/StageTopicGen.tsx';
import { StageScript } from '../stages/StageScript.tsx';
import { StageSplitter } from '../stages/StageSplitter.tsx';
import { StageInventory } from '../stages/StageInventory.tsx';
import { StageScenePrompts } from '../stages/StageScenePrompts.tsx';
import { StageVoice } from '../stages/StageVoice.tsx';
import { StageThumbnail } from '../stages/StageThumbnail.tsx';
import { StageMetadata } from '../stages/StageMetadata.tsx';
import { useChannels } from '../../hooks/useChannels.ts';
import { useUiStore } from '../../store/ui.ts';
import styles from './Main.module.css';

export function Main() {
  const channelsQ = useChannels();
  const activeChannelId = useUiStore((s) => s.activeChannelId);
  const activeStage = useUiStore((s) => s.activeStage);
  const openModal = useUiStore((s) => s.openModal);

  const channels = channelsQ.data ?? [];
  const activeChannel: ChannelDto | null =
    channels.find((c) => c.id === activeChannelId) ?? null;

  return (
    <main className={styles.main}>
      {channelsQ.isError && (
        <div className={styles.placeholder}>
          Error loading channels: {channelsQ.error.message}
        </div>
      )}

      {activeStage === 'overview' && (
        <StageOverview channel={activeChannel} channelCount={channels.length} />
      )}

      {activeStage !== 'overview' && !activeChannel && (
        <EmptyState
          icon="∅"
          title="Chưa chọn kênh"
          action={
            <Button variant="rust" onClick={() => openModal({ kind: 'channel-create' })}>
              + New Channel
            </Button>
          }
        >
          Tạo hoặc chọn 1 kênh ở sidebar để bắt đầu.
        </EmptyState>
      )}

      {activeStage === 'reference' && activeChannel && <StageReference channel={activeChannel} />}
      {activeStage === 'dna' && activeChannel && <StageDNA channel={activeChannel} />}
      {activeStage === 'style' && activeChannel && <StageStyle channel={activeChannel} />}
      {activeStage === 'topics' && activeChannel && <StageTopics channel={activeChannel} />}
      {activeStage === 'visual' && activeChannel && <StageVisual channel={activeChannel} />}
      {activeStage === 'topic-gen' && activeChannel && <StageTopicGen channel={activeChannel} />}
      {activeStage === 'script' && activeChannel && <StageScript channel={activeChannel} />}
      {activeStage === 'splitter' && activeChannel && <StageSplitter channel={activeChannel} />}
      {activeStage === 'inventory' && activeChannel && <StageInventory channel={activeChannel} />}
      {activeStage === 'scene-prompts' && activeChannel && <StageScenePrompts channel={activeChannel} />}
      {activeStage === 'voice' && activeChannel && <StageVoice channel={activeChannel} />}
      {activeStage === 'thumbnail' && activeChannel && <StageThumbnail channel={activeChannel} />}
      {activeStage === 'metadata' && activeChannel && <StageMetadata channel={activeChannel} />}
    </main>
  );
}
