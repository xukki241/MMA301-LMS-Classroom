# Chương 3. Thiết kế hệ thống

## 3.1. Kiến trúc tổng thể

Hệ thống theo mô hình **client–server**:

| Thành phần | Vai trò |
|------------|---------|
| `apps/mobile` | Ứng dụng React Native (Expo) — giao diện Teacher / Student |
| `services/auth-service` | Đăng ký, đăng nhập, phát hành JWT |
| `services/core-api` | Nghiệp vụ LMS (Class, Post, Material, Exercise, …) |
| Database | MongoDB Docker — `lms_auth` (Auth) và `lms_core` (Core API) |

```text
[Mobile App] --REST/JSON--> [Auth Service] --> [lms_auth]
[Mobile App] --REST/JSON + Bearer JWT--> [Core API] --> [lms_core]
[Core API] --verify JWT (shared secret, issuer/audience)--> không gọi Auth mỗi request
```

**Nguyên tắc:** Chỉ tách Auth thành service riêng; toàn bộ nghiệp vụ lớp học nằm trong một Core API. Không dùng gRPC/Redis cho MVP.

## 3.2. Mô hình miền (domain)

Thuật ngữ chuẩn nằm trong `CONTEXT.md`. Tóm tắt quan hệ:

```text
User (role: Teacher | Student)
  └─ tham gia → Class (có Class Code)
        ├─ Post → Comment
        ├─ Material
        └─ Exercise → Submission → Grade
```

## 3.3. Đặc tả thực thể chính

| Thực thể | Thuộc tính tối thiểu | Ghi chú |
|----------|----------------------|---------|
| User | id, email/username, passwordHash, role, createdAt | Role cố định lúc đăng ký (MVP) |
| Class | id, name, code, teacherId, createdAt | `code` unique |
| ClassMember | classId, userId, roleInClass | Student join tạo bản ghi này |
| Post | id, classId, authorId, content, createdAt | |
| Comment | id, postId, authorId, content, createdAt | |
| Material | id, classId, title, description, url, createdAt | URL/link giai đoạn đầu |
| Exercise | id, classId, title, description, dueAt, createdAt | |
| Submission | id, exerciseId, studentId, content/url, submittedAt | Unique (exerciseId, studentId) khuyến nghị |
| Grade | id, submissionId, score, feedback, gradedAt | 1–1 với Submission |

## 3.4. Luồng xử lý tiêu biểu

### 3.4.1. Tham gia lớp

1. Student gọi API join với `classCode`.  
2. Core API tìm Class theo code; kiểm tra đã là thành viên chưa.  
3. Tạo ClassMember; trả về thông tin lớp.  

### 3.4.2. Nộp bài và chấm điểm

1. Teacher tạo Exercise thuộc Class.  
2. Student tạo Submission (một lần hoặc cho phép cập nhật — MVP: một submission, cho phép sửa trước hạn nếu nhóm thống nhất).  
3. Teacher tạo/cập nhật Grade.  
4. Student đọc Grade của submission mình.  

## 3.5. Phân quyền (RBAC rút gọn)

| Hành động | Teacher sở hữu lớp | Student thành viên | Người ngoài |
|-----------|--------------------|--------------------|-------------|
| Sửa lớp / xóa nội dung lớp | Có | Không | Không |
| Đăng Post / Material / Exercise | Có | Không | Không |
| Comment | Có | Có | Không |
| Nộp bài | Không* | Có | Không |
| Chấm điểm | Có | Không | Không |

\*Teacher không nộp bài như Student trong MVP.

## 3.6. Giao diện màn hình (định hướng)

| Nhóm màn | Màn hình gợi ý | Phụ trách gợi ý |
|----------|----------------|-----------------|
| Auth | Login, Register | Huy |
| Lớp | Danh sách lớp, Join, Chi tiết lớp | Lộc |
| Bảng tin | Stream, Chi tiết Post + Comment | Lộc |
| Tài liệu | Danh sách Material, Thêm Material | Huy |
| Bài tập | Danh sách/Chi tiết Exercise, Nộp bài, Danh sách nộp + Chấm | Hưng (API + Teacher UI), Lộc/Huy hỗ trợ Student UI nếu cần |

Chi tiết phân công: `docs/05-phan-cong-nhom.md`.
