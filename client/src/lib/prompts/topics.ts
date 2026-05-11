import type { ChannelDto } from 'shared';

// Port từ v3 PROMPTS.topics (line 1715). Template literal copied verbatim.
export function topicsPrompt(ch: ChannelDto): string {
  const dnaInjection = ch.dna
    ? '\n--- DNA SUMMARY ---\n' + ch.dna.substring(0, 2000) + '\n---\n'
    : '';

  return `Bạn là content strategist cho YouTube. Dựa trên Channel DNA + Style Guide đã có, tạo file CHỦ ĐỀ hoàn chỉnh với tối thiểu 24 topics.

═══ CONTEXT ═══

- Kênh: ${ch.name}
- Niche: ${ch.niche || '[NICHE]'}
${dnaInjection}

═══ NHIỆM VỤ ═══

Tạo 6 mục theo format CHÍNH XÁC bên dưới. App sẽ parse Topic Categories để feed vào Topic Generator.

═══ OUTPUT FORMAT (BẮT BUỘC) ═══

# CHỦ ĐỀ — ${ch.name}

## 1. TOPIC CATEGORIES

[Đầu tiên define 3-4 pillars dựa trên niche, mỗi pillar 8 topics. Format BẮT BUỘC như sau:]

### 🏠 PILLAR 1 — [TÊN PILLAR] (XX%)

| # | Chủ đề | Title (Formula A/B/C/D/E từ DNA) | Hook câu đầu | Góc kể unique | Dạng | Ưu tiên |
|---|---|---|---|---|---|---|
| 1 | [...] | "[title]" (A) | *"[hook 20-40 từ]"* | [unique angle] | [DIY/Lịch sử/Khoa học] | ⭐⭐⭐ |
[8 topics]

### 🌿 PILLAR 2 — [TÊN PILLAR] (XX%)

[8 topics tương tự]

### 🥢 PILLAR 3 — [TÊN PILLAR] (XX%)

[8 topics tương tự]

## 2. SERIES CONCEPTS

[3-5 brand series, mỗi series 5 episodes]

### Series 1: "[Tên series]" ([Mô tả])
1. [Episode 1 title]
2. [...]
[5 episodes]

[Tương tự cho Series 2, 3, 4...]

## 3. EVERGREEN vs TRENDING

### Evergreen (90%)
[Mô tả + đặc điểm + phân bố theo pillar]

### Trending (10%)
[Bảng trigger × topic gợi ý × pillar]
[Quy tắc: tối đa X video trending/tháng, must pivot về evergreen]

## 4. LAUNCH SEQUENCE (8 video đầu)

[Bảng W1-W8 với cột: Topic # | Tựa | Lý do thứ tự]

### Logic pacing tổng thể
\`\`\`
[Sơ đồ giải thích]
\`\`\`

### Sau W8: Đánh giá metrics
[Bảng CTR/AVD threshold + action]

## 5. TOPIC SCORING

### Tiêu chí (5 × 10 = 50 max)
| # | Tiêu chí | Cách tính |
|---|---|---|
| 1 | Search demand | [...] |
| 2 | Relatable | [...] |
| 3 | Hook power | [...] |
| 4 | Conspiracy hook | [...] |
| 5 | Visual potential | [...] |

### Bảng scoring TOP 10
| # | Chủ đề | (1) | (2) | (3) | (4) | (5) | TỔNG /50 | Rank |
|---|---|---|---|---|---|---|---|---|
[10 hàng]

### Bảng scoring tiếp (rank 11-20)
[10 hàng]

### Insight từ scoring
[3-5 insight về pattern]

## 6. SHARED RESEARCH MAP

### Research overlap (tận dụng 1 nghiên cứu cho nhiều topics)
[Bảng research base × topics dùng được × pillar]

### Cross-pillar combos
[3-5 combo touch 2 pillar]

### Research source ưu tiên
| Hạng | Nguồn | Dùng khi |
|---|---|---|
[Bảng tier]

═══ QUY TẮC ═══

1. **Title BẮT BUỘC dùng Formula A/B/C/D/E** từ DNA, ghi rõ formula nào trong title (vd: "(A)" sau title)
2. **Heading pillar BẮT BUỘC** dùng emoji + format \`### 🏠 PILLAR X — [TÊN]\` để app parse
3. **Tổng số topics ≥ 24** (8 topics × 3 pillars)
4. **Mọi topic có Score** trong bảng scoring (không bỏ sót)
5. **Hook câu đầu** PHẢI dùng 1 trong 3 Hook Types từ DNA
6. **Tone tuân Voice Rules** từ Style Guide

Bắt đầu.`;
}
