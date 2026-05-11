import type { ChannelDto, StageId } from 'shared';

export type StageStatus = 'empty' | 'pending' | 'done';

// Port từ v3 line 1287 — getStageStatus.
// Note: scripts/scenes/inventory/scenePrompts/voice live in dedicated tables now,
// not on the channel. Until those hooks exist, those stages stay 'empty'.
export function getStageStatus(stageId: StageId, ch: ChannelDto | null): StageStatus {
  if (!ch) return 'empty';
  switch (stageId) {
    case 'overview':
      return 'done';
    case 'reference':
      return ch.refUrl || ch.refNotes || ch.refAnalysis ? 'done' : 'empty';
    case 'dna':
      return ch.dna.length > 100 ? 'done' : 'empty';
    case 'style':
      return ch.style.length > 100 ? 'done' : 'empty';
    case 'topics':
      return ch.topics.length > 100 ? 'done' : 'empty';
    case 'visual':
      // Wired in Week 2 Day 4 once visual-prompts hook exists. Default empty.
      return 'empty';
    case 'thumbnail':
      return ch.thumbnails.length > 0 ? 'done' : 'empty';
    case 'metadata':
      return ch.metadata.length > 0 ? 'done' : 'empty';
    case 'topic-gen':
    case 'script':
    case 'splitter':
    case 'inventory':
    case 'scene-prompts':
    case 'voice':
      return 'empty';
    default:
      return 'empty';
  }
}
