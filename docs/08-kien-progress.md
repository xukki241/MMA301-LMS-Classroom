# Tracking — Nguyễn Xuân Kiên (LMS)

Đồng bộ với Notion board [Project Tracking — MVP](https://app.notion.com/p/d5cd5fdf8665437aab2bc162491a1d7b). File này theo dõi **toàn bộ phần Kiên**, không thay thế board nhóm.

## Quyết định đã chốt (2026-09-07)

| Quyết định | Chọn | Không chọn |
|------------|------|------------|
| Identity | JWT nhà làm, Auth Service Express TypeScript | Firebase Auth |
| CSDL MVP | MongoDB Docker, 2 DB `lms_auth` / `lms_core` | Firestore làm source of truth |
| Firebase | Placeholder rules, **bật Firestore sau demo MVP Mongo** | Native SDK / Dev Client ngay |
| Mobile hàng ngày | Expo Go | expo-dev-client (chưa cần) |
| APK | EAS Build sau | Firebase không bắt buộc để ra APK |

ADR: `0003-jwt-mongo-firebase-later.md`, `0004-database-per-service-one-mongo.md`.

## Task Kiên

| ID | Hạng mục | Acceptance | Trạng thái | Ghi chú |
|----|----------|------------|------------|---------|
| LMS-16 | Docker Mongo + seed | `docker compose up -d mongo`; 2 DB; Teacher/Student qua register hoặc `npm run seed` | Xong | Cổng **27018** |
| LMS-02 | Auth register/login JWT | POST `/auth/register`, `/auth/login`; bcrypt; `/health` | Review | TypeScript, đã register teacher demo local |
| LMS-03 | JWT middleware Core API | Không token → 401; token OK gắn `req.user`; `GET /me` | Xong | Verify local shared secret |
| LMS-01 | Expo shell | `npx expo start`; stack auth / teacher / student | Review | Chưa verify trên máy ảo |
| LMS-04 | Checklist Huy | Clone → branch → API → PR | Xong | `docs/checklists/huy-lms-13-14.md` |
| LMS-17 | Firebase placeholder | `firebase/` deny-all + việc Console | Xong | Bạn phải tạo project trên Console |
| LMS-15 | E2E demo & QA | Luồng Teacher+Student chạy xuyên | Backlog | Sau khi Tú/Hưng/Lộc/Huy xong P0 |

## Việc chỉ bạn làm được (ngoài repo)

1. Cài **Docker Desktop** (Windows) và để engine chạy.
2. Cài **Node.js 20 LTS**. Mongo LMS chạy cổng **27018** (tránh đụng 27017 của project khác).
3. (Khi sẵn sàng Firebase) tạo project trên Console — xem `firebase/README.md`. Không commit `google-services.json`.
4. Máy ảo Android: API URL `http://10.0.2.2:4001`. Máy thật: đổi `.env` sang IP LAN.

## Thứ tự bàn giao cho nhóm

1. Mongo lên + seed → Tú/Hưng có DB trống đã index.
2. Auth JWT chạy → Huy làm Login/Register.
3. `GET /me` 401/200 → Lộc/Hưng biết gắn Bearer.
4. Expo shell role → Lộc/Huy/Hưng nhét màn hình vào đúng stack.

## Definition of Done (phần Kiên P0)

- [ ] `docker compose up -d mongo` healthy
- [ ] `npm run seed` tạo `teacher@lms.local` / `student@lms.local` mật khẩu `Demo123!`
- [ ] Register/login trả token
- [ ] Core `GET /me` từ chối khi thiếu token
- [ ] Expo start được, chuyển được Teacher/Student stack (token demo hoặc login)
- [ ] Checklist Huy nằm trong repo
