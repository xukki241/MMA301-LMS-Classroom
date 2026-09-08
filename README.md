# MMA301 — LMS Classroom

Ứng dụng quản lý lớp học (Teacher / Student): Auth · Class · Post/Comment · Material · Exercise → Submission → Grade.

| | |
|--|--|
| **GitHub** | https://github.com/xukki241/MMA301-LMS-Classroom |
| **Notion** | https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a |

## Stack

- Mobile: Expo (React Native) + React Native Paper + TanStack Query
- Backend: Auth Service (`:4001`) + Core API (`:4002`) + MongoDB
- Tracking / backlog: Notion (không lưu Kanban trong repo)

## Chạy nhanh

```bash
copy .env.example .env
docker compose up -d mongo
cd services/auth-service && npm i && npm run seed && npm run dev
cd services/core-api && npm i && npm run dev
cd apps/mobile && npm i && npx expo start
```

LAN: trỏ `EXPO_PUBLIC_*` về IP máy host (`:4001` / `:4002`).

nginx · WebSocket chat · Render: backlog Notion (LMS-18 / LMS-19 / LMS-21) — làm sau cùng.

## Tài liệu

- [docs/00-muc-luc-bao-cao.md](./docs/00-muc-luc-bao-cao.md) — mục lục báo cáo
- [CONTEXT.md](./CONTEXT.md) — thuật ngữ miền
- [docs/06-huong-dan-phat-trien.md](./docs/06-huong-dan-phat-trien.md) — hướng dẫn dev
- [docs/adr/](./docs/adr/) — quyết định kiến trúc

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy
