import type { ChannelDto } from 'shared';

export interface MetadataParams {
  topic: string;
  pillar: string;
  script: string;
}

export const DEFAULT_METADATA_PARAMS: MetadataParams = {
  topic: '',
  pillar: 'P1',
  script: '',
};

/** Stage 13 — YouTube Metadata. Port từ v3 PROMPTS.metadata line 2536. */
export function metadataPrompt(channel: ChannelDto, params: MetadataParams): string {
  const scriptBlock = params.script
    ? '--- SCRIPT ---\n' + params.script.substring(0, 6000) + '\n---'
    : '';
  return `Bạn là YouTube SEO + content optimization expert. Tạo metadata YouTube tối ưu CTR + SEO.

═══ CONTEXT ═══

- Channel: ${channel.name}
- DNA + Style Guide trong Project Knowledge

═══ INPUT ═══

- Topic: ${params.topic || '[DÁN TOPIC]'}
- Pillar: ${params.pillar || 'P?'}
- Script: ${params.script ? 'XEM DƯỚI' : '[PASTE SCRIPT]'}

${scriptBlock}

═══ OUTPUT FORMAT ═══

# YOUTUBE METADATA — [TOPIC]

## 1. TITLE OPTIONS (5 cho A/B test)

[5 titles, mỗi cái dùng 1 Formula khác từ DNA]

- **Option 1 (Formula A):** "[title]"
- **Option 2 (Formula B):** "[title]"
- **Option 3 (Formula C):** "[title]"
- **Option 4 (Formula D):** "[title]"
- **Option 5 (Formula E):** "[title]"

→ **RECOMMEND:** Option [X]
→ **Lý do:** [2-3 câu]

## 2. DESCRIPTION

\`\`\`
[100-150 từ đầu (CRITICAL cho SEO)]

[Hook recap 1-2 câu]
[5-7 câu giải thích vấn đề + giải pháp + ai nên xem]

📍 CHƯƠNG (CHAPTERS)
00:00 [Phần 1 title]
00:45 [...]
[8 chapters]

📚 NGUỒN TRÍCH DẪN
1. [Source 1]
[3-5 nguồn]

🎬 SERIES TƯƠNG TỰ
📌 [Link series]

💬 BÌNH LUẬN
[Câu hỏi engagement cụ thể]

#brandtag #pillartag #topictag (3-5 hashtags)

⚠️ [Disclaimer phù hợp pillar]
\`\`\`

## 3. TAGS (cho ô Tags ẩn YouTube — < 500 ký tự)

\`\`\`
[Liệt kê 15-25 tags, comma-separated:
- Brand tags (5)
- Topic tags (8-10)
- Niche tags (5)
- Long-tail (5)]
\`\`\`

## 4. PINNED COMMENT

\`\`\`
[Comment 50-80 từ, ngữ điệu persona kênh, có question engagement, KHÔNG xin like/sub]
\`\`\`

## 5. END SCREEN SUGGESTIONS

- Video 1 (cùng pillar): [topic gợi ý]
- Video 2 (pillar khác): [topic gợi ý]

## 6. SEO ANALYSIS

- **Primary keyword:** [...]
- **Search volume estimate:** low/medium/high
- **Competition (top 3 channels):** [...]
- **Differentiation angle:** [...]

═══ QUY TẮC ═══

1. Title ≤ 70 ký tự (YouTube cắt sau 70)
2. Description 100 ký tự đầu chứa primary keyword
3. KHÔNG hype rỗng
4. KHÔNG brand cụ thể (EVN → "ngành điện", Vinmart → "siêu thị lớn")
5. Disclaimer obligatory cho health/DIY topics
6. Hashtags 3-5 max (không spam)

Bắt đầu.`;
}
