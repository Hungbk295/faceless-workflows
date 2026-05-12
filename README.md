# Faceless Studio 🎬

**Hệ thống tự động hóa sản xuất nội dung video "Faceless" chuyên nghiệp.**

Faceless Studio là một công cụ toàn diện giúp bạn nghiên cứu, lập kế hoạch và tạo ra các video không cần lộ mặt (faceless) cho YouTube, TikTok... được xây dựng với hiệu năng cao bằng Bun, Hono và React.

## 🚀 Tính năng cốt lõi

### 1. 🕵️ Spy & Analysis (Nghiên cứu đối thủ)
- Theo dõi và phân tích các kênh đối thủ trong cùng niche.
- Tự động tải transcript, phân tích cấu trúc video và chụp frame hình ảnh để học hỏi phong cách.
- Đánh giá chỉ số hiệu quả (view count, rank) để tìm ra các chủ đề "win".

### 2. 📝 AI Script Generation (Biên kịch thông minh)
- Hỗ trợ tạo kịch bản với Claude AI, tối ưu hóa theo Hook - Angle - Pillar.
- Tùy chỉnh cấu trúc kịch bản linh hoạt (POV, thời lượng, cấu trúc phân đoạn).
- Quản lý kho kịch bản theo từng channel riêng biệt.

### 3. 🎙️ Voiceover (TTS) Integration
- Tích hợp sâu với **ElevenLabs** (hỗ trợ đa ngôn ngữ, bao gồm Tiếng Việt).
- Tự động hóa quy trình generate audio từ kịch bản, quản lý và lưu trữ voice clips cục bộ.
- Tùy chỉnh tham số giọng nói (stability, similarity boost, speed).

### 4. 🎬 Scene Management (Phân cảnh & Visual)
- Tự động chia nhỏ kịch bản thành các phân cảnh (scenes).
- Gợi ý mô tả hình ảnh/video (visual prompts) cho từng cảnh: bối cảnh, nhân vật, góc máy.
- Quản lý kho tài nguyên (inventory) và các câu lệnh prompt tối ưu.

---

## 🛠️ Stack kỹ thuật

- **Runtime:** [Bun](https://bun.sh/) (Siêu nhanh, thay thế Node.js)
- **Backend:** Hono + Drizzle ORM + SQLite
- **Frontend:** React 18 + Vite + TypeScript + CSS Modules
- **Database:** SQLite (Lưu trữ cục bộ tại `~/.faceless-studio/faceless.db`)

---

## 📦 Cài đặt & Sử dụng

### Yêu cầu
- Đã cài đặt [Bun](https://bun.sh/).

### Các bước cài đặt
1. Cài đặt dependencies:
   ```bash
   bun install
   ```
2. Khởi tạo database:
   ```bash
   bun run db:push
   ```
3. Khởi chạy ứng dụng:
   ```bash
   bun run dev
   ```
   *Ứng dụng sẽ chạy tại: [http://localhost:5177](http://localhost:5177)*

### Các lệnh hữu ích
- `bun run dev`: Chạy cả Server và Client song song.
- `bun run build`: Build production.
- `bun run typecheck`: Kiểm tra lỗi TypeScript toàn project.

---

## 📂 Cấu trúc thư mục

- `client/`: Mã nguồn giao diện người dùng (Vite + React).
- `server/`: API Server và Logic xử lý (Hono + Drizzle).
- `shared/`: Các kiểu dữ liệu (Types) và Zod schemas dùng chung.
- `~/.faceless-studio/`: Thư mục lưu trữ dữ liệu người dùng (DB, audio clips, exports).

---

## 🔒 Bảo mật & Dữ liệu

- **API Keys:** Các API key (ElevenLabs, Claude...) được lưu trữ trong SQLite local. Hãy cẩn thận khi backup hoặc chia sẻ file `.db`.
- **Lưu trữ:** Mặc định dữ liệu nằm tại `~/.faceless-studio/`. File database chỉ có quyền đọc bởi user sở hữu (mode 600).

---

## 📝 Tham khảo thêm

- `../PLAN_TS_REWRITE.md` — Quyết định kiến trúc & định nghĩa Type.
- `../faceless_studio_v3.html` — Phiên bản gốc (mục tiêu chuyển đổi 1:1).

---

## 📝 License

Dự án này là mã nguồn riêng tư.

