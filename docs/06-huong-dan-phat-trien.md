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

## 6.3. Quy ước nhánh Git

| Nhánh | Mục đích |
|-------|----------|
| `main` | Ổn định, có thể demo |
| `feature/<ten-task>` | Phát triển hạng mục |

Commit message ngắn gọn, tiếng Anh hoặc tiếng Việt nhất quán trong repo (ví dụ: `feat(auth): add login endpoint`).

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
