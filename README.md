# MMA301 — LMS Classroom (Shub-lite)

**Báo cáo & tài liệu phát triển** cho đề tài ứng dụng quản lý học tập (giáo viên–học sinh).

| | |
|--|--|
| **GitHub** | https://github.com/xukki241/MMA301-LMS-Classroom |
| **Notion** | https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a |
| **Môn** | Lập trình ứng dụng di động bằng React Native |

## Đọc tài liệu bắt đầu từ đây

👉 **[docs/00-muc-luc-bao-cao.md](./docs/00-muc-luc-bao-cao.md)** — mục lục báo cáo.

Tracking Kiên: [docs/08-kien-progress.md](./docs/08-kien-progress.md)  
Checklist Huy: [docs/checklists/huy-lms-13-14.md](./docs/checklists/huy-lms-13-14.md)

## Phạm vi MVP

Auth · Class create/join · Post+Comment · Material · Exercise→Submission→Grade  
Auth Service tách; Core API một process; MongoDB Docker; Firebase để sau.

## Chạy nhanh

```bash
copy .env.example .env
docker compose up -d mongo
cd services/auth-service && npm i && npm run seed && npm run dev
cd services/core-api && npm i && npm run dev
cd apps/mobile && npm i && npx expo start
```

Nhiều thành viên LAN: trỏ `EXPO_PUBLIC_*` về IP máy host (`:4001` / `:4002`).  
nginx + WebSocket chat + Render: **chưa làm** — xem task Notion LMS-18 / LMS-19 / LMS-21 (làm sau cùng).

```bash
docker compose up -d mongo
```

Chi tiết dev: [docs/06-huong-dan-phat-trien.md](./docs/06-huong-dan-phat-trien.md).

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy
