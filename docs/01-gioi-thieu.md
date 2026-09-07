# Chương 1. Giới thiệu đề tài

## 1.1. Tên đề tài

**Ứng dụng quản lý học tập (LMS) cho giáo viên và học sinh** — mô hình tham chiếu SHub Classroom / Google Classroom, triển khai trên nền tảng di động React Native.

## 1.2. Bối cảnh và lý do chọn đề tài

Trong môi trường đào tạo ngắn hạn hoặc lớp học quy mô nhỏ, giáo viên và học sinh cần một kênh thống nhất để:

- tổ chức lớp học và danh sách thành viên;
- công bố thông tin trên bảng tin;
- chia sẻ tài liệu học tập;
- giao bài, nộp bài và nhận điểm.

Các nền tảng thương mại (SHub, Google Classroom) đáp ứng tốt nhu cầu này nhưng không phù hợp làm đồ án môn học nếu sao chép toàn bộ quy mô sản phẩm. Do đó nhóm xây dựng phiên bản **LMS thu hẹp (Shub-lite)** — đủ luồng nghiệp vụ thật, đủ độ phức tạp cho đồ án React Native + backend, nhưng nằm trong khả năng hoàn thành của nhóm 5 thành viên.

## 1.3. Mục tiêu

| Mục tiêu | Mô tả |
|----------|--------|
| Chức năng | Hoàn thiện vòng đời lớp học: đăng nhập → tạo/tham gia lớp → bảng tin → tài liệu → giao/nộp/chấm bài |
| Kỹ thuật | Ứng dụng React Native kết nối REST API và cơ sở dữ liệu; chạy được trên Android |
| Tổ chức | Hai dịch vụ backend rõ biên giới (Auth Service, Core API); tài liệu và phân công đủ để nộp báo cáo và hướng dẫn phát triển |
| Học thuật | Đáp ứng yêu cầu môn Lập trình ứng dụng di động bằng React Native (API thật, không hard-code luồng chính, ≥ 3–5 màn hình, mỗi thành viên ≥ 2 màn) |

## 1.4. Đối tượng sử dụng

- **Teacher (Giáo viên):** tạo và quản lý lớp, đăng bài, đăng tài liệu, giao bài, chấm điểm.
- **Student (Học sinh):** tham gia lớp bằng mã, xem nội dung, bình luận, nộp bài, xem điểm.

## 1.5. Phạm vi đề tài

### Trong phạm vi (MVP)

1. Đăng ký / đăng nhập và phân quyền theo vai trò Teacher / Student.  
2. Tạo lớp, tham gia lớp bằng mã lớp.  
3. Bảng tin lớp: đăng bài (Post) và bình luận (Comment).  
4. Tài liệu học tập (Material) theo lớp.  
5. Bài tập (Exercise) → nộp bài (Submission) → chấm điểm (Grade).  
6. Ứng dụng di động React Native (Expo) cho Teacher và Student.  

### Ngoài phạm vi

- Cổng quản trị hệ thống phức tạp, điểm danh, phân tích nguy cơ học tập, push notification thật.  
- Kiến trúc nhiều microservice, gRPC, Redis/BullMQ, Socket.IO bắt buộc, giả lập S3/LocalStack.  

Chi tiết quyết định kỹ thuật xem `docs/adr/` và Chương 4.

## 1.6. Kết quả mong đợi khi nghiệm thu

1. Tài khoản Teacher và Student đăng nhập được trên thiết bị/giả lập Android.  
2. Demo end-to-end đủ vòng: tạo lớp → join → post/comment → material → giao/nộp/chấm.  
3. Dữ liệu lưu trên server (không hard-code luồng chính).  
4. Mã nguồn trên GitHub có lịch sử commit của cả nhóm; README cho phép máy mới chạy được.  
5. Bộ tài liệu này đủ dùng làm **báo cáo nộp** và **hướng dẫn cho thành viên phát triển**.  
