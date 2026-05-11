import type { ChannelDto } from 'shared';

// Port từ v3 PROMPTS.reference (line 1345). Template literal copied verbatim.
export function referencePrompt(ch: ChannelDto): string {
  const langLabel =
    ch.lang === 'vi' ? 'Tiếng Việt' :
    ch.lang === 'en' ? 'English' : '[NGÔN NGỮ]';

  return `Bạn là chuyên gia phân tích kênh YouTube faceless. Tôi sẽ cho bạn link 1 kênh tham chiếu, hãy phân tích sâu để tôi adapt sang ngách của tôi.

═══ INPUT ═══

- Kênh tham chiếu: ${ch.refUrl || '[DÁN URL KÊNH]'}
- Ngôn ngữ kênh mới: ${langLabel}
- Niche dự định: ${ch.niche || '[NICHE]'}
- Tên kênh dự định: ${ch.name}

═══ NHIỆM VỤ ═══

Search/visit kênh tham chiếu và phân tích theo 7 phương diện. TRẢ LỜI THEO ĐÚNG FORMAT BÊN DƯỚI.

═══ OUTPUT FORMAT (BẮT BUỘC) ═══

# REFERENCE ANALYSIS

## 1. CHANNEL OVERVIEW
- **Subscribers:** [số]
- **Total videos:** [số]
- **Niche:** [mô tả]
- **Language:** [ngôn ngữ]
- **Avg view per video:** [ước tính]
- **Top video views:** [số + tựa]

## 2. TITLE PATTERNS (top 5 formulas)
[Liệt kê 5 công thức title hay nhất kênh dùng, mỗi cái có template + 2 ví dụ]

## 3. HOOK PATTERNS (top 3 styles)
[3 cách mở video họ dùng nhiều nhất, có ví dụ transcript nếu có]

## 4. PERSONA / TONE
- **Narrator persona:** [mô tả]
- **POV:** [ngôi 1/2/3]
- **Tone keywords:** [3-5 từ]
- **Signature phrases:** [3-5 câu lặp lại]

## 5. VISUAL STYLE
- **Aesthetic:** [photo-realistic / cartoon / painterly / mixed]
- **Color palette:** [3-5 hex codes nếu xác định được]
- **Character design:** [mô tả]
- **Thumbnail formula:** [layout + text style]

## 6. CONTENT PILLARS
[3-5 chủ đề lớn họ xoay quanh, tỷ lệ %]

## 7. STRENGTHS & WEAKNESSES
- ✅ Họ giỏi nhất: [3 điểm]
- ⚠️ Khoảng trống: [2-3 điểm có thể làm tốt hơn]

═══ STRATEGIC RECOMMENDATIONS (cho kênh "${ch.name}") ═══

## A. ADAPTATION STRATEGY (chọn 1)
- **Single Reference:** Adapt thẳng visual + content, đổi ngôn ngữ
- **Remix:** Visual từ kênh A + Content từ kênh B
- **Inspiration only:** Lấy ý tưởng, làm visual hoàn toàn khác

→ Recommend cho ngách "${ch.niche || '[NICHE]'}": [chọn]
→ Lý do: [2-3 câu]

## B. DIFFERENTIATION POINTS (≥5 điểm)
[Bảng 2 cột: Reference channel | "${ch.name}"]
1. ...
2. ...

## C. RISKS
[Cảnh báo 3 risk khi adapt: reused content flag, văn hóa không match, niche quá hẹp]

═══ KẾT THÚC ═══

Lưu ý: Phân tích này sẽ làm input cho bước tiếp theo (Channel DNA). Hãy chi tiết và actionable.

Bắt đầu phân tích.`;
}
