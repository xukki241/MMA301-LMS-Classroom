# Hướng dẫn kiểm thử LMS-29 — Lịch & Dòng thời gian hạn chót (Calendar & Deadline Agenda)

Tài liệu hướng dẫn kiểm thử tự động và thủ công cho tính năng **Lịch & Dòng thời gian hạn chót** (Task LMS-29).

---

## 1. Tổng quan tính năng
- **Mục tiêu**: Cho phép học sinh và giáo viên theo dõi tập trung toàn bộ lịch trình và hạn chót học tập: tự động tổng hợp hạn nộp bài tập (`exercises.dueAt`) từ các lớp đang tham gia và hạn chót công việc cá nhân (`tasks.dueDate`).
- **Phạm vi bảo mật**: 
  - Chỉ tổng hợp bài tập của các lớp mà người dùng là thành viên hoặc giáo viên sở hữu.
  - Phân lập dữ liệu hoàn toàn đối với task cá nhân: người dùng chỉ thấy các task của chính mình.
  - Không cho phép người ngoài truy cập hoặc xem lịch của người khác.
- **Thành phần**:
  - Backend: `services/core-api/src/services/calendar.service.ts`, `services/core-api/src/controllers/calendar.controller.ts`, `services/core-api/src/routes/calendar.routes.ts`.
  - OpenAPI Docs: Tag **Lịch trình & Hạn chót (LMS-29)** tại `/docs`.
  - Frontend Mobile: `apps/mobile/src/screens/CalendarScreen.tsx`, `apps/mobile/src/lib/calendar-api.ts`, `apps/mobile/src/lib/offline-data.ts`.
  - Tab điều hướng: Tab **"Lịch"** mới trong thanh điều hướng 5 tab của cả Student và Teacher, cùng nút tắt "Lịch trình" trên Trang chủ (`HomeDashboard.tsx`).

---

## 2. Kiểm thử tự động (Automated Tests)

### 2.1. Test tích hợp Backend Core API & Deadline Aggregation
Kiểm thử toàn bộ nghiệp vụ tổng hợp, phân lập lớp học, phân lập task cá nhân, tính toán trạng thái nộp bài và điểm số:
```powershell
npm run test:lms29 --prefix services/core-api
```
**Kết quả mong đợi**:
```text
=== BẮT ĐẦU TEST TÍCH HỢP CHO LMS-29 (CALENDAR & DEADLINE AGENDA) ===
1. Thiết lập dữ liệu mẫu (Classes, Exercises, Tasks)...
2. Kiểm tra Service boundaries:
   ✓ Mốc thời gian sai định dạng bị từ chối (400)
   ✓ from > to bị từ chối (400)
   ✓ Lọc lớp không thuộc về mình bị chặn (403)
   ✓ Student A thấy đúng 4 sự kiện, không bị lẫn bài tập lớp 2 hay task của Student B
   ✓ Trạng thái nộp bài và điểm số được trích xuất chính xác
   ✓ Trạng thái chưa nộp (pending) tính toán chính xác
   ✓ Student B chỉ thấy sự kiện của mình
   ✓ Teacher thấy tổng hợp bài tập của tất cả các lớp đang dạy
3. Kiểm tra HTTP Express Routes:
   ✓ GET /calendar/events không có token trả về 401
   ✓ GET /calendar/events trả về 200 kèm events và summary đầy đủ
   ✓ Lọc ?type=exercise lọc đúng sự kiện bài tập
   ✓ Lọc ?type=task lọc đúng task cá nhân

=== TẤT CẢ CÁC KIỂM THỬ LMS-29 ĐỀU ĐẠT (PASS) ===
```

### 2.2. Test Unit Mobile Calendar API Client
Kiểm thử kiểm tra normalizer dữ liệu sự kiện bài tập, task cá nhân, fallback an toàn và lời gọi API:
```powershell
npm test --prefix apps/mobile
```
Toàn bộ 105 tests đều PASS bao gồm `tests/calendar-api.test.cjs`.

---

## 3. Kiểm thử qua giao diện Scalar Docs (Interactive Testing)
1. Khởi động Core API:
   ```powershell
   npm run dev:core
   ```
2. Mở trình duyệt truy cập: `http://127.0.0.1:4002/docs`.
3. Lấy token kiểm thử:
   - Cuộn đến mục **Authentication & Lấy Token** -> Bấm **POST /docs/tokens/student** -> Bấm **Test Request**.
   - Copy chuỗi `token`.
   - Nhấn nút **Authorize** ở góc trên giao diện Scalar -> dán token vào ô **BearerAuth** -> **Save**.
4. Kiểm thử endpoint trong tag **Lịch trình & Hạn chót (LMS-29)**:
   - `GET /calendar/events`:
     - Tham số query tùy chọn: `from`, `to`, `type` (`exercise` hoặc `task`), `status` (`pending`, `completed`, `overdue`).
     - Bấm **Test Request** -> Nhận mã `200 OK` kèm mảng `events` và đối tượng `summary`.

---

## 4. Kịch bản kiểm thử thủ công trên Mobile (Manual Test Cases)

| Mã test | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **CAL-01** | Xem giao diện Lịch & Timeline | 1. Đăng nhập ứng dụng với tài khoản Student hoặc Teacher.<br>2. Bấm vào tab **"Lịch"** ở thanh điều hướng dưới (hoặc bấm Quick Action "Lịch trình" từ Trang chủ). | Màn hình hiển thị: Thanh lịch tuần 7 ngày, 4 thẻ thống kê tiến độ, thanh lọc loại sự kiện, chip lọc trạng thái và danh sách dòng thời gian (Agenda). |
| **CAL-02** | Chuyển đổi ngày trên thanh lịch tuần | 1. Bấm nút mũi tên `<` hoặc `>` để chuyển tuần.<br>2. Bấm chọn một ngày bất kỳ (ví dụ: Thứ Ba). | Danh sách Agenda bên dưới tự động lọc và chỉ hiển thị các bài tập/task có hạn chót vào đúng ngày đã chọn. Có nút "Hiện tất cả các ngày" để quay lại chế độ xem toàn bộ. |
| **CAL-03** | Lọc theo loại sự kiện | 1. Bấm vào nút "Bài tập lớp".<br>2. Bấm vào nút "Việc cá nhân".<br>3. Bấm vào nút "Tất cả". | Danh sách cập nhật tức thì: Khi chọn "Bài tập lớp" chỉ hiện các bài tập từ các lớp học; khi chọn "Việc cá nhân" chỉ hiện các task; khi chọn "Tất cả" hiện đầy đủ. |
| **CAL-04** | Nhận diện trạng thái và mức độ khẩn cấp | 1. Quan sát các thẻ bài tập và task trên danh sách. | Sự kiện quá hạn có vạch màu đỏ và badge "Quá hạn". Bài tập đã nộp có badge "Đã nộp", bài đã có điểm hiển thị điểm số (ví dụ: "9.5 điểm"). Task đã xong có tick xanh và chữ gạch ngang. |
| **CAL-05** | Tương tác 1-chạm vào Bài tập | 1. Bấm vào một thẻ bài tập trong danh sách. | Ứng dụng điều hướng mượt mà đến đúng màn hình chi tiết bài tập (`/class/[id]/exercise/[exerciseId]`) để nộp bài hoặc xem đề bài. |
| **CAL-06** | Tương tác 1-chạm vào Task cá nhân | 1. Bấm vào checkbox tròn bên cạnh thẻ task.<br>2. Bấm vào thân thẻ task. | Khi bấm checkbox: task đổi trạng thái hoàn thành ngay lập tức (có rung haptic). Khi bấm vào thẻ: mở modal TaskModal cho phép sửa tiêu đề, hạn chót, mức ưu tiên. |
