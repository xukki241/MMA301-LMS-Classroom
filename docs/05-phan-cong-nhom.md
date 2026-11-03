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
| Nguyễn Xuân Kiên | Khởi tạo repo, Auth Service, hợp đồng JWT, README/Docker tối thiểu, review PR | Mobile: Trang chủ, Lịch, **chấm điểm bài nộp**, sổ điểm | Cao |
| Nguyễn Anh Tú | Core API: Class, Post, Comment, kiểm tra ownership | Mobile: Login, quên MK, tài khoản, đổi MK, lịch sử thanh toán | Cao |
| Nguyễn Quốc Hưng | Core API: Exercise, Submission, Grade | Mobile: Work, DS/tạo bài tập, nộp bài HS, lịch sử nộp | Cao |
| Nguyễn Quang Lộc | — | Mobile: tạo/join lớp + SePay, chi tiết lớp, stream | Trung bình |
| Ngô Quang Huy | — | Mobile: Register, hồ sơ, tài liệu + thêm Material | Trung bình → dễ |

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

## 5.5. Đếm màn hình mobile & chia đều (23 màn)

> **Ghi chú:** Đếm theo **luồng UX** (không chỉ file route). Cùng một route có thể tách 2 màn nếu role/hành vi khác hẳn (vd. nộp bài HS vs chấm điểm GV; tạo lớp vs join + SePay). Tab GV/HS cùng shell vẫn gộp khi UI gần giống. Layout / `+not-found` / `+html` / redirect `index` không tính. Số màn ≠ độ khó.

### Tổng inventory: **23/23** (không trùng)

| # | Màn hình | Route / bề mặt chính |
|---|----------|----------------------|
| 1 | Đăng nhập | `(auth)/login` |
| 2 | Đăng ký | `(auth)/register` |
| 3 | Quên mật khẩu | `(auth)/forgot-password` |
| 4 | Trang chủ | `(teacher\|student)/index` |
| 5 | Danh sách lớp — tạo lớp (GV) | `(teacher)/classes` |
| 6 | Join lớp + thanh toán SePay (HS) | `(student)/classes` + WebView SePay |
| 7 | Chi tiết lớp & thành viên | `class/[id]` |
| 8 | Bảng tin lớp | `class/[id]/stream` |
| 9 | Tài liệu lớp | `class/[id]/materials` |
| 10 | Thêm / quản lý tài liệu | modal + Cloudinary trên `materials` |
| 11 | Danh sách bài tập | `class/[id]/exercises` |
| 12 | Tạo / sửa bài tập | modal tạo/sửa trên `exercises` |
| 13 | Nộp bài (học sinh) | `class/[id]/exercise/[exerciseId]` (role HS) |
| 14 | Chấm điểm bài nộp (giáo viên) | `class/[id]/exercise/[exerciseId]` (role GV) |
| 15 | Lịch tổng quan | `(teacher\|student)/schedule` |
| 16 | Lịch của lớp | `class/[id]/schedule` |
| 17 | Công việc (Work) | `(teacher\|student)/work` |
| 18 | Hồ sơ | `(teacher\|student)/profile` |
| 19 | Tài khoản | `account` |
| 20 | Đổi mật khẩu | `change-password` |
| 21 | Lịch sử thanh toán | `payments` |
| 22 | Lịch sử nộp bài | `submissions` |
| 23 | Sổ điểm | `gradebook` |

### Phân công theo tỷ lệ **5 – 5 – 5 – 4 – 4**

| Thành viên | Số màn | Màn hình được giao |
|------------|--------|--------------------|
| **Nguyễn Xuân Kiên** | 5 | Trang chủ · Lịch tổng quan · Lịch của lớp · **Chấm điểm bài nộp** · **Sổ điểm** |
| **Nguyễn Anh Tú** | 5 | Đăng nhập · Quên mật khẩu · Tài khoản · Đổi mật khẩu · Lịch sử thanh toán |
| **Nguyễn Quốc Hưng** | 5 | Công việc (Work) · Danh sách bài tập · Tạo / sửa bài tập · Nộp bài (HS) · Lịch sử nộp bài |
| **Nguyễn Quang Lộc** | 4 | Danh sách lớp — tạo (GV) · Join lớp + SePay (HS) · Chi tiết lớp & thành viên · Bảng tin lớp |
| **Ngô Quang Huy** | 4 | Đăng ký · Hồ sơ · Tài liệu lớp · Thêm / quản lý tài liệu |

**Cộng:** 5+5+5+4+4 = **23**.

### Checklist khi nhận màn

1. Luồng chính + empty / loading / lỗi.  
2. Quyền theo role (GV / HS) và membership lớp.  
3. Contract API đúng OpenAPI; không hard-code dữ liệu demo trên UI.  
4. Có commit/PR gắn tên mình trên GitHub cho ≥ 2 màn được giao.

## 5.6. Liên kết quản lý

- Tracking / Kanban: [Notion LMS](https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a)
