# Hướng dẫn Kiểm thử API bằng Postman — MMA301 LMS Classroom

Thư mục này cung cấp bộ sưu tập (Collection) và biến môi trường (Environment) cho Postman để kiểm thử toàn bộ API Backend của dự án.

---

## 🚀 Cách 1: Sử dụng trực tiếp trên Postman Cloud (Khuyên dùng)

Bộ Collection & Environment đã được tự động đẩy trực tiếp lên tài khoản Postman của bạn (**Nguyen Anh Tu's Workspace**):

- **Collection:** `MMA301 - LMS Classroom API`
- **Environment:** `MMA301 - LMS Local`

### Các bước thực hiện:
1. Mở ứng dụng **Postman Desktop** hoặc [Postman Web](https://web.postman.co/).
2. Chọn Workspace **Nguyen Anh Tu's Workspace**.
3. Tại góc trên cùng bên phải, chọn môi trường: **`MMA301 - LMS Local`**.
4. Bắt đầu chạy test theo thứ tự dưới đây.

---

## 📥 Cách 2: Import thủ công file JSON

Nếu muốn import thủ công hoặc chia sẻ cho các thành viên khác trong nhóm (Lộc, Kiên, Hưng, Huy):

1. Mở Postman -> Chọn **Import** (ở thanh công cụ trên cùng).
2. Kéo thả 2 file sau vào Postman:
   - `postman/MMA301_LMS.postman_collection.json`
   - `postman/MMA301_LMS.postman_environment.json`
3. Ở góc trên cùng bên phải, chọn môi trường: **`MMA301 - LMS Local`**.

---

## 🔄 Luồng kiểm thử tự động (Auto-save Tokens & IDs)

Các API được thiết kế kèm **Test Script tự động lưu biến môi trường**, bạn không cần phải copy-paste token hay ID thủ công:

| Bước | Endpoint | Mục đích | Tự động hóa |
|:---|:---|:---|:---|
| **1** | `01. Auth / Login Teacher` | Đăng nhập tài khoản Giáo viên | Tự động lưu `teacher_token` |
| **2** | `03. Class / 1. Create Class` | Giáo viên tạo lớp học mới | Tự động lưu `class_id` và `class_code` |
| **3** | `01. Auth / Login Student` | Đăng nhập tài khoản Sinh viên | Tự động lưu `student_token` |
| **4** | `03. Class / 3. Join Class` | Sinh viên tham gia lớp học bằng `{{class_code}}` | Tự động truyền mã mời đã lưu ở bước 2 |
| **5** | `03. Class / 4. Get Enrolled` | Sinh viên xem danh sách lớp đã tham gia | Xác nhận đã join lớp thành công |
| **6** | `03. Class / 5. Get Details` | Xem chi tiết lớp học (`{{class_id}}`) | Kiểm tra membership & roleInClass |
| **7** | `03. Class / 6. Get Members` | Xem danh sách thành viên trong lớp | Trả về Teacher + Student vừa tham gia |
| **8** | `03. Class / 7. Update Class` | Giáo viên đổi tên lớp học | Kiểm tra quyền Teacher Owner |
| **9** | `03. Class / 8. Delete Class` | Giáo viên xóa lớp học | Tự động xóa lớp và dọn dẹp ClassMember |

---

## ⚙️ Thiết lập môi trường mặc định (`MMA301 - LMS Local`)

- `auth_url`: `http://localhost:4001`
- `core_url`: `http://localhost:4002`
- `teacher_email`: `teacher@lms.local`
- `teacher_password`: `Demo123!`
- `student_email`: `student@lms.local`
- `student_password`: `Demo123!`
