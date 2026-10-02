# LMS-09 — Submission và Grade

## Đọc code theo thứ tự

1. `services/core-api/src/routes/submission.routes.ts`: đường dẫn gọi API.
2. `services/core-api/src/controllers/submission.controller.ts`: kiểm tra body bằng Zod, trả HTTP response.
3. `services/core-api/src/services/submission.service.ts`: kiểm tra quyền, hạn nộp và đọc/ghi MongoDB.
4. `services/core-api/src/models/Submission.ts` và `Grade.ts`: model có sẵn, không đổi schema.

Luồng xử lý đơn giản: kiểm tra ID → tìm lớp → kiểm tra thành viên → tìm bài tập thuộc lớp → kiểm tra quyền/hạn → đọc hoặc lưu dữ liệu.

## Quy tắc đã duyệt

- Student trong lớp nộp một Submission cho mỗi Exercise. POST trùng trả 409; dùng PUT để sửa.
- Chỉ được nộp/sửa khi giờ server **nhỏ hơn** `dueAt`; đúng hạn hoặc sau hạn trả 400 `DEADLINE_PASSED`.
- PUT thay thế cả `content` và `url`; trường bỏ qua trở thành chuỗi rỗng. Cần ít nhất một giá trị sau trim. Nội dung tối đa 10.000 ký tự, URL HTTP(S) tối đa 2.048 ký tự.
- Teacher phải có JWT teacher, membership teacher và sở hữu lớp mới được xem danh sách/chấm bài.
- Chấm điểm mở khi giờ server **lớn hơn hoặc bằng** `dueAt`; chấm sớm trả 400 `GRADING_NOT_OPEN`. Đây là quyết định được duyệt trong kế hoạch LMS-09.
- Điểm là số từ 0 đến 10, có thể là số thập phân; feedback tối đa 10.000 ký tự.
- Mỗi Submission chỉ có một Grade. PUT grade tạo hoặc cập nhật, luôn trả 200 và giữ Grade ID khi cập nhật.
- Student chỉ đọc bài và điểm của mình; đọc bài Student khác trả 403. Trước khi chấm, `grade` là `null`.
- `studentId`, `submittedAt`, `gradedBy`, `gradedAt` do server gán; body chứa trường lạ trả 422.
- Mỗi resource được ràng buộc với parent trong URL, không dùng ID của bài tập/lớp khác để đọc hoặc chấm bài.

Hạn được kiểm tra tại lúc service xử lý, ngay trước lệnh ghi Mongo. Không có transaction/khóa cho lệnh ghi đang chạy xuyên qua thời điểm deadline; đây chưa phải cơ chế đóng băng bài nộp có bảo đảm thứ tự commit.

## Endpoint

Base: `/classes/:classId/exercises/:exerciseId/submissions`.

| Method | Đường dẫn | Quyền | Thành công |
| --- | --- | --- | --- |
| POST | Base | Student thành viên | 201 `{ submission }` |
| PUT | Base + `/mine` | Student thành viên | 200 `{ submission }` |
| GET | Base + `/mine` | Student thành viên | 200 `{ submission, grade }` |
| GET | Base | Teacher sở hữu lớp | 200 `{ submissions }`, mỗi bài có grade/null |
| GET | Base + `/:submissionId` | Teacher sở hữu lớp hoặc Student sở hữu bài | 200 `{ submission, grade }` |
| PUT | Base + `/:submissionId/grade` | Teacher sở hữu lớp | 200 `{ grade }` |

Lỗi dùng `{ error, code }`: 400 sai ID/hạn; 401 chưa đăng nhập; 403 thiếu quyền; 404 không có resource trong parent tương ứng; 409 nộp trùng; 422 body sai.

## Chạy test tự động

MongoDB local cần chạy ở port 27017. Cài dependencies như README dự án. Không cần bật Core riêng cho hai suite LMS-09: HTTP suite tự mở Core trên port tạm.

```powershell
npm run typecheck --prefix services/core-api
npm run build --prefix services/core-api
npm run test:lms09 --prefix services/core-api
npm run test:lms09:permissions --prefix services/core-api
```

- HTTP suite mặc định dùng `lms09_test_http` và JWT chỉ dành cho test; chạy server thật cùng middleware/controller/service và Mongo thật.
- Permission suite dùng `lms09_test_permissions`; kiểm tra trước hạn 1ms/đúng hạn bằng đồng hồ cố định, luôn khôi phục `Date.now()`.
- Hai suite đợi unique indexes trước khi kiểm tra đồng thời và dọn đúng fixtures do mình tạo trong `finally`.
- Có thể đặt `TEST_CORE_MONGO_URI`, nhưng chỉ chấp nhận localhost và tên database bắt đầu `lms09_test_`.
- Khi test HTTP có `AUTH_URL`, nó register/login ba tài khoản qua Auth thật. Chỉ trỏ vào Auth local dùng database test riêng và JWT secret `lms09-local-test-secret-at-least-32-characters`. Những tài khoản này ở lại database test; không dùng Auth có dữ liệu thật.

Ví dụ bật Auth test (terminal riêng, từ root repo):

```powershell
$env:MONGO_URI='mongodb://127.0.0.1:27017/lms09_test_auth_regression'
$env:JWT_SECRET='lms09-local-test-secret-at-least-32-characters'
$env:PORT='4001'
$env:NODE_ENV='test'
npm run dev --prefix services/auth-service
```

Sau đó ở terminal khác:

```powershell
$env:AUTH_URL='http://127.0.0.1:4001'
npm run test:lms09 --prefix services/core-api
Remove-Item Env:AUTH_URL
```

## Curl pass/fail để review hoặc đưa vào PR

Chạy Auth/Core local theo README, tạo lớp, cho hai Student tham gia, tạo Exercise có hạn sắp tới qua LMS-08. Điền các biến bên dưới bằng token/ID test thực tế. Không commit token. Ví dụ dùng PowerShell 7 và `curl.exe` trên Windows; thêm `-i` để thấy HTTP status.

```powershell
$base='http://127.0.0.1:4002/classes/CLASS_ID/exercises/EXERCISE_ID/submissions'
$studentToken='STUDENT_JWT'
$peerToken='OTHER_STUDENT_JWT'
$teacherToken='OWNER_TEACHER_JWT'
$otherTeacherToken='OTHER_TEACHER_JWT'

# Trước hạn: 201; gọi lại trả 409 SUBMISSION_EXISTS.
curl.exe -i -X POST $base -H "Authorization: Bearer $studentToken" -H 'Content-Type: application/json' --data-raw '{"content":"My answer","url":""}'

# Điền _id từ response trên.
$submissionId='SUBMISSION_ID'

# Trước hạn: 200, giữ nguyên _id.
curl.exe -i -X PUT "$base/mine" -H "Authorization: Bearer $studentToken" -H 'Content-Type: application/json' --data-raw '{"content":"Revised answer","url":"https://example.com/work"}'

# 200 với grade:null trước chấm; 403 với Student khác.
curl.exe -i "$base/mine" -H "Authorization: Bearer $studentToken"
curl.exe -i "$base/$submissionId" -H "Authorization: Bearer $peerToken"

# Owner: 200 danh sách; Teacher khác: 403 FORBIDDEN.
curl.exe -i $base -H "Authorization: Bearer $teacherToken"
curl.exe -i -X PUT "$base/$submissionId/grade" -H "Authorization: Bearer $otherTeacherToken" -H 'Content-Type: application/json' --data-raw '{"score":8.5,"feedback":"Good explanation"}'

# Owner trước hạn: 400 GRADING_NOT_OPEN. Chạy lại sau dueAt: 200.
curl.exe -i -X PUT "$base/$submissionId/grade" -H "Authorization: Bearer $teacherToken" -H 'Content-Type: application/json' --data-raw '{"score":8.5,"feedback":"Good explanation"}'

# Sau hạn: 400 DEADLINE_PASSED; nội dung cũ không đổi.
curl.exe -i -X PUT "$base/mine" -H "Authorization: Bearer $studentToken" -H 'Content-Type: application/json' --data-raw '{"content":"Too late"}'

# Sau chấm: 200, grade.score = 8.5 và feedback được lưu.
curl.exe -i "$base/mine" -H "Authorization: Bearer $studentToken"
```

Các status ở phần curl là kết quả mong đợi; bằng chứng chạy tự động ghi bên dưới.

## Bằng chứng kiểm tra ngày 2026-09-24

- Core API typecheck và build: PASS.
- LMS-09 HTTP: **44 request assertions**, thêm assertions về Mongo persistence và concurrent POST/PUT: PASS, cả JWT test và real Auth register/login.
- LMS-09 permission/deadline: **18 rejection cases**, thêm assertions submit/edit trước hạn 1ms, grade đúng hạn và read-back Mongo: PASS.
- LMS-08 regression: **35 passed, 0 failed**; permission boundaries: **5 passed, 0 failed**.
- LMS-05: script E2E PASS.
- LMS-06: script báo **23 scenarios PASS**.
- Docs smoke: token helpers, `/openapi.json`, `/docs`: PASS.
- Review độc lập đã kiểm tra code; đã sửa schema `grade:null` sang `anyOf` đúng OpenAPI 3.1.

Core regression dùng `lms09_test_core_regression`, Auth regression dùng `lms09_test_auth_regression`. Không đổi `.env` của dự án. Database regression giữ dữ liệu test từ các script cũ; không xóa database của người dùng.

## Cleanup

Các bản kế hoạch LMS-08/LMS-09 đã hoàn thành được thay bằng hướng dẫn kiểm thử/contract hiện hành tại `docs/testing/lms-08.md` và tài liệu này. Giữ nguyên README, ADR, báo cáo, collection kiểm thử, model và các script test còn sử dụng. Dọn scratch phục vụ phiên triển khai sau khi kiểm tra xong.

Chưa tạo PR hoặc đánh dấu Done trên Notion trong bước triển khai local này. Khi tạo PR, đính kèm bằng chứng runtime và curl pass/fail theo DoD của card.
