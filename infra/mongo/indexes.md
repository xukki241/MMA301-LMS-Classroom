# Index MongoDB — LMS MVP

Một instance Docker, hai database. Core không đọc `lms_auth`.

## `lms_auth`

| Collection | Index | Lý do |
|------------|-------|--------|
| `users` | `{ email: 1 }` unique | Đăng nhập / đăng ký |
| `users` | `{ role: 1 }` | Lọc seed / demo |

## `lms_core` (chuẩn bị cho Tú / Hưng / Huy)

| Collection | Index | Lý do |
|------------|-------|--------|
| `classes` | `{ code: 1 }` unique | Join bằng Class Code |
| `classes` | `{ teacherId: 1, createdAt: -1 }` | Danh sách lớp của Teacher |
| `classmembers` | `{ classId: 1, userId: 1 }` unique | Membership |
| `classmembers` | `{ userId: 1 }` | Danh sách lớp của Student |
| `posts` | `{ classId: 1, createdAt: -1 }` | Stream |
| `comments` | `{ postId: 1, createdAt: 1 }` | Comment theo Post |
| `materials` | `{ classId: 1, createdAt: -1 }` | Tài liệu lớp |
| `exercises` | `{ classId: 1, dueAt: 1 }` | Bài tập |
| `submissions` | `{ exerciseId: 1, studentId: 1 }` unique | Một bài nộp / học sinh |
| `grades` | `{ submissionId: 1 }` unique | 1–1 với Submission |
