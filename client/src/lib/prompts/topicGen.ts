import type { ChannelDto } from 'shared';
import { getAllPillarNames } from '../extractors/topics.ts';

export type PillarSelection = 'MIXED' | 'P1' | 'P2' | 'P3';

export interface TopicGenParams {
  count: number;
  pillar: PillarSelection;
  focus: string;
  note: string;
}

export const DEFAULT_TOPIC_GEN_PARAMS: TopicGenParams = {
  count: 10,
  pillar: 'MIXED',
  focus: 'CTR cao nhất',
  note: '',
};

// Port từ v3 PROMPTS.topicGen (line 1957). Template literal copied verbatim.
export function topicGenPrompt(ch: ChannelDto, params: TopicGenParams): string {
  const count = params.count;
  const pillar = params.pillar;
  const pillarNames = getAllPillarNames(ch);

  let pillarDist: string;
  if (pillar === 'MIXED') {
    const perPillar = Math.ceil(count / 3);
    pillarDist = `**MIXED — phân bổ đều 3 pillars:**
- ${pillarNames[0]}: khoảng ${perPillar} topics
- ${pillarNames[1]}: khoảng ${perPillar} topics
- ${pillarNames[2]}: khoảng ${count - 2 * perPillar} topics
QUAN TRỌNG: BẮT BUỘC có topics từ CẢ 3 PILLARS. Không được tập trung 1 pillar duy nhất.
Nếu file CHU_DE đã có topics nghiêng về 1 pillar, hãy tạo topics MỚI ở 2 pillars còn lại để cân bằng.`;
  } else {
    const idx = parseInt(pillar.replace(/\D/g, ''), 10) || 1;
    const name = pillarNames[idx - 1] ?? pillar;
    pillarDist = `**${name} only** — tất cả ${count} topics đều thuộc pillar này.`;
  }

  return `Bạn là content ideator. Tạo ${count} topics MỚI cho kênh, tham khảo topics đã có trong file CHU_DE đã upload.

═══ CONTEXT (4 files đã có trong project) ═══

- Channel: ${ch.name}
- Niche: ${ch.niche || '[NICHE]'}
- DNA, Style Guide, Topics file, 4 Visual Prompts đã được upload trong Project Knowledge.

═══ 3 PILLARS CỦA KÊNH ═══

1. ${pillarNames[0]}
2. ${pillarNames[1]}
3. ${pillarNames[2]}

═══ THAM SỐ BẮT BUỘC ═══

📊 **Số topics:** CHÍNH XÁC ${count} topics. KHÔNG nhiều hơn, KHÔNG ít hơn.

🎯 **Pillar distribution:**
${pillarDist}

🔥 **Focus:** ${params.focus || 'CTR cao nhất'}

📝 **Yêu cầu bổ sung:** ${params.note || '(không có)'}

═══ OUTPUT FORMAT (BẮT BUỘC — app parse bảng này) ═══

# ${count} TOPICS MỚI — ${ch.name}

| # | Chủ đề | Title (Formula) | Hook câu đầu | Góc kể unique | Pillar | Score CTR /50 |
|---|---|---|---|---|---|---|
| 1 | [chủ đề ngắn] | "[title đầy đủ]" (A) | *"[hook 30-50 từ]"* | [angle 5-10 từ] | ${pillarNames[0]} | 47/50 |
| 2 | [...] | "[...]" (B) | *"[...]"* | [...] | ${pillarNames[1]} | 45/50 |
[...lặp lại đủ ${count} hàng...]

QUAN TRỌNG: bảng PHẢI có đủ ${count} hàng dữ liệu (chưa tính header + separator).

## TOP 3 RECOMMENDATION
1. **#X — [title]** — [lý do 1 câu]
2. **#Y — [title]** — [lý do 1 câu]
3. **#Z — [title]** — [lý do 1 câu]

## ANGLE ĐỘC ĐÁO (cho 3 topics top)
[3 paragraphs, mỗi cái 3-5 câu, giải thích góc chưa kênh nào ở thị trường target làm]

## HOOK SENTENCE
[Hook 50-80 từ cho topic #1 (RECOMMEND), theo benchmark passages từ Style Guide. Phân tích kỹ thuật ngắn ở dưới.]

═══ QUY TẮC ═══

1. **Title BẮT BUỘC theo Formula A/B/C/D/E** từ DNA, ghi rõ "(A)", "(B)" ở cuối title
2. **Title có số liệu cụ thể** (năm, %, giá VND, tên người) — nếu topic phù hợp
3. **Title KHÔNG hype rỗng** (không "INCREDIBLE", "SỐC", "WOW")
4. **Hook theo 1 trong 3 Hook Types** từ DNA
5. **Tone tuân Voice Rules** từ Style Guide
6. **Conspiracy claim phải có năm + đạo luật/tổ chức cụ thể**
7. **Pillar distribution PHẢI theo đúng phân bổ** đã yêu cầu ở trên
8. **Pillar column** dùng TÊN THẬT của pillar ("${pillarNames[0]}" / "${pillarNames[1]}" / "${pillarNames[2]}") — KHÔNG dùng "P1"/"P2"/"P3"

═══ COUNT VERIFICATION (làm trước khi submit) ═══

Trước khi gửi output cuối, đếm lại:
- Tổng số topics trong bảng = ${count}? ✓
${pillar === 'MIXED' ? `- Topics từ cả 3 pillars (${pillarNames.join(', ')}) đều có? ✓
- Phân bổ KHÔNG lệch 1 pillar quá ${Math.ceil(count * 0.5)} topics? ✓` : ''}
- Mọi title có Formula A/B/C/D/E? ✓
- Mọi hook < 50 từ? ✓

Nếu sai 1 trong những thứ trên → SỬA TRƯỚC KHI GỬI.

Bắt đầu.`;
}
