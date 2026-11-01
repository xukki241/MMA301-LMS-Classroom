# Chương 2. Phân tích yêu cầu

## 2.1. Yêu cầu chức năng

### RF01 — Xác thực và phân quyền

| Mã | Mô tả | Actor | Ưu tiên |
|----|--------|-------|---------|
| RF01.1 | Đăng ký tài khoản với vai trò Teacher hoặc Student | Khách | Bắt buộc |
| RF01.2 | Đăng nhập, nhận JWT | User | Bắt buộc |
| RF01.3 | Các API nghiệp vụ từ chối request không hợp lệ / sai quyền | Hệ thống | Bắt buộc |

### RF02 — Quản lý lớp học

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF02.1 | Tạo lớp; hệ thống phát sinh mã tham gia | Teacher |
| RF02.2 | Tham gia lớp bằng mã | Student |
| RF02.3 | Xem danh sách lớp của mình | Teacher, Student |
| RF02.4 | Xem chi tiết lớp | Thành viên lớp |

### RF03 — Bảng tin

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF03.1 | Đăng Post trong lớp | Teacher (Student tùy cấu hình MVP: cho phép hoặc chỉ Teacher) |
| RF03.2 | Bình luận trên Post | Thành viên lớp |
| RF03.3 | Xem danh sách Post / Comment | Thành viên lớp |

> **Quy ước MVP:** Teacher đăng Post; Student và Teacher đều Comment được.

### RF04 — Tài liệu (Material)

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF04.1 | Thêm Material (tiêu đề, mô tả, đường dẫn/link) thuộc Class | Teacher |
| RF04.2 | Xem danh sách Material theo Class | Thành viên lớp |

### RF05 — Bài tập và chấm điểm

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF05.1 | Tạo Exercise (tiêu đề, mô tả, hạn nộp) | Teacher |
| RF05.2 | Student nộp Submission | Student |
| RF05.3 | Teacher xem danh sách Submission và gắn Grade | Teacher |
| RF05.4 | Student xem điểm / phản hồi của bài mình | Student |

### RF06 — Lịch học và lịch kiểm tra

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF06.1 | Thêm / xóa buổi học lặp hằng tuần của lớp (thứ, giờ bắt đầu, giờ kết thúc, phòng) | Teacher (chủ lớp) |
| RF06.2 | Thêm / xóa kỳ kiểm tra của lớp (tiêu đề, ngày giờ, thời lượng, phòng) | Teacher (chủ lớp) |
| RF06.3 | Xem lịch học và lịch kiểm tra của từng lớp; xem gộp mọi lớp ở tab Lịch | Thành viên lớp |

> **Quy ước:** kỳ kiểm tra là một mốc thời gian trên lịch, khác Exercise (hạn nộp). Thời điểm kiểm tra phải ở tương lai; giờ kết thúc buổi học phải sau giờ bắt đầu.

### RF07 — Quản lý thành viên và tài nguyên lớp

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF07.1 | Danh sách thành viên hiển thị tên (lấy từ JWT của Auth Service, lưu dạng ảnh chụp trên ClassMember) | Thành viên lớp |
| RF07.2 | Gỡ học sinh khỏi lớp; không gỡ được chủ lớp | Teacher (chủ lớp) |
| RF07.3 | Sửa tiêu đề / liên kết / mô tả Material (bổ sung cho thêm, xem, xóa) | Teacher (chủ lớp) |

### RF08 — Tổng quan theo người dùng

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF08.1 | `GET /me/overview` trả lớp, lịch học, kỳ kiểm tra sắp tới và bài tập kèm trạng thái theo vai trò | Teacher, Student |
| RF08.2 | Student: trạng thái bài `todo / submitted / graded / overdue`, điểm và nhận xét; có bảng điểm theo lớp với điểm trung bình | Student |
| RF08.3 | Teacher: trạng thái bài `open / needs_grading / done` kèm số bài nộp và số bài đã chấm | Teacher |
| RF08.4 | Ứng dụng có 5 tab cho cả hai vai trò: Trang chủ, Lịch, Việc, Lớp, Tôi | Teacher, Student |

## 2.2. Yêu cầu phi chức năng

| Mã | Nhóm | Mô tả |
|----|------|--------|
| RNF01 | Hiệu năng | Các màn danh sách phản hồi trong ngưỡng chấp nhận được trên thiết bị trung bình; có trạng thái loading |
| RNF02 | Bảo mật | Không lưu mật khẩu dạng plain text; API bảo vệ bằng JWT; phân quyền theo role và membership lớp |
| RNF03 | Khả dụng | README hướng dẫn cài đặt; có dữ liệu seed demo |
| RNF04 | Bảo trì | Tách Auth Service và Core API; mã nguồn TypeScript/JavaScript rõ module |
| RNF05 | Tương thích | Bắt buộc chạy Android (máy thật hoặc giả lập) |

## 2.3. Use case tổng quan

```text
[Teacher] -- tạo lớp, post, material, exercise, chấm bài --> (LMS)
[Student] -- join, comment, xem material, nộp bài, xem điểm --> (LMS)
[Auth Service] -- phát hành / xác thực token --> (Core API)
```

## 2.4. Ràng buộc từ đề cương môn học

- Frontend: React Native (Expo hoặc CLI).  
- Backend: một trong các lựa chọn được phép (nhóm chọn Node.js/Express).  
- Database: không dùng SQLite; chọn MongoDB hoặc MySQL/SQL Server/Firebase.  
- Giao tiếp: REST, JSON; xử lý loading/lỗi cơ bản.  
- Nhóm tối đa 5; mỗi người ít nhất 2 màn hình; commit đầy đủ GitHub.  

## 2.5. Tiêu chí chấp nhận (Acceptance)

Một bản build được coi là hoàn thành MVP khi:

1. Teacher tạo được lớp; Student join bằng mã.  
2. Có ít nhất một Post kèm Comment.  
3. Có ít nhất một Material.  
4. Có ít nhất một Exercise với Submission và Grade.  
5. Toàn bộ thao tác trên đi qua API và DB thật.  
