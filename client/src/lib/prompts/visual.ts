import type { ChannelDto } from 'shared';

// Port từ v3 PROMPTS.visual (line 1829). Template literal copied verbatim.
export function visualPrompt(ch: ChannelDto): string {
  const dnaInjection = ch.dna
    ? '\n--- DNA: PROTAGONIST + THUMBNAIL STYLE ---\n' + ch.dna.substring(0, 3000) + '\n---\n'
    : '';

  return `Bạn là chuyên gia visual prompt engineering cho AI image gen (G-Labs/Midjourney/SD). Tạo 4 PROMPTS HÌNH ẢNH cho kênh.

═══ CONTEXT ═══

- Kênh: ${ch.name}
- Niche: ${ch.niche || '[NICHE]'}
${dnaInjection}

═══ NGUYÊN TẮC LAYER (CRITICAL) ═══

LAYER AESTHETIC (đi vào sceneStyle) — áp dụng cho MỌI nhân vật:
- Outline style, palette, art style, shading
- Skin tone (CHỈ khi mọi nhân vật cùng skin)
- Background mood + detail level

LAYER IDENTITY (đi vào charStyle, KHÔNG vào sceneStyle):
- Clothing đặc trưng
- Accessories signature
- Age/gender/hair specific
- Facial signature (beard, scar...)

TEST: "Câu này có đúng với MỌI nhân vật phụ không?" → Nếu không → cắt khỏi sceneStyle.

═══ NHIỆM VỤ ═══

Tạo 4 prompts với format BẮT BUỘC bên dưới. App sẽ parse từng prompt vào ô riêng (charStyle, bgStyle, sceneStyle, styleRef).

═══ OUTPUT FORMAT (BẮT BUỘC) ═══

# 4 VISUAL PROMPTS — ${ch.name}

## 🎨 STYLE PHILOSOPHY

[Đoạn ngắn 80-120 từ giới thiệu phong cách kênh — moodboard mental, references, tại sao phù hợp niche/market]

## 1. charStyle

\`\`\`prompt
[Prompt 80-120 từ mô tả CHI TIẾT nhân vật chính:
- Tuổi, giới tính, skin tone, đặc điểm khuôn mặt
- Râu/tóc/mắt/lông mày
- Body proportion (1:6.5 realistic? cartoon?)
- Trang phục signature
- Phụ kiện cố định (3 items)
- Outline + shading + palette
- KẾT THÚC BẰNG: "Professional white background, TOP ROW 4 full-body views front 45-degree side back, BOTTOM ROW 6 expression close-ups [list 6 emotions]"
]
\`\`\`

### Giải thích các yếu tố quan trọng
| Element | Vai trò |
|---|---|
[Bảng]

## 2. bgStyle

\`\`\`prompt
[Prompt 60-100 từ mô tả backgrounds:
- Phong cách vẽ + outline
- Color palette với hex codes
- Settings (5-7 loại bối cảnh đặc trưng kênh)
- Lighting + atmosphere + mood
- Detail level
- KẾT THÚC BẰNG: "NO characters NO people NO text NO words, 16:9"
]
\`\`\`

### Giải thích các yếu tố quan trọng
[Bảng tương tự]

## 3. sceneStyle / Aesthetic

\`\`\`prompt
[Prompt CHỈ ~40 từ — universal aesthetic, viết thành câu tự nhiên KHÔNG phải tag list:
- Outline style
- Art style + shading technique
- Skin tone universal (nếu áp dụng)
- Color palette
- Lighting + mood
KHÔNG được chứa identity của nhân vật cụ thể (clothing, accessories, age specific)
]
\`\`\`

### ✅ Pass Layer Test
| Câu trong sceneStyle | Có đúng cho mọi nhân vật phụ không? |
|---|---|
[Bảng kiểm tra]

### ❌ Đã đẩy sang charStyle (KHÔNG có ở đây)
- ❌ [items thuộc identity layer]

## 4. Style Reference Prompt

\`\`\`prompt
[Prompt 80-120 từ tạo poster moodboard 3 sections:

TOP SECTION: horizontal color palette swatches showing [list màu]

MIDDLE SECTION: 6 diverse [target ethnicity] characters standing side by side painterly illustration style — [list 6 nhân vật ĐA DẠNG age/gender/outfit, KHÔNG phải 6 bản copy của nhân vật chính] — each with distinct outfit and identity but unified [shared aesthetic features]

BOTTOM SECTION: 3 background thumbnails — [3 settings đại diện]. NO TEXT NO WORDS NO LETTERS on image.
]
\`\`\`

### Giải thích cấu trúc
[3-5 bullets]

## 🚦 LAYER TEST RESULTS

| sceneStyle có chứa? | Phải KHÔNG | Status |
|---|---|---|
| Clothing đặc trưng (vd: kimono) | ❌ | [✓ pass / ✗ fail] |
| Accessories (glasses, hat) | ❌ | [...] |
| Age specific (25-year-old) | ❌ | [...] |
| Hair specific | ❌ | [...] |

═══ QUY TẮC ═══

1. **Mỗi prompt phải nằm trong block \`\`\`prompt ... \`\`\`** để app parse
2. **charStyle ≥ 80 từ**, kết thúc đúng "Professional white background, TOP ROW... BOTTOM ROW..."
3. **bgStyle** kết thúc đúng "NO characters NO people NO text NO words, 16:9"
4. **sceneStyle ~40 từ**, pass Layer Test (không clothing/accessories/age)
5. **Style Reference** chứa 6 nhân vật ĐA DẠNG (không phải 6 copies)
6. **Phong cách phải khác reference** (nếu reference là realistic → ta chọn painterly hoặc ngược lại)

Bắt đầu.`;
}
