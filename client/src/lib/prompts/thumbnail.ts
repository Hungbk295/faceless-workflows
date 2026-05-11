import type { ChannelDto } from 'shared';

export interface ThumbnailParams {
  title: string;
  insight: string;
  pillar: string;
  number: string;
}

export const DEFAULT_THUMBNAIL_PARAMS: ThumbnailParams = {
  title: '',
  insight: '',
  pillar: 'P1',
  number: '',
};

/** Stage 12 — Thumbnail concepts. Port từ v3 PROMPTS.thumbnail line 2427. */
export function thumbnailPrompt(channel: ChannelDto, params: ThumbnailParams): string {
  return `Bạn là thumbnail designer YouTube. Tạo 3 THUMBNAIL CONCEPT VARIATIONS cho video.

═══ CONTEXT ═══

- Channel: ${channel.name}
- Style Guide mục 6 (Thumbnail Text Bank, Composition Rules) + 4 Visual Prompts có trong Project Knowledge.

═══ INPUT ═══

- Topic title: ${params.title || '[DÁN TITLE]'}
- Key insight (cái shock viewer): ${params.insight || '[KEY SHOCK]'}
- Pillar: ${params.pillar || 'P?'}
- Số liệu shock chính: ${params.number || '[NUMBER]'}

═══ 9 FORMATS (chọn 1 cho mỗi concept) ═══

1. CHARACTER + PROP — close-up nhân vật + key object
2. CHARACTER GROUP — 3-5 nhân vật xếp hàng
3. SPLIT / BEFORE-AFTER — chia frame 2 phần
4. CONSPIRACY BOARD — character + red strings + photos
5. POWER NETWORK — center character + lines
6. CONCEPTUAL SYMBOL — 1 symbol khổng lồ (no character)
7. VISUAL NARRATIVE — image tự kể, no text
8. CHARACTER PORTRAIT — close-up khuôn mặt 70%
9. EMPIRE OVERVIEW — character GIANT + miniature

═══ OUTPUT FORMAT (3 concepts) ═══

# 3 THUMBNAIL CONCEPTS — [TITLE]

## CONCEPT 1: [FORMAT NAME] — [Strategic angle]

### G-LABS PROMPT (gen ảnh nền 1280x720)
\`\`\`
[Detailed visual prompt 100-150 từ:
- Nhân vật chính từ charStyle (rút gọn)
- Background dramatic phù hợp topic
- Composition: rule of thirds
- Empty space cho text overlay
- Aesthetic painterly + palette từ Style Guide
- 16:9]
\`\`\`

### NEGATIVE PROMPT
\`\`\`
no text on image, no words, no logos, no watermark, [+ specific avoids]
\`\`\`

### TEXT OVERLAY DESIGN

**Top text:** "[CHỌN TỪ THUMBNAIL TEXT BANK]"
- Font: [từ Style Guide]
- Color: [hex từ palette]
- Size: 25-30% width
- Position: top center/left

**Bottom text:** "[CONSPIRACY/TWIST]"
- Font, Color, Size, Position

**Number/highlight:** "[NUMBER]"
- Font: 1.5x size · Color: vàng + viền đỏ · Position: center mid-right

**Yellow arrow:** từ character → solution (Size ≥ 15% width)

### CTR PREDICTION
- Pattern interrupt (1-10): X
- Mobile readability: ✅/⚠️
- Brand recognition: ✅/❌
- Risk: [...]

### A/B TEST SUGGESTION
- Variation A: [main]
- Variation B: [thay 1 element]

## CONCEPT 2: [FORMAT KHÁC] — [Strategic angle]
[Tương tự]

## CONCEPT 3: [FORMAT KHÁC] — [Strategic angle]
[Tương tự]

## RECOMMENDATION
[Concept nào best CTR + lý do 2-3 câu]

═══ QUY TẮC ═══

1. Nhân vật chính xuất hiện 100% (trừ format Conceptual Symbol)
2. ≥ 2/3 brand markers từ DNA Protagonist
3. Palette chỉ 3 màu chủ đạo từ Style Guide
4. Number trong khung viền
5. Contrast tối đa: dark BG + chữ vàng + viền đen 6-8px

═══ AVOID ═══

- Quá nhiều text (>3 cụm)
- Stock-photo style
- Cười toe toét (off-tone)
- Real brands/logos
- Trẻ em làm focus
- Phụ nữ ăn mặc gợi cảm

Bắt đầu.`;
}
