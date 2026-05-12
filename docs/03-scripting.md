# Giai đoạn 3: Biên kịch AI (AI Scripting) ✍️

Đây là giai đoạn sáng tạo nội dung chính, nơi các ý tưởng được chuyển hóa thành kịch bản chi tiết với sự hỗ trợ của trí tuệ nhân tạo.

## 🎯 Mục tiêu
- Xây dựng kịch bản có tính giữ chân người xem cao.
- Tối ưu hóa nội dung theo cấu trúc chuyên nghiệp.
- Tăng tốc độ viết bài bằng cách sử dụng AI (Claude).

## 🛠️ Quy trình biên kịch

### 1. Cấu trúc kịch bản chuyên nghiệp
Hệ thống khuyến khích sử dụng bộ khung:
- **Hook:** 3-5 giây đầu tiên cực kỳ quan trọng để giữ chân người xem.
- **Angle:** Góc nhìn độc đáo, điểm khác biệt của video này so với video khác.
- **Pillar:** Các cột trụ nội dung chính trong video.

### 2. Tương tác với Claude AI
Faceless Studio kết nối trực tiếp với **Claude AI** để hỗ trợ bạn:
- **Drafting:** Viết bản thảo dựa trên Topic và Context từ Phase 1.
- **Refining:** Chỉnh sửa, kéo dài hoặc rút ngắn nội dung theo thời lượng mục tiêu.
- **POV (Point of View):** Tùy chỉnh ngôi kể (Ngôi thứ 1, 2, hoặc 3) để phù hợp với phong cách kênh.

### 3. Quản lý kịch bản
- **Index-based:** Mỗi kênh có thể có nhiều kịch bản, được quản lý theo số thứ tự (`idx`).
- **Metadata:** Theo dõi thời lượng dự kiến (tính theo phút) và cấu trúc phân đoạn (sections).
- **Draft Persistence:** Các bản nháp được lưu tự động để bạn không bao giờ mất dữ liệu.

## 🗄️ Cấu trúc dữ liệu
- `scripts`: Bảng chính lưu trữ toàn bộ nội dung kịch bản, bao gồm văn bản thô, hook, angle và các thông số đi kèm.

## 💡 Mẹo workflow
Đừng chỉ yêu cầu AI "viết kịch bản". Hãy cung cấp cho nó Transcript của đối thủ (đã thu thập ở Phase 1) và yêu cầu: *"Dựa vào cấu trúc video thành công này, hãy viết một kịch bản mới về chủ đề [X] với Angle là [Y]"*. Điều này sẽ tạo ra kết quả có tỷ lệ thành công cao hơn nhiều.
