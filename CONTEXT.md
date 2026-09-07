# Phụ lục A — Thuật ngữ miền (LMS Classroom)

> Dùng trong báo cáo và khi code. Chỉ ghi khái niệm nghiệp vụ — không ghi chi tiết triển khai. Bản mô tả đề tài đầy đủ: `docs/00-muc-luc-bao-cao.md`.

Ứng dụng quản lý lớp học cho giáo viên và học sinh: tạo/tham gia lớp, bảng tin, tài liệu và bài tập. Phạm vi MVP hẹp, phù hợp môn React Native + REST API.

## Language

### Actors

**Teacher**:
Người dạy, sở hữu lớp và tạo nội dung học tập trong lớp.
_Avoid_: Instructor, admin lớp

**Student**:
Người học, tham gia lớp bằng mã và tương tác với nội dung.
_Avoid_: Learner, pupil

**User**:
Tài khoản đăng nhập; mỗi User mang đúng một role Teacher hoặc Student trong MVP.
_Avoid_: Account, profile (khi nói về identity đăng nhập)

### Class & content

**Class**:
Không gian học tập có mã tham gia, do Teacher tạo.
_Avoid_: Course, classroom, subject (trừ khi nói Material thuộc Class)

**Class Code**:
Chuỗi mã để Student tham gia Class.
_Avoid_: Invite link, enrollment key

**Post**:
Bài đăng trên bảng tin của Class.
_Avoid_: Announcement, feed item

**Comment**:
Phản hồi gắn với một Post.
_Avoid_: Reply (trừ UI copy)

**Material**:
Tài liệu học tập thuộc Class (link hoặc metadata file).
_Avoid_: Resource, document, attachment (trừ file đính kèm bài nộp)

**Exercise**:
Bài tập Teacher giao trong Class, có hạn nộp.
_Avoid_: Assignment, homework, quiz

**Submission**:
Bài Student nộp cho một Exercise.
_Avoid_: Attempt, answer sheet

**Grade**:
Điểm và phản hồi Teacher gắn với Submission.
_Avoid_: Score, mark, feedback (khi nói về thực thể chấm điểm)

### Auth boundary

**Auth Service**:
Service riêng chịu trách nhiệm đăng ký, đăng nhập và phát hành/xác thực token.
_Avoid_: User service, identity provider (trừ mô tả ngoài hệ thống)

**Core API**:
API nghiệp vụ LMS (Class, Post, Comment, Material, Exercise, Submission, Grade).
_Avoid_: Monolith (khi nói tên hệ thống), backend chung
