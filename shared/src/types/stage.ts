// 14 stages — port từ faceless_studio_v3.html line 1073
// Architecture: FLAT (mỗi channel = 1 video active tại 1 thời điểm)

export type StageId =
  | 'overview'      // 00
  | 'reference'     // 01
  | 'dna'           // 02
  | 'style'         // 03
  | 'topics'        // 04
  | 'visual'        // 05
  | 'topic-gen'     // 06
  | 'script'        // 07
  | 'splitter'      // 08
  | 'inventory'     // 09
  | 'scene-prompts' // 10
  | 'voice'         // 11
  | 'thumbnail'     // 12
  | 'metadata';     // 13

export interface StageDef {
  id: StageId;
  num: string;
  name: string;
  icon: string;
  needsClaude: boolean;
  blockedBy?: StageId[];
}

export const STAGES: readonly StageDef[] = [
  { id: 'overview',      num: '00', name: 'Overview',         icon: '◐', needsClaude: false },
  { id: 'reference',     num: '01', name: 'Reference',        icon: '◇', needsClaude: true  },
  { id: 'dna',           num: '02', name: 'Channel DNA',      icon: '◆', needsClaude: true,  blockedBy: ['reference'] },
  { id: 'style',         num: '03', name: 'Style Guide',      icon: '◇', needsClaude: true,  blockedBy: ['dna'] },
  { id: 'topics',        num: '04', name: 'Topics File',      icon: '◆', needsClaude: true,  blockedBy: ['dna'] },
  { id: 'visual',        num: '05', name: 'Visual Prompts',   icon: '◇', needsClaude: true,  blockedBy: ['dna'] },
  { id: 'topic-gen',     num: '06', name: 'Topic Generator',  icon: '★', needsClaude: true,  blockedBy: ['topics'] },
  { id: 'script',        num: '07', name: 'Script Writer',    icon: '★', needsClaude: true,  blockedBy: ['dna', 'style'] },
  { id: 'splitter',      num: '08', name: 'Scene Splitter',   icon: '★', needsClaude: false, blockedBy: ['script'] },
  { id: 'inventory',     num: '09', name: 'Asset Inventory',  icon: '★', needsClaude: true,  blockedBy: ['splitter'] },
  { id: 'scene-prompts', num: '10', name: 'Scene Prompts',    icon: '★', needsClaude: true,  blockedBy: ['splitter', 'inventory'] },
  { id: 'voice',         num: '11', name: 'Create Voice',     icon: '♪', needsClaude: false, blockedBy: ['splitter'] },
  { id: 'thumbnail',     num: '12', name: 'Thumbnail',        icon: '★', needsClaude: true,  blockedBy: ['script'] },
  { id: 'metadata',      num: '13', name: 'Video Metadata',   icon: '★', needsClaude: true,  blockedBy: ['script'] },
] as const;

export const STAGE_BY_ID: Record<StageId, StageDef> = Object.fromEntries(
  STAGES.map(s => [s.id, s])
) as Record<StageId, StageDef>;
