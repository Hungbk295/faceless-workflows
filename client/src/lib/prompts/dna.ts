import type { ChannelDto } from 'shared';

// Port từ v3 PROMPTS.dna (line 1420). Template literal copied verbatim.
export function dnaPrompt(ch: ChannelDto): string {
  const langLabel =
    ch.lang === 'vi' ? 'Tiếng Việt' :
    ch.lang === 'en' ? 'English' : ch.lang;

  return `Bạn là chuyên gia tạo Channel DNA cho YouTube faceless. Dựa trên Reference Analysis đã có, tạo file CHANNEL DNA hoàn chỉnh cho kênh.

═══ CONTEXT ═══

- Tên kênh: ${ch.name}
- Niche: ${ch.niche || '[NICHE]'}
- Ngôn ngữ: ${langLabel}
- Reference: ${ch.refUrl || '[REFERENCE URL]'}
- Reference Analysis: ${ch.refAnalysis ? '\n\n--- REFERENCE ANALYSIS ---\n' + ch.refAnalysis.substring(0, 4000) + '\n---\n' : '[DÁN OUTPUT TỪ STAGE TRƯỚC, hoặc bỏ trống nếu chưa có]'}

═══ NHIỆM VỤ ═══

Tạo Channel DNA chứa CHÍNH XÁC 7 mục bên dưới, với heading đúng format. App sẽ parse output này nên format phải nghiêm ngặt.

═══ OUTPUT FORMAT (BẮT BUỘC) ═══

# CHANNEL DNA — ${ch.name}

> **Reference:** [URL]
> **Strategy:** [Single Reference / Remix / Inspiration]

## 1. TITLE PATTERNS

[5 formulas adapt từ reference. Mỗi formula PHẢI có heading "### Formula A — [Tên]" để app parse]

### Formula A — [Tên formula]
**Template:** \`[template với placeholders]\`
Ví dụ:
- "[ví dụ 1]"
- "[ví dụ 2]"
- "[ví dụ 3]"

### Formula B — [Tên formula]
[...]

### Formula C — [Tên formula]
[...]

### Formula D — [Tên formula]
[...]

### Formula E — [Tên formula]
[...]

## 2. HOOK PATTERNS

[3 hook types adapt từ reference + thêm 1 type phù hợp văn hóa target]

### Hook Type 1 — [Tên]
**Cấu trúc:** [...]
**Hook mẫu:** *"[hook 60-90 từ]"*

### Hook Type 2 — [Tên]
[...]

### Hook Type 3 — [Tên]
[...]

## 3. VIDEO STRUCTURE

\`\`\`
[Sơ đồ timestamps cho video 15-22 phút, 6-8 sections]
\`\`\`

### Transition signatures
[Bảng câu chuyển kênh]

## 4. THUMBNAIL STYLE

### Palette (khác reference)
[Bảng hex codes]

### Typography
[Font gợi ý + size]

### Composition
[5-9 quy tắc bố cục]

## 5. HUMAN TOUCH SIGNALS

### Personality narrator
[Mô tả persona 80-150 từ]

### Cách xưng hô (POV)
[Bảng quy tắc]

### Signature phrases (10 câu)
1. [...]
2. [...]
[...]

## 6. DIFFERENTIATION vs REFERENCE

| # | Yếu tố | Reference | ${ch.name} |
|---|---|---|---|
| 1 | [...] | [...] | [...] |
[Tối thiểu 5 điểm khác, lý tưởng 8-10]

## 7. PROTAGONIST IDENTITY

### Ngoại hình
[Bảng chi tiết: tuổi, giới tính, skin, khuôn mặt, râu/tóc, mắt]

### Phụ kiện KHÔNG BAO GIỜ BỎ
[3 items signature, có ít nhất 2/3 phải xuất hiện trong mọi thumbnail]

### Trang phục signature
[Bảng top/bottom/chân — phải khác reference]

### Vai trò narrative
[Là narrator hay character? Xuất hiện ở scenes nào?]

### Bảng so sánh nhân vật
| Yếu tố | Reference | ${ch.name} |
|---|---|---|
[8-10 hàng]

═══ QUY TẮC ═══

1. Mọi heading dùng đúng cú pháp markdown để app parse
2. Title formulas phải dùng heading \`### Formula A — [Tên]\` (chuẩn format)
3. Differentiation phải có TỐI THIỂU 5 điểm khác
4. Protagonist phải có 3 brand markers cố định
5. Tránh copy y nguyên reference — phải có twist văn hóa target

Bắt đầu.`;
}
