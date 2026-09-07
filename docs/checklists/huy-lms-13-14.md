# Checklist — Ngô Quang Huy (LMS-13 + LMS-14)

Làm **đúng thứ tự**. Hỏi Kiên nếu bước nào đỏ. Không sửa Auth Service / JWT secret.

## LMS-13 — Login / Register (P0)

### 0. Chuẩn bị máy

- [ ] Node 20, Git, Expo Go trên điện thoại hoặc Android Emulator
- [ ] Clone **đúng** repo LMS: `https://github.com/xukki241/MMA301-LMS-Classroom` (không nhầm 30Shine)
- [ ] Copy `.env.example` → `.env` (đã có sẵn nếu Kiên scaffold xong)

### 1. Chạy backend trước khi vẽ UI

```bash
docker compose up -d mongo
cd services/auth-service && npm install && npm run seed && npm run dev
```

- [ ] Mở `http://localhost:4001/health` thấy `"ok": true`
- [ ] Đăng nhập thử seed: `teacher@lms.local` / `Demo123!`

```bash
curl -X POST http://localhost:4001/auth/login -H "Content-Type: application/json" -d "{\"email\":\"teacher@lms.local\",\"password\":\"Demo123!\"}"
```

### 2. Git

- [ ] Tạo nhánh `feature/lms-13-auth-ui`
- [ ] Chỉ sửa `apps/mobile` (màn Login/Register)

### 3. API phải gọi

| Màn | Method | URL | Body |
|-----|--------|-----|------|
| Register | POST | `{AUTH}/auth/register` | `{ email, password, displayName, role: "teacher" \| "student" }` |
| Login | POST | `{AUTH}/auth/login` | `{ email, password }` |

Response thành công: `{ token, user: { id, email, displayName, role } }`.

- [ ] Lưu `token` (SecureStore, **không** AsyncStorage plain nếu có thể; MVP chấp nhận SecureStore)
- [ ] Sau login: nếu `user.role === "teacher"` vào stack Teacher, không thì Student
- [ ] Loading / lỗi / empty (form trống) có UI
- [ ] Không hard-code user trong màn hình

Emulator Android: `EXPO_PUBLIC_AUTH_URL=http://10.0.2.2:4001`  
Máy thật: hỏi Kiên IP LAN.

### 4. Kiểm thử thủ công

- [ ] Register Student mới → vào student home
- [ ] Login Teacher seed → vào teacher home
- [ ] Sai mật khẩu → báo lỗi, không crash
- [ ] Logout (nếu Kiên đã có nút) xóa token

### 5. PR

- [ ] Mô tả: lệnh chạy + ảnh/video ngắn 2 luồng
- [ ] Không commit `.env`
- [ ] Gắn Notion LMS-13

## LMS-14 — Material list/add (P1, sau LMS-13)

Chưa làm cho đến khi Tú có Class API và **có contract** trong Chương 6 / Swagger.

- [ ] Đọc contract Material (Kiên/Tú cập nhật)
- [ ] Nhánh `feature/lms-14-materials`
- [ ] Màn danh sách Material theo `classId`
- [ ] Teacher: form thêm `{ title, description, url }`
- [ ] Student: chỉ xem
- [ ] Gọi Core API kèm `Authorization: Bearer <token>`
- [ ] Loading / empty / lỗi
- [ ] PR riêng, không gộp với LMS-13

## Khi kẹt

1. `/health` down → Mongo/Auth chưa chạy, đừng debug UI.
2. Network error trên máy thật → sai IP, không phải bug form.
3. 401 trên Material → thiếu header Bearer, hỏi Kiên LMS-03.
