'# Test LMS-08 bằng Thunder Client

Phạm vi đã triển khai: tạo và danh sách Exercise theo lớp. Không có update/delete/detail, nộp bài hoặc chấm điểm. Nguồn: [task LMS-08](https://app.notion.com/p/LMS-08-Core-API-Exercise-3d41a3267e3e81da9027f9273d827c84).

## 1. Khởi động môi trường local

Mở terminal tại thư mục repo. MongoDB local cần chạy ở `127.0.0.1:27017`. Các lệnh dưới dùng hai database test riêng, không đụng database ứng dụng đang sử dụng. Nếu bạn dùng Docker Mongo của repo ở cổng 27018, đổi URI và thêm thông tin xác thực theo `.env` local của bạn.

Terminal 1 — Auth Service:

```powershell
$env:NODE_ENV = 'test'
$env:PORT = '4001'
$env:MONGO_URI = 'mongodb://127.0.0.1:27017/lms08_test_auth'
$env:JWT_SECRET = 'lms08-local-integration-test-secret-only'
npm run seed --prefix services/auth-service
npm run dev:auth
```

Terminal 2 — Core API:

```powershell
$env:NODE_ENV = 'test'
$env:PORT = '4002'
$env:MONGO_URI = 'mongodb://127.0.0.1:27017/lms08_test_core'
$env:JWT_SECRET = 'lms08-local-integration-test-secret-only'
npm run dev:core
```

JWT secret mẫu này chỉ dùng local. Nếu hai service đã chạy thì không bật thêm instance cùng cổng. `GET http://127.0.0.1:4001/health` và `GET http://127.0.0.1:4002/health` phải trả 200 trước khi tiếp tục.

Seed tạo `teacher@lms.local` và `student@lms.local`, mật khẩu mặc định `Demo123!`. Nếu bạn đã tùy chỉnh SEED_* trong môi trường, dùng đúng thông tin đã seed hoặc xóa các override trước khi seed database test mới.

## 2. Chuẩn bị Thunder Client

Trong VS Code, mở Thunder Client:

1. Collections → menu → Import → chọn `docs/testing/lms-08.thunder-collection.json`.
2. Env → Import → chọn `docs/testing/lms-08.thunder-environment.json`, rồi Set Active cho `LMS-08 local`.
3. Gửi request lần lượt theo số 01–15. Sau login và create class, sao chép các giá trị như hướng dẫn bên dưới. Collection có assertion HTTP status nhưng không tự lưu token; không chạy cả collection một lần khi chưa điền token/classId.

Theo [tài liệu Thunder Client](https://docs.thunderclient.com/features/import), Import/Export hiện thuộc bản trả phí. Nếu bản bạn đang dùng không cho import, chọn **New Request** và tạo thủ công theo các bước 3–6; không cần Postman hoặc chức năng scripting.

Các biến cần có trong Env (dùng `{{tenBien}}` trong request):

| Biến | Giá trị |
|---|---|
| authUrl | http://127.0.0.1:4001 |
| coreUrl | http://127.0.0.1:4002 |
| teacherEmail | teacher@lms.local |
| studentEmail | student@lms.local |
| password | Demo123! |
| teacherToken | Token từ login giáo viên |
| studentToken | Token từ login sinh viên |
| classId | class._id từ create class |
| classCode | class.code từ create class |

Token nên lưu trong Local Environment trên máy, không commit hoặc xuất file có token thật lên git. Nếu không dùng Env, thay biến bằng giá trị trực tiếp trong request.

## 3. Đăng nhập lấy hai token

**POST** `{{authUrl}}/auth/login`, Auth: None, Body → JSON:

```json
{ "email": "teacher@lms.local", "password": "Demo123!" }
```

Kỳ vọng **200**; copy trường `token` trong response vào `teacherToken`. Gửi request thứ hai đổi email thành `student@lms.local`, lưu `token` vào `studentToken`. Đây là JWT từ Auth Service thật.

## 4. Tạo lớp và cho sinh viên tham gia

**POST** `{{coreUrl}}/classes`. Auth → Bearer → `{{teacherToken}}`. Body → JSON:

```json
{ "name": "Lớp test LMS-08" }
```

Kỳ vọng **201**. Lưu `class._id` vào `classId`, `class.code` vào `classCode`.

Trước khi join, gửi **GET** `{{coreUrl}}/classes/{{classId}}/exercises` với `studentToken`: phải trả **403** vì chưa là thành viên.

Sau đó **POST** `{{coreUrl}}/classes/join`, dùng `studentToken`:

```json
{ "code": "{{classCode}}" }
```

Kỳ vọng **200**. Gửi lại GET danh sách: **200**, `{"exercises":[]}`.

## 5. Tạo bài tập rồi kiểm tra đã lưu

**POST** `{{coreUrl}}/classes/{{classId}}/exercises`, dùng `teacherToken`, Body → JSON:

```json
{
  "title": "Bài tập 1",
  "description": "Nộp báo cáo",
  "dueAt": "{{#dateISO, {day: 1}}}"
}
```

Biến hệ thống trên tạo hạn nộp ngày mai theo [tài liệu Thunder Client](https://docs.thunderclient.com/features/system-variables). Có thể thay bằng một thời điểm tương lai thực tế, ví dụ `2099-01-01T00:00:00.000Z`. Không gửi classId/createdBy trong body.

Kỳ vọng **201**, response có `message` và `exercise` gồm `_id`, `classId`, `title`, `description`, `dueAt`, `createdBy`, `createdAt`, `updatedAt`. `createdBy` phải bằng `user.id` của giáo viên đã login.

**GET** cùng URL, đổi sang `studentToken`: kỳ vọng **200** và `exercises` chứa đúng bài vừa tạo. GET lại với `teacherToken` cũng phải thành công. Danh sách sắp xếp theo dueAt tăng dần rồi _id tăng dần.

Collection đã có header Authorization. Nếu tự dùng tab Auth → Bearer, tránh thêm một header Authorization thứ hai; ô Bearer chỉ chứa token/biến, không thêm chữ `Bearer` lần nữa.

## 6. Kiểm tra các trường hợp bị từ chối

Mỗi ca dùng body hợp lệ của bước 5, chỉ thay phần được chỉ định; dùng teacherToken trừ khi ghi khác. Trong Tests, chọn kiểm tra Response Code bằng mã kỳ vọng, hoặc đọc Status sau Send.

| Ca test | Thao tác | Kỳ vọng |
|---|---|---|
| Sinh viên tạo bài | POST với studentToken | 403 FORBIDDEN |
| Hạn nộp quá khứ | dueAt = 2000-01-01T00:00:00Z | 400 INVALID_DUE_AT |
| Thiếu timezone | dueAt = 2099-01-01T12:00:00 | 400 INVALID_DUE_AT |
| Thiếu dueAt / ngày không tồn tại | Bỏ dueAt / dùng 2099-02-30T12:00:00Z | 400 INVALID_DUE_AT |
| Tiêu đề rỗng | title = ba dấu cách | 422 VALIDATION_ERROR |
| Giả mạo chủ bài | Thêm createdBy hoặc classId vào body | 422 VALIDATION_ERROR |
| Không có JWT | Bỏ header Authorization ở GET/POST | 401 UNAUTHENTICATED |
| JWT sai/hết hạn | Dùng token không hợp lệ | 401 INVALID_TOKEN |
| ID sai | classId = abc | 400 INVALID_ID |
| Lớp không tồn tại | classId = 000000000000000000000000 | 404 CLASS_NOT_FOUND |
| Người ngoài lớp | Token sinh viên khác chưa join, GET | 403 FORBIDDEN |
| Giáo viên lớp khác | Token giáo viên khác, POST vào classId cũ | 403 FORBIDDEN |

Hai ca cuối: tạo tài khoản khác bằng **POST** `{{authUrl}}/auth/register` với email mới, password tối thiểu 8 ký tự, displayName và role `student`/`teacher`; login để lấy token. Các ca lỗi trả `{ "error": "...", "code": "..." }` và không thêm Exercise. Chạy GET lần cuối để xác nhận số bài không tăng sau các request lỗi.

## 7. Test tự động và bằng chứng

```powershell
npm run typecheck --prefix services/core-api
npm run build --prefix services/core-api
npm run test:lms08 --prefix services/core-api
npm run test:lms08:permissions --prefix services/core-api
npm run test:lms05 --prefix services/core-api
npm run test:lms06 --prefix services/core-api
```

`test:lms08` tự đăng ký tài khoản test, đăng nhập, tạo lớp và kiểm tra API; mặc định dùng 4001/4002, có thể đặt AUTH_URL/CORE_URL cho cổng local khác. Script chỉ cho URL loopback; chỉ trỏ tới service dùng database test, vì fixture được giữ lại để kiểm tra. `test:lms08:permissions` kiểm tra role/ownership riêng trên `lms08_test_permissions`, tự xóa đúng fixture của lần chạy đó.

Mở `http://127.0.0.1:4002/docs` để xem contract trong nhóm **Bài tập (LMS-08)**; raw specification ở `/openapi.json`.

Khi nghiệm thu, lưu ảnh response create **201**, list **200**, student POST **403**, past dueAt **400** (ẩn Authorization/token), log test và commit/PR. Phần create/list không tự đáp ứng yêu cầu CRUD/detail còn mâu thuẫn trong DoD Gate của Notion.
