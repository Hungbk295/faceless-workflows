import type { ChannelDto } from 'shared';

// Port từ v3 PROMPTS.style (line 1548). Template literal copied verbatim.
export function stylePrompt(ch: ChannelDto): string {
  const dnaInjection = ch.dna
    ? '\n--- DNA HIỆN TẠI ---\n' + ch.dna.substring(0, 4000) + '\n---\n'
    : '';

  return `Bạn là chuyên gia tạo Style Guide cho YouTube faceless. Dựa trên Channel DNA đã có, tạo Style Guide hoàn chỉnh.

═══ CONTEXT ═══

- Kênh: ${ch.name}
- Channel DNA: [DÁN OUTPUT DNA TỪ STAGE TRƯỚC, hoặc app sẽ tự inject]
${dnaInjection}

═══ NHIỆM VỤ ═══

Tạo Style Guide chứa CHÍNH XÁC 7 mục. Đặc biệt mục 3 (Voice Rules Block) sẽ được paste vào AI tools, nên phải copy-paste-ready.

═══ OUTPUT FORMAT (BẮT BUỘC) ═══

# STYLE GUIDE — ${ch.name}

## 1. PERSONA DEFINITION

### Identity
[Bảng: tên persona, public/internal name]

### Background story (2-3 câu)
[...]

### 5 personality traits
1. [...]
2. [...]
[...]

### POV / Ngôi kể
| Mục | Quy tắc | Ví dụ |
|---|---|---|
[Bảng đầy đủ]

### Thang đo persona (1-10)
| Trục | Điểm | Ghi chú |
|---|---|---|
| Formal ↔ Casual | X | [...] |
| Humor | X | [...] |
| Expert ↔ Observer | X | [...] |
| Speed (chậm-nhanh) | X | [...] |
| Warmth ↔ Cold | X | [...] |

## 2. VOICE RULES

### ✅ DO (7 rules)
1. [...]
[...]

### ❌ DON'T (7 rules)
1. [...]
[...]

### Sentence structure & rhythm
[Quy tắc độ dài câu, paragraph, nhịp]

### Ví dụ đoạn ĐÚNG nhịp
> *"[đoạn 80-120 từ minh họa nhịp dài-ngắn-dài]"*

## 3. VOICE RULES BLOCK (paste-ready cho AI tools)

\`\`\`
=== VOICE RULES — ${ch.name.toUpperCase()} ===

PERSONA: [...]

NGÔI KỂ:
- [quy tắc xưng hô]

PHẢI LÀM:
1. [...]
[...]

TUYỆT ĐỐI TRÁNH:
1. [...]
[...]

CÂU SIGNATURE PHẢI XUẤT HIỆN (chọn 2-3 câu/video):
- "[...]"
[...]

CẤU TRÚC CÂU:
- [độ dài, nhịp, paragraph]

ĐỘ DÀI VIDEO: [phút]

=== HẾT VOICE RULES ===
\`\`\`

## 4. BENCHMARK PASSAGES

### 4.1 — HOOK PASSAGE (~110 từ)
> *"[đoạn hook mẫu hoàn chỉnh]"*

**Phân tích:** [3-5 bullet về kỹ thuật trong đoạn]

### 4.2 — EXPLANATION PASSAGE (~120 từ)
[Tương tự]

### 4.3 — DRAMATIC CLOSE (~110 từ)
[Tương tự]

## 5. FORMATTING RULES

### Script format
\`\`\`
[Sample format script với markers như [SCENE], [VISUAL], [pause 1s]]
\`\`\`

### Emphasis & pause markers
[Bảng markers]

### Naming convention
[File naming pattern]

## 6. THUMBNAIL TEXT BANK

> [App parse heading này]

#### Category: Question
1. [...]
[5 mẫu]

#### Category: Statement
[5 mẫu]

#### Category: Number
[5 mẫu]

#### Category: Emotion
[5 mẫu]

### Font Recommendation
[Bảng font cho top text, bottom text, number, fallback có dấu]

### Color Palette
| Vai trò | Màu | Hex |
|---|---|---|
[Tối thiểu 6 hàng]

### Thumbnail Composition Rules
[9 quy tắc bố cục]

## 7. CHANNEL STRATEGY

### Monetization roadmap
[Bảng giai đoạn × revenue stream]

### Content frequency
[Lịch upload, độ dài video]

### Topics nên TRÁNH
[5-7 loại topic cấm]

### Topics nên ƯU TIÊN
[5-7 loại topic ưu tiên]

═══ QUY TẮC ═══

1. Voice Rules Block (mục 3) phải nằm trong block \`\`\` để copy nguyên xi
2. Font Recommendation + Color Palette + Composition Rules dùng đúng heading để app parse
3. Benchmark passages phải đủ 3 đoạn (hook + explanation + close)
4. Mọi quy tắc phải nhất quán với DNA mục 5 (Human Touch Signals)

Bắt đầu.`;
}
