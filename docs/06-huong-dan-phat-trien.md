# Chương 6. Hướng dẫn phát triển và triển khai

> Chương này phục vụ **thành viên lập trình** và người chấm cần tái hiện môi trường.

## 6.1. Yêu cầu môi trường

- Node.js LTS (khuyến nghị 20.x)  
- npm hoặc pnpm  
- Git  
- Android Studio / giả lập Android hoặc thiết bị thật  
- Docker Desktop (Mongo LMS map cổng **27018** vì 27017 thường đã bị project khác chiếm)  
- (Sau MVP) Tài khoản Firebase Console — xem `firebase/README.md`

## 6.2. Cấu trúc lệnh khởi động

Từ thư mục gốc repo, copy `.env.example` → `.env` rồi:

```bash
docker compose up -d mongo

cd services/auth-service
npm install
npm run seed
npm run dev
# http://0.0.0.0:4001

cd services/core-api
npm install
npm run dev
# http://0.0.0.0:4002

cd apps/mobile
npm install
npx expo start
```

Tài khoản seed: `teacher@lms.local` / `student@lms.local` — mật khẩu `Demo123!`.

## 6.3. Quy ước Git Branching, Pull Request & Quản lý Mã nguồn

Áp dụng bắt buộc cho toàn bộ lập trình viên trong dự án MMA301 LMS Classroom:

1. **Nguyên tắc phân nhánh (GitFlow & Base Branch)**:
   - Branch `develop` là nhánh tích hợp trung tâm. Mọi Pull Request phát triển tính năng (`LMS-XX`) **bắt buộc phải target vào `develop`**. Tuyệt đối **không mở PR trực tiếp vào `main`**.
   - Branch `main` là nhánh phát hành (Release), chỉ nhận merge từ `develop` khi toàn bộ MVP đã được nghiệm thu và gắn tag phiên bản (ví dụ: `v1.0-mvp`).
2. **Quy ước đặt tên nhánh (Branch Naming)**:
   - Cú pháp chuẩn: `LMS-XX-·-short-description` (Ví dụ: `LMS-11-·-Mobile-class-list-/-join-/-detail`, `LMS-12-·-Mobile-stream-Post-+-Comment`, `LMS-13-·-Mobile-Login-Register`, `LMS-14-·-Material-API-mobile`).
   - Nghiêm cấm đặt tên nhánh tự do như `huy`, `anh-tus`, `lms-08`.
3. **Quy ước tiêu đề Pull Request (PR Title)**:
   - Theo chuẩn Conventional Commits kết hợp mã task: `feat(LMS-XX): short description` hoặc `fix(LMS-XX): short description`.
4. **Nội dung mô tả PR (PR Description)**:
   - Bắt buộc điền đầy đủ form từ `.github/PULL_REQUEST_TEMPLATE.md` gồm: Linked Task, Changes, Testing Evidence, và Checklist.
5. **Kỷ luật Clean Diff & Code Hygiene**:
   - Nguyên tắc đơn trách nhiệm (1 PR = 1 Task). Không gộp Auth, Material, Assignment vào chung một PR.
   - Tuyệt đối không commit thư mục công cụ/agent (`.agents/`, `.cursor/hooks/state/`) vào repository. Giữ `.gitignore` đồng bộ.
6. **Tiêu chuẩn Review & Approval**:
   - Tối thiểu 01 lượt Approved Review trước khi merge.
7. **Tiêu chí hoàn thành (Definition of Done — DoD)**:
   - Toàn bộ automated unit/permission test suites pass 100%, typecheck sạch, và thẻ Notion được cập nhật link `GitHub Evidence` cùng `Evidence State` tương ứng.

## 6.4. Hợp đồng API tối thiểu (khung)

### Auth Service

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Kiểm tra sống + Mongo |
| POST | `/auth/register` | `{ email, password, displayName, role }` |
| POST | `/auth/login` | Trả `{ token, user }` |

### Core API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Kiểm tra sống + Mongo |
| GET | `/me` | Bearer bắt buộc — payload JWT |
| CRUD | `/classes` … | Lớp học (Tú) |
| CRUD | `/classes/:id/posts` … | Bảng tin (Tú) |
| CRUD | `/classes/:id/materials` … | Tài liệu (Huy, sau contract) |
| CRUD | `/classes/:id/exercises` … | Bài tập (Hưng) |

Header bắt buộc với API được bảo vệ: `Authorization: Bearer <accessToken>`.

## 6.5. Checklist onboarding thành viên mới

1. Clone repo LMS (không nhầm repo 30Shine).  
2. Đọc `docs/01` → `02` → `03` → `05` (đúng phần mình phụ trách).  
3. Chạy được `/health` của auth-service và core-api.  
4. Nhận task trên Notion; tạo nhánh `feature/...`.  
5. Với Huy: chỉ bắt đầu khi đã có checklist file đính kèm task.  

## 6.6. Tài khoản demo (sau khi có seed)

| Vai trò | Tài khoản | Mật khẩu |
|---------|-----------|----------|
| Teacher | teacher@lms.local | Demo123! |
| Student | student@lms.local | Demo123! |

## 6.7. nginx / chat realtime / Render (sau cùng)

**Chưa triển khai code.** Chỉ có task trên Notion:

- LMS-18 nginx concurrent  
- LMS-19 Deploy Render  
- LMS-21 Chat WebSocket (chưa gán thành viên)  

MVP hiện tại: mobile gọi thẳng Auth `:4001` và Core `:4002`.

## 6.8. Nộp bài / bảo vệ

Chuẩn bị theo đề cương môn:

- Link GitHub (repo LMS).  
- Video demo YouTube (luồng MVP).  
- File APK hoặc link phân phối (giai đoạn hoàn thiện).  
- Báo cáo: in hoặc nộp bản PDF xuất từ bộ `docs/` này.  
