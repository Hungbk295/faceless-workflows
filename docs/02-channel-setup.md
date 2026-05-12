# Giai đoạn 2: Thiết lập Kênh (Channel Setup) ⚙️

Sau khi đã có hướng đi từ việc nghiên cứu, giai đoạn này giúp bạn định hình "bản sắc" và thiết lập các thông số kỹ thuật cho kênh của mình.

## 🎯 Mục tiêu
- Định hình phong cách riêng (DNA) của kênh.
- Thiết lập hệ thống giọng đọc (TTS) nhất quán.
- Xây dựng kho mẫu Visual Prompt để đồng bộ hình ảnh.

## 🛠️ Các thành phần thiết lập

### 1. Định danh Kênh (Channel Identity)
Bạn cần cung cấp các thông tin nền tảng để AI hiểu ngữ cảnh:
- **Niche & Language:** Ngách nội dung và ngôn ngữ mục tiêu (mặc định là Tiếng Việt).
- **Style & DNA:** Mô tả ngắn gọn về phong cách (ví dụ: "Kể chuyện huyền bí, giọng điệu chậm rãi, sâu lắng").
- **Reference Analysis:** Các ghi chú đúc rút từ Phase 1 về đối thủ cạnh tranh.

### 2. Cấu hình Giọng đọc (Voiceover/TTS)
Faceless Studio tích hợp sâu với **ElevenLabs**. Bạn có thể cấu hình:
- **Voice ID:** Chọn từ thư viện giọng nói khổng lồ của ElevenLabs.
- **Stability & Similarity:** Điều chỉnh độ ổn định và tính biểu cảm của giọng nói.
- **Model ID:** Sử dụng các model đa ngôn ngữ mới nhất (`eleven_multilingual_v2`).

### 3. Visual Prompt Templates
Để các video có tính đồng nhất, bạn có thể lưu trữ các prompt mẫu:
- **Character Prompts:** Mô tả nhân vật chính (nếu có).
- **Environment/Background:** Bối cảnh chung của kênh.
- **Camera/Style:** Các từ khóa về chất lượng hình ảnh (ví dụ: "cinematic, 4k, hyper-realistic").

## 🗄️ Cấu trúc dữ liệu
- `channels`: Lưu thông tin chung và DNA của kênh.
- `voice_config`: Lưu cấu hình API và thông số giọng đọc riêng cho từng kênh.
- `visual_prompts`: Lưu các cặp key-value về các mẫu prompt.

## 💡 Mẹo workflow
Sự nhất quán (consistency) là chìa khóa. Một giọng đọc quen thuộc và phong cách hình ảnh đồng bộ sẽ giúp khán giả nhận diện thương hiệu của bạn nhanh hơn trên các nền tảng mạng xã hội.
