import type { ChannelDto } from 'shared';

export type StructureKey =
  | 'levels-escalation'
  | 'acts-story-arc'
  | 'timeline-chronological'
  | 'chapters-topic-based'
  | 'parts-flexible'
  | 'auto'
  | 'custom';

export type PovKey =
  | 'mixed-1-2-3'
  | 'mixed-2-3'
  | '2nd'
  | '3rd'
  | 'narrator'
  | 'custom';

export interface ScriptWriterParams {
  topic: string;
  hook: string;
  angle: string;
  pillar: string;        // 'P1' | 'P2' | 'P3' OR real name
  minutes: number;
  structure: StructureKey;
  sections: string;      // 'auto' | '5' | '6' | ...
  pov: PovKey;
  customStructure: string;
}

const STRUCTURE_MAP: Record<StructureKey, string> = {
  'levels-escalation':     'LEVELS — Escalation (POV-driven). Mỗi phần là 1 nấc thang/level mới với POV escalating. Format: ## [LEVEL N — TÊN | mm:ss-mm:ss]',
  'acts-story-arc':        'ACTS — Story Arc (3-5 acts). Setup → Rising → Climax → Resolution. Format: ## [ACT N — TÊN | mm:ss-mm:ss]',
  'timeline-chronological':'TIMELINE — Chronological. Theo dòng thời gian rõ ràng. Format: ## [TIMELINE: 1900 / 1950 / 2000 — TÊN | mm:ss-mm:ss]',
  'chapters-topic-based':  'CHAPTERS — Topic-based. Mỗi chapter là 1 sub-topic độc lập. Format: ## [CHAPTER N — TÊN | mm:ss-mm:ss]',
  'parts-flexible':        'PARTS — Flexible (DNA default). Theo Video Structure trong Channel DNA. Format: ## [PHẦN N — TÊN | mm:ss-mm:ss]',
  'auto':                  'AUTO — Bạn TỰ QUYẾT cấu trúc phù hợp nhất với topic này (cân nhắc: topic dạng narrative dùng Acts, dạng comparison dùng Chapters, dạng historical dùng Timeline). Giải thích lựa chọn ở đầu output.',
  'custom':                '[CUSTOM STRUCTURE — chưa nhập]',
};

const POV_MAP: Record<PovKey, string> = {
  'mixed-1-2-3': 'Hỗn hợp: 50% ngôi 1 ("tôi"), 30% ngôi 2 ("bạn"), 20% ngôi 3. Narrator dùng "tôi" (KHÔNG "mình"), audience là "bạn" (KHÔNG "anh/em").',
  'mixed-2-3':   'Hỗn hợp 70% ngôi 2 + 30% ngôi 3. Audience là "bạn", các nhân vật khác kể ngôi 3.',
  '2nd':         'Ngôi 2 chủ đạo ("bạn"). Tất cả hành động hướng về viewer.',
  '3rd':         'Ngôi 3 chủ đạo. Kể về nhân vật/sự kiện ở góc nhìn observer.',
  'narrator':    'Narrator omniscient. Không xưng "tôi/mình", dẫn dắt như voice-over documentary.',
  'custom':      'Theo Voice Rules trong Style Guide (mục 2 và mục 3 — Voice Rules Block).',
};

const DATA_KEYWORDS = [
  'số liệu', 'thống kê', 'nghiên cứu', 'khoa học', 'lịch sử',
  'năm 19', 'năm 20', '%', 'who', 'bộ y tế', 'fda',
  'báo cáo', 'survey', 'data', 'tỷ lệ', 'phần trăm',
];

export const DEFAULT_SCRIPT_PARAMS: ScriptWriterParams = {
  topic: '', hook: '', angle: '', pillar: 'P1', minutes: 18,
  structure: 'auto', sections: 'auto', pov: 'mixed-1-2-3', customStructure: '',
};

// Port từ v3 PROMPTS.scriptWriter (line 2053). Template literal copied verbatim.
export function scriptWriterPrompt(ch: ChannelDto, params: ScriptWriterParams): string {
  const structure = params.structure;
  const sections = params.sections;
  const pov = params.pov;
  const sectionsLabel = sections === 'auto'
    ? 'AUTO (bạn tự quyết, lý tưởng 6-9 phần cho video 18 phút)'
    : `${sections} phần`;

  const topicLower = (params.topic || '').toLowerCase();
  const needsData = DATA_KEYWORDS.some((k) => topicLower.includes(k));

  const minutes = params.minutes || 18;
  const structureDesc = structure === 'custom'
    ? (params.customStructure || STRUCTURE_MAP.custom)
    : STRUCTURE_MAP[structure];

  return `Bạn là biên kịch YouTube faceless cho kênh "${ch.name}". Viết script tự nhiên, có MÀU SẮC RIÊNG của kênh — không phải template chung.

═══ NGUYÊN TẮC TỐI THƯỢNG ═══

Script PHẢI mang đậm chất riêng của kênh này — bám sát:
1. **Channel DNA** (file 02 trong project knowledge) — giọng kể, cốt lõi, persona
2. **Style Guide** (file 03) — Voice Rules, từ vựng cấm/dùng, ngôi xưng
3. **Topics file** (file 04) — pillar context, công thức title

KHÔNG viết kiểu báo chí trung lập. KHÔNG dùng giọng giáo viên. Viết như chính narrator của kênh đang ngồi kể.

═══ CONTEXT ═══

- Channel: ${ch.name}
- Niche: ${ch.niche || '[chưa có]'}
- 4 files đã upload: DNA, Style Guide, Topics, Visual Prompts

═══ TOPIC ═══

- Chủ đề: ${params.topic || '[DÁN TOPIC]'}
- Hook gợi ý: ${params.hook || '[DÁN HOOK]'}
- Góc kể: ${params.angle || '[DÁN ANGLE]'}
- Pillar: ${params.pillar || 'P?'}

═══ THAM SỐ ═══

- Target: ${minutes} phút (~${minutes * 130}-${minutes * 150} từ)
- Số phần: ${sectionsLabel}
- Cấu trúc: ${structureDesc}
- POV: ${POV_MAP[pov]}

═══ DATA & RESEARCH (LINH HOẠT — không phải bắt buộc) ═══

${needsData
  ? `Topic này CÓ vẻ cần số liệu. Nếu thật sự cần (ví dụ: lịch sử có năm cụ thể, claim khoa học, dẫn nghiên cứu) → search web và trích nguồn rõ ràng. Nếu không thật sự cần → bỏ qua, đừng nhồi data giả.`
  : `Topic này nghiêng về kể chuyện / chia sẻ trải nghiệm / mẹo vặt. KHÔNG cần data hay research. Chỉ search web nếu bạn tự thấy có 1-2 fact cụ thể (năm/tên/số) sẽ làm câu chuyện thuyết phục hơn. Nếu không có thì viết theo wisdom + trải nghiệm của persona, đó mới là chất kênh.`}

Quy tắc data:
- CÓ data → trích nguồn rõ (tên + năm), đặt ở phần "📚 NGUỒN" cuối script
- KHÔNG data → KHÔNG bịa số. Persona kể từ "tôi nhớ", "ông tôi từng nói", "bà Sáu cuối xóm tôi" — credibility đến từ nhân chứng + chi tiết sống động, không phải con số
- KHÔNG ép buộc 5-7 facts như script khoa học

═══ NHIỆM VỤ ═══

${needsData
  ? `1. **Research nhẹ:** 1-3 search query nếu cần verify fact cụ thể (KHÔNG cần 5-7 facts như báo cáo)
2. **Outline:** dàn ý phù hợp Channel DNA
3. **Script:** viết bằng giọng riêng của kênh`
  : `1. **Outline:** dàn ý phù hợp Channel DNA — KHÔNG cần research phase
2. **Script:** viết bằng giọng riêng của kênh, trải nghiệm + chi tiết sống động`}

═══ OUTPUT FORMAT (app cần parse) ═══

# SCRIPT — ${params.topic || '[TOPIC]'}

> **Channel:** ${ch.name}
> **Pillar:** ${params.pillar || 'P?'}
> **Target:** ${minutes} phút
> **Structure:** ${structure}
> **POV:** ${pov}

${needsData
  ? `## 📚 RESEARCH (nếu có)

### Key Facts
[Chỉ liệt kê fact thật sự dùng trong script + nguồn URL. Nếu không cần thì bỏ trống section này.]

`
  : ''}## 🗺️ OUTLINE

[Bảng phần × timestamp × word count]

## 🎬 SCRIPT

[QUAN TRỌNG: heading phải đúng "## 🎬 SCRIPT" hoặc "## SCRIPT" để app tách. Sau heading này, các sections theo format đã chọn:]

### [PHẦN 1 — HOOK | 0:00-0:45 | ~110 từ]
[Lời thoại VO. Có thể có:
- [VISUAL: ...] trên dòng riêng — gợi ý hình
- [B-ROLL: ...] / [NHẠC: ...] trên dòng riêng
- [pause 1s] / [pause 2s] inline
- **bold** cho emphasis
- [NHẤN MẠNH: "câu"]]

### [PHẦN 2 — ... | mm:ss-mm:ss | ~XXX từ]
[Tương tự]

[... các sections còn lại ...]

${needsData
  ? `## 📚 NGUỒN TRÍCH DẪN

[List nguồn nếu có dùng — app dùng heading này làm điểm KẾT THÚC SCRIPT]

`
  : `## 📚 NGUỒN TRÍCH DẪN

(Không có — script này không cần dẫn nguồn)

`}## ✅ CHECKLIST CHANNEL DNA

[Bảng tự check: voice rules tuân chưa? persona đúng chưa? POV nhất quán chưa? ngôi xưng đúng chưa?]

## 📊 STATS

[Word count + phút ước lượng]

═══ NGUYÊN TẮC TUÂN STYLE GUIDE ═══

✅ DO:
- Bám sát Voice Rules trong Style Guide (ngôi xưng, từ ngữ persona)
- Mở bằng hook ngay — không chào mở đầu
- Storytelling cá nhân 2-3 lần — đặc trưng của kênh
- Câu cuối có teaser/đọng lại
${needsData ? '- Số liệu (nếu dùng) có nguồn rõ ràng' : '- KHÔNG cần số liệu — sống bằng chi tiết + trải nghiệm'}

❌ DON'T:
- KHÔNG viết kiểu báo chí trung lập / kiểu giáo viên
- KHÔNG dùng từ Tây không cần thiết (okay, actually, guys)
- KHÔNG hype rỗng (INCREDIBLE, WOW, SỐC)
- KHÔNG kết kiểu vlog ("Cảm ơn đã xem", "Like và subscribe")
- KHÔNG emoji trong narration
- KHÔNG bịa số liệu để làm script "có vẻ" thuyết phục

═══ FORMAT MARKERS (cho voice AI) ═══

- \`[pause 1s]\` — dừng nhẹ
- \`[pause 2s]\` — trước reveal lớn
- \`**TỪ ĐẬM**\` — nhấn
- \`...\` — kéo dài
- \`[VISUAL: ...]\` — gợi ý hình cho editor

═══ BẮT ĐẦU ═══

Tổng SCRIPT ≥ ${minutes * 130} từ. Viết bằng GIỌNG của kênh, không phải giọng AI generic.

Bắt đầu ngay.`;
}
