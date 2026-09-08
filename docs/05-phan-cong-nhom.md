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

## 5.5. Liên kết quản lý

- Tracking / Kanban: [Notion LMS](https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a)
