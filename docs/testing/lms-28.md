# Hướng dẫn kiểm thử LMS-28 — Quản lý công việc cá nhân (Personal Tasks)

Tài liệu hướng dẫn kiểm thử tự động và thủ công cho tính năng **Quản lý công việc cá nhân** (Task LMS-28).

---

## 1. Tổng quan tính năng
- **Mục tiêu**: Cho phép học sinh và giáo viên tạo, xem, cập nhật, chuyển đổi trạng thái hoàn thành và xóa các công việc cá nhân.
- **Phạm vi bảo mật**: Dữ liệu công việc thuộc sở hữu cá nhân (`userId`), chỉ tài khoản sở hữu mới có quyền đọc, sửa, xóa hoặc đổi trạng thái. Nếu gắn với lớp học (`classId`), người dùng phải là thành viên hợp lệ của lớp đó.
- **Thành phần**:
  - Backend: `services/core-api/src/models/Task.ts`, `services/core-api/src/services/task.service.ts`, `services/core-api/src/routes/task.routes.ts`.
  - OpenAPI / Scalar docs: Nhóm **Công việc cá nhân (LMS-28)** tại `/docs`.
  - Frontend Mobile: `apps/mobile/src/screens/TasksScreen.tsx`, `apps/mobile/src/screens/TaskModal.tsx`, `apps/mobile/src/lib/tasks-api.ts`.
  - Tab điều hướng: Tab **"Công việc"** trong thanh điều hướng chính của cả Student và Teacher.

---

## 2. Kiểm thử tự động (Automated Tests)

### 2.1. Test tích hợp Core API & Phân quyền
Kiểm thử toàn bộ các ràng buộc nghiệp vụ, phân lập dữ liệu giữa 2 tài khoản, validation và HTTP Express endpoints:
```powershell
npm run test:lms28 --prefix services/core-api
```
**Kết quả mong đợi**:
```text
=== BẮT ĐẦU TEST TÍCH HỢP & PERMISSIONS CHO LMS-28 (PERSONAL TASKS) ===
1. Kiểm tra Service boundaries:
   ✓ Tiêu đề rỗng bị từ chối (400)
   ✓ Tiêu đề dưới 2 ký tự bị từ chối (400)
   ✓ Ngày hạn không hợp lệ bị từ chối (400)
   ✓ Không phải thành viên lớp thì không được gắn classId vào Task (403)
   ✓ User A tạo Task thành công
   ✓ Phân lập dữ liệu: User B không thấy task của User A
   ✓ User A lấy đúng danh sách 2 task của mình
   ✓ User B bị chặn xem chi tiết task của User A (403)
   ✓ User B bị chặn sửa task của User A (403)
   ✓ User B bị chặn toggle task của User A (403)
   ✓ User B bị chặn xóa task của User A (403)
   ✓ User A cập nhật task thành công
   ✓ User A toggle hoàn thành task (todo -> completed)
   ✓ User A toggle lại task (completed -> todo)
   ✓ Lọc task theo classId và status chính xác

2. Kiểm tra HTTP Express Routes:
   ✓ GET /tasks không có token trả về 401
   ✓ GET /tasks có token trả về 200 kèm danh sách
   ✓ POST /tasks trả về 201 Created
   ✓ User B GET /tasks/:id của User A trả về 403 Forbidden
   ✓ PATCH /tasks/:id/toggle trả về 200 và chuyển trạng thái
   ✓ DELETE /tasks/:id trả về 200
   ✓ Bản ghi task đã được xóa hoàn toàn khỏi MongoDB
=== TẤT CẢ CÁC KIỂM THỬ LMS-28 ĐỀU ĐẠT (PASS) ===
```

### 2.2. Test Unit Mobile API Client
```powershell
npm run test:mobile
```
Kiểm thử kiểm tra normalizer dữ liệu, xử lý fallback và các lời gọi API của `tasks-api.ts`.

---

## 3. Kiểm thử qua giao diện Scalar Docs (Interactive Testing)
1. Khởi động Core API:
   ```powershell
   npm run dev:core
   ```
2. Mở trình duyệt truy cập: `http://127.0.0.1:4002/docs`.
3. Lấy token kiểm thử:
   - Cuộn đến mục **Authentication & Lấy Token** -> Bấm **POST /docs/tokens/student** -> Bấm **Test Request**.
   - Copy chuỗi `token` trong kết quả.
   - Nhấn nút **Authorize** ở góc trên giao diện Scalar -> dán token vào ô **BearerAuth** -> **Save**.
4. Kiểm thử các endpoint trong tag **Công việc cá nhân (LMS-28)**:
   - `POST /tasks`: Body:
     ```json
     {
       "title": "Ôn tập giữa kỳ React Native",
       "description": "Chương 1 đến chương 4",
       "priority": "high",
       "dueDate": "2026-10-20T17:00:00.000Z"
     }
     ```
     -> Nhận mã phản hồi `201 Created` kèm thông tin `task._id`.
   - `GET /tasks`:
     -> Nhận danh sách công việc (`200 OK`).
   - `PATCH /tasks/{id}/toggle`:
     -> Chuyển trạng thái `todo` thành `completed` (`200 OK`).
   - `DELETE /tasks/{id}`:
     -> Xóa công việc (`200 OK`).

---

## 4. Kịch bản kiểm thử thủ công trên Mobile (Manual Test Cases)

| Mã test | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Xem danh sách công việc | 1. Đăng nhập ứng dụng với tài khoản Student hoặc Teacher.<br>2. Bấm vào tab **"Công việc"** ở thanh điều hướng dưới (hoặc bấm QuickAction "Công việc" từ trang chủ). | Màn hình hiển thị danh sách task. Có card thống kê tiến độ, thanh lọc trạng thái (Tất cả, Chưa xong, Đã xong, Quá hạn), hàng lọc mức ưu tiên và lọc lớp học. |
| **TASK-02** | Tạo công việc mới & Gắn lớp học | 1. Bấm nút nổi **FAB (+)** "Thêm việc" góc dưới.<br>2. Nhập tiêu đề "Làm slide báo cáo LMS-28".<br>3. Chọn mức ưu tiên: Cao (High).<br>4. Chọn hạn nộp: Ngày mai.<br>5. Chọn một lớp học trong danh sách "Lớp học liên kết" (hoặc "Không liên kết").<br>6. Bấm "Tạo công việc". | Modal đóng lại. Task mới xuất hiện trên danh sách với badge đỏ "Ưu tiên Cao", badge lớp học và thời hạn ngày mai. |
| **TASK-03** | Đánh dấu hoàn thành | 1. Bấm vào nút tròn checkbox bên cạnh task vừa tạo. | Có rung phản hồi (haptic). Checkbox chuyển thành dấu tick xanh. Tiêu đề task được gạch ngang. |
| **TASK-04** | Lọc danh sách đa tiêu chí | 1. Bấm chọn tab "Chưa xong" hoặc "Đã xong".<br>2. Bấm chọn chip lọc mức độ ưu tiên: "Cao".<br>3. Bấm chọn chip lọc theo một Lớp học cụ thể.<br>4. Bấm "Đặt lại" để xóa bộ lọc nhanh. | Danh sách lọc tức thì theo giao của cả 3 tiêu chí: Trạng thái & Quá hạn, Mức ưu tiên và Lớp học. Khi bấm Đặt lại, danh sách phục hồi về trạng thái ban đầu. |
| **TASK-05** | Chỉnh sửa công việc | 1. Bấm vào thẻ task hoặc icon cây bút chỉnh sửa.<br>2. Modal hiện thông tin cũ, cho phép sửa tiêu đề, mô tả, mức ưu tiên, hạn chót và đổi lớp liên kết.<br>3. Bấm "Cập nhật". | Dữ liệu task được cập nhật thành công và hiển thị ngay trên UI. |
| **TASK-06** | Xóa công việc | 1. Bấm vào biểu tượng thùng rác ở bên phải task.<br>2. Hộp thoại xác nhận hiện lên -> Bấm "Xóa". | Task biến mất khỏi danh sách ngay lập tức và được xóa hoàn toàn khỏi cơ sở dữ liệu. |
| **TASK-07** | Hoạt động khi mất kết nối mạng | 1. Mở danh sách công việc.<br>2. Bật chế độ máy bay (Airplane mode) trên thiết bị.<br>3. Tắt app và mở lại vào tab "Công việc". | Dữ liệu công việc vẫn hiển thị đầy đủ từ offline cache mà không gây crash app. Khi thực hiện thao tác thay đổi (tạo/sửa/xóa) sẽ thông báo lỗi mạng an toàn, không giả lập thành công sai lệch. |
