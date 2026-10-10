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
| **TASK-01** | Xem danh sách công việc | 1. Đăng nhập ứng dụng với tài khoản Student hoặc Teacher.<br>2. Bấm vào tab **"Công việc"** ở thanh điều hướng dưới. | Màn hình hiển thị danh sách task. Có thanh SegmentedButtons lọc (Tất cả, Chưa xong, Đã xong, Quá hạn). |
| **TASK-02** | Tạo công việc mới | 1. Bấm nút nổi **FAB (+)** "Thêm việc" góc dưới.<br>2. Nhập tiêu đề "Làm slide báo cáo LMS-28".<br>3. Chọn mức ưu tiên: Cao (High).<br>4. Chọn hạn nộp: Ngày mai.<br>5. Bấm "Lưu". | Modal đóng lại. Task mới xuất hiện trên danh sách với badge đỏ "Ưu tiên Cao" và thời hạn ngày mai. |
| **TASK-03** | Đánh dấu hoàn thành | 1. Bấm vào nút tròn checkbox bên cạnh task vừa tạo. | Có rung phản hồi (haptic). Checkbox chuyển thành dấu tick xanh `checkmark-circle`. Tiêu đề task được gạch ngang. |
| **TASK-04** | Lọc danh sách công việc | 1. Bấm chọn tab "Đã xong".<br>2. Bấm chọn tab "Chưa xong". | Tab "Đã xong" chỉ hiện các việc có tick xanh. Tab "Chưa xong" chỉ hiện các việc chưa hoàn thành. |
| **TASK-05** | Xóa công việc | 1. Bấm vào biểu tượng thùng rác ở bên phải task.<br>2. Hộp thoại xác nhận hiện lên -> Bấm "Xóa". | Task biến mất khỏi danh sách ngay lập tức. |
| **TASK-06** | Hoạt động khi mất kết nối mạng | 1. Mở danh sách công việc.<br>2. Bật chế độ máy bay (Airplane mode) trên thiết bị.<br>3. Tắt app và mở lại vào tab "Công việc". | Dữ liệu công việc vẫn hiển thị đầy đủ từ offline cache mà không gây crash app. |
