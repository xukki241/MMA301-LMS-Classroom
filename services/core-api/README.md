# Core API

Express + TypeScript. Sở hữu `lms_core`. Xác thực JWT local bằng `JWT_SECRET` chung với Auth Service (issuer `lms-auth-service`, audience `lms-core-api`).

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/health` | không | Service + Mongo |
| GET | `/me` | Bearer | Payload user từ JWT |
| POST | `/classes/:classId/exercises` | Bearer, teacher sở hữu lớp | Tạo bài tập; hạn nộp tương lai |
| GET | `/classes/:classId/exercises` | Bearer, thành viên lớp | Danh sách theo dueAt rồi _id tăng dần |

LMS-08 đã có create/list Exercise. Body tạo: `title` (trim, 1–200 ký tự), `description` (tùy chọn, tối đa 10000), `dueAt` (ISO 8601 có timezone, lớn hơn giờ server). `classId` lấy từ URL, `createdBy` từ JWT; trường body lạ trả 422. Lỗi deadline trả 400, chưa đăng nhập 401, thiếu quyền 403, lớp không tồn tại 404. Update/delete/detail Exercise và UI nằm ngoài phạm vi này.

LMS-09 bổ sung nộp/sửa bài trước hạn, đọc bài của mình, danh sách bài nộp cho Teacher sở hữu lớp và PUT điểm 0–10 sau hạn. Xem [contract, curl và hướng dẫn kiểm thử LMS-09](../../docs/testing/lms-09.md). Chạy `npm run test:lms09` và `npm run test:lms09:permissions` với Mongo local; các suite dùng database test riêng.

[Hướng dẫn Thunder Client](../../docs/testing/lms-08.md) · [Collection](../../docs/testing/lms-08.thunder-collection.json) · [Environment mẫu](../../docs/testing/lms-08.thunder-environment.json). OpenAPI/Scalar: `/openapi.json` và `/docs`.

Test tích hợp: `npm run test:lms08`; test role/ownership độc lập: `npm run test:lms08:permissions`. Chạy trên database local/test theo hướng dẫn, không chạy vào dữ liệu production.

```bash
npm install
npm run dev
npm run sync-indexes
```
