# Giai đoạn 1: Nghiên cứu & Phân tích (Spy & Analysis) 🕵️

Giai đoạn đầu tiên tập trung vào việc tìm kiếm và phân tích các nội dung đã thành công trong ngách (niche) của bạn để rút ra công thức "win".

## 🎯 Mục tiêu
- Xác định các kênh đối thủ hàng đầu.
- Phân tích các video có hiệu suất cao nhất (nhiều view nhất trong thời gian ngắn).
- Hiểu cấu trúc kịch bản và phong cách hình ảnh của họ.

## 🛠️ Các tính năng chính

### 1. Crawl Metadata Video
Hệ thống sử dụng công cụ `yt-dlp` để thu thập dữ liệu thô từ các đường dẫn YouTube/TikTok:
- Tiêu đề video, lượt xem, thời lượng.
- Ngày đăng tải để tính toán tốc độ tăng trưởng (velocity).
- Thumbnail để phân tích cách họ làm hình ảnh thu hút click.

### 2. Trích xuất Transcript (Bản dịch/Phụ đề)
Hệ thống tự động tải về transcript của video. Đây là nguồn dữ liệu quý giá nhất để:
- Phân tích cấu trúc Hook (3-5 giây đầu).
- Tìm hiểu cách họ dẫn dắt câu chuyện và phân bổ thông tin.
- Làm tài liệu tham khảo (context) cho AI khi biên kịch ở giai đoạn sau.

### 3. Chụp Frame hình ảnh (Visual Analysis)
Một tính năng đặc biệt của Faceless Studio là tự động chụp các frame hình ảnh từ video gốc:
- Giúp bạn phân tích phong cách hình ảnh (moodboard).
- Hiểu cách họ sử dụng stock footage, animation hoặc nhân vật AI.
- Các frame này được lưu trữ cục bộ để bạn có thể xem lại bất cứ lúc nào.

## 🗄️ Cấu trúc dữ liệu
Dữ liệu thu thập được lưu trữ trong các bảng SQLite:
- `spy_runs`: Lưu trữ trạng thái của các phiên nghiên cứu.
- `spy_videos`: Danh sách các video mục tiêu và transcript của chúng.
- `spy_frames`: Đường dẫn đến các ảnh chụp màn hình từ video.

## 💡 Mẹo workflow
Hãy chọn ra 3-5 video có lượt view vượt trội so với mức trung bình của kênh đó. Phân tích transcript của họ để tìm ra "Angle" (góc nhìn) độc đáo mà họ đã sử dụng.
