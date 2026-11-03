# Chương 5. Tổ chức nhóm và phân công

## 5.1. Thành viên

| Họ tên | Vai trò năng lực | Ghi chú |
|--------|------------------|---------|
| Nguyễn Xuân Kiên | Track khó / linh hoạt | Lead kỹ thuật scaffold, Auth, review |
| Nguyễn Anh Tú | Track khó / linh hoạt | Core API Class & bảng tin |
| Nguyễn Quốc Hưng | Track khó / linh hoạt | Bài tập – nộp – chấm |
| Nguyễn Quang Lộc | Track medium | Mobile lớp & bảng tin |
| Ngô Quang Huy | Track medium → dễ | Mobile Material & auth UI; cần checklist chi tiết |

## 5.2. Phân công theo module

| Thành viên | Backend / hạ tầng | Giao diện (màn hình) | Độ khó |
|------------|-------------------|----------------------|--------|
| Nguyễn Xuân Kiên | Khởi tạo repo, Auth Service, hợp đồng JWT, README/Docker tối thiểu, review PR | Hỗ trợ tích hợp & review | Cao |
| Nguyễn Anh Tú | Core API: Class, Post, Comment, kiểm tra ownership | Hỗ trợ contract cho mobile | Cao |
| Nguyễn Quốc Hưng | Core API: Exercise, Submission, Grade | Mobile Teacher: danh sách nộp bài, chấm điểm | Cao |
| Nguyễn Quang Lộc | — | Mobile: danh sách lớp, join, chi tiết, stream + comment | Trung bình |
| Ngô Quang Huy | — | Mobile: Login/Register, danh sách/thêm Material (theo checklist) | Trung bình → dễ |

## 5.3. Quy tắc phối hợp

1. Làm **song song** với dự án 30Shine; không bắt buộc hoàn thành hết LMS mới làm dự án kia.  
2. Mỗi thành viên bảo đảm **ít nhất 2 màn hình** có dấu ấn rõ trên GitHub.  
3. Thay đổi API phải cập nhật tài liệu contract (Swagger hoặc mục API trong Chương 6) trước khi mobile tích hợp.  
4. Pull request nhỏ, có mô tả cách kiểm thử thủ công.  
5. Task của Huy phải kèm **checklist từng bước** do Kiên hoặc Tú soạn.  

## 5.4. Definition of Done (một hạng mục)

- [ ] Chạy được trên môi trường local theo README.  
- [ ] Luồng được giao không còn dữ liệu hard-code.  
- [ ] UI có loading / empty / lỗi cơ bản (nếu là màn hình).  
- [ ] API có kiểm tra quyền phù hợp (nếu là backend).  
- [ ] Đã commit/PR lên đúng repository LMS.  

## 5.5. Đếm màn hình mobile & chia đều (19 màn)

> **Ghi chú:** Số màn ≠ độ khó. Ví dụ *Lịch của lớp* (thêm buổi + time picker) và *Chi tiết bài tập* (nộp Cloudinary / chấm điểm) nặng hơn *Hồ sơ*. Tab GV/HS dùng chung shell (Home, Lớp, Work, Lịch, Profile) được **gộp 1 màn** theo trải nghiệm; vẫn kiểm tra cả hai role. Layout / `+not-found` / `+html` không tính.

### Tổng inventory: **19/19** (không trùng)

| # | Màn hình | Route chính |
|---|----------|-------------|
| 1 | Đăng nhập | `(auth)/login` |
| 2 | Đăng ký | `(auth)/register` |
| 3 | Quên mật khẩu | `(auth)/forgot-password` |
| 4 | Trang chủ | `(teacher\|student)/index` |
| 5 | Danh sách lớp (tạo / join + phí) | `(teacher\|student)/classes` |
| 6 | Chi tiết lớp & thành viên | `class/[id]` |
| 7 | Bảng tin lớp | `class/[id]/stream` |
| 8 | Tài liệu lớp | `class/[id]/materials` |
| 9 | Danh sách bài tập | `class/[id]/exercises` |
| 10 | Chi tiết bài tập (nộp / chấm) | `class/[id]/exercise/[exerciseId]` |
| 11 | Lịch tổng quan | `(teacher\|student)/schedule` |
| 12 | Lịch của lớp | `class/[id]/schedule` |
| 13 | Công việc (Work) | `(teacher\|student)/work` |
| 14 | Hồ sơ | `(teacher\|student)/profile` |
| 15 | Tài khoản | `account` |
| 16 | Đổi mật khẩu | `change-password` |
| 17 | Lịch sử thanh toán | `payments` |
| 18 | Lịch sử nộp bài | `submissions` |
| 19 | Sổ điểm | `gradebook` |

### Phân công theo tỷ lệ **4 – 4 – 4 – 3 – 4**

Người nhận **3 màn** giữ luồng lớp phức tạp (tạo/join + chi tiết + bảng tin).

| Thành viên | Số màn | Màn hình được giao |
|------------|--------|--------------------|
| **Nguyễn Xuân Kiên** | 4 | Đăng nhập · Quên mật khẩu · Tài khoản · Đổi mật khẩu |
| **Nguyễn Anh Tú** | 4 | Trang chủ · Lịch tổng quan · Lịch của lớp · Lịch sử thanh toán |
| **Nguyễn Quốc Hưng** | 4 | Công việc (Work) · Danh sách bài tập · Chi tiết bài tập (nộp/chấm) · Sổ điểm |
| **Nguyễn Quang Lộc** | 3 | Danh sách lớp (tạo/join + phí) · Chi tiết lớp & thành viên · Bảng tin lớp |
| **Ngô Quang Huy** | 4 | Đăng ký · Hồ sơ · Tài liệu lớp · Lịch sử nộp bài |

**Cộng:** 4+4+4+3+4 = **19**.

### Checklist khi nhận màn

1. Luồng chính + empty / loading / lỗi.  
2. Quyền theo role (GV / HS) và membership lớp.  
3. Contract API đúng OpenAPI; không hard-code dữ liệu demo trên UI.  
4. Có commit/PR gắn tên mình trên GitHub cho ≥ 2 màn được giao.

## 5.6. Liên kết quản lý

- Tracking / Kanban: [Notion LMS](https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a)
