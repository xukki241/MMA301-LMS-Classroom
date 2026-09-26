import { exercisePaths, exerciseSchemas } from "./exercise.openapi.js";
import { submissionPaths, submissionSchemas } from "./submission.openapi.js";
import { materialPaths, materialSchemas } from "./material.openapi.js";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MMA301 LMS Classroom - Core API (Nguyễn Anh Tú)",
    version: "1.0.0",
    description: `## Tài liệu API Phân hệ Quản lý Lớp học (Task LMS-05)

Phụ trách: Nguyễn Anh Tú  
Email: dambautv2005@gmail.com

---

### Hướng dẫn lấy Token và Test trực tiếp trên Scalar

Để test các API bên dưới, bạn cần JWT Bearer Token tương ứng với vai trò (Teacher hoặc Student):

1. **Cách lấy Token 1-Click (Tiện lợi nhất):**
   - Vào nhóm API **Authentication & Lấy Token** ngay bên dưới.
   - Chọn endpoint **POST /docs/tokens/teacher** (dành cho Giáo viên) hoặc **POST /docs/tokens/student** (dành cho Học sinh).
   - Nhấn nút **Test Request** (hoặc **Send**).
   - Copy toàn bộ chuỗi trong trường \`token\` của kết quả trả về.

2. **Cách kích hoạt Token trên giao diện:**
   - Nhấn nút **Authorize** ở góc trên giao diện Scalar.
   - Dán token vừa copy vào ô giá trị của **BearerAuth**.
   - Nhấn **Save** / **Close**.
   - Từ lúc này, mọi request gửi từ trình duyệt sẽ tự động kèm header \`Authorization: Bearer <token>\`.

3. **Cách đăng nhập qua Auth Service thủ công:**
   - Sử dụng endpoint **POST /auth/login** với body:
     - Giáo viên: \`{"email": "teacher@lms.local", "password": "Demo123!"}\`
     - Sinh viên: \`{"email": "student@lms.local", "password": "Demo123!"}\`

---

### Tổng hợp các Quy tắc Nghiệp vụ và Validate

1. **Phân quyền theo Role:**
   - Giáo viên (\`role: teacher\`): Được tạo lớp, xem danh sách lớp đang dạy, cập nhật tên lớp do mình tạo, xóa lớp do mình tạo.
   - Sinh viên (\`role: student\`): Được xem danh sách lớp đã tham gia, tham gia lớp mới bằng mã code 6 ký tự.
   - Thành viên trong lớp (\`roleInClass: teacher | student\`): Được xem thông tin chi tiết lớp và danh sách thành viên của lớp đó.

2. **Quy tắc Validate Input:**
   - \`name\` (Tên lớp): Kiểu chuỗi, độ dài từ 1 đến 100 ký tự, không được để trống hoặc chỉ chứa khoảng trắng. Trả về lỗi 422 nếu không hợp lệ.
   - \`code\` (Mã lớp): Chuỗi đúng 6 ký tự gồm chữ in hoa và số (A-Z, 0-9). Trả về lỗi 422 nếu khác 6 ký tự.
   - \`id\` (ID lớp): Định dạng MongoDB ObjectId hợp lệ (chuỗi 24 ký tự hex). Trả về lỗi 400 nếu sai định dạng.

3. **Đặc thù Nghiệp vụ quan trọng:**
   - **Sinh mã ngẫu nhiên duy nhất:** Khi tạo lớp, hệ thống tự sinh mã 6 ký tự không trùng lặp. Nếu trùng sẽ tự thử lại tối đa 5 lần.
   - **Tự động ghi nhận chủ lớp:** Khi giáo viên tạo lớp, hệ thống tự động thêm giáo viên đó vào bảng \`ClassMember\` với vai trò \`roleInClass: teacher\`.
   - **Kiểm tra trùng lặp khi Join:** Sinh viên đã tham gia lớp rồi thì không thể join lại lần nữa (trả về lỗi 403 ALREADY_JOINED).
   - **Kiểm tra Quyền sở hữu (Ownership):** Chỉ giáo viên đã tạo ra lớp học (\`cls.teacherId === user.id\`) mới có quyền sửa tên hoặc xóa lớp. Giáo viên khác không có quyền (trả về lỗi 403 FORBIDDEN).
   - **Xóa theo dây chuyền (Cascade Delete):** Khi xóa lớp học, hệ thống tự động xóa toàn bộ các bản ghi thành viên liên quan trong \`ClassMember\` để tránh rác dữ liệu.`,
  },
  servers: [
    {
      url: "http://localhost:4002",
      description: "Core API (Cổng 4002)",
    },
    {
      url: "http://localhost:4001",
      description: "Auth Service (Cổng 4001)",
    },
  ],
  tags: [
    {
      name: "Material (LMS-14)",
      description: "Quản lý và chia sẻ tài liệu bài giảng theo lớp",
    },
    { name: "Bài tập (LMS-08)", description: "Tạo và danh sách bài tập theo lớp — Nguyễn Quốc Hưng." },
    {
      name: "Submission & Grade (LMS-09)",
      description: "Nộp bài và chấm điểm bài tập — Nguyễn Quốc Hưng.",
    },
    {
      name: "Authentication & Lấy Token",
      description: "Các endpoint hỗ trợ lấy JWT Token nhanh để kiểm thử",
    },
    {
      name: "Quản lý Lớp học (LMS-05)",
      description: "Các API nghiệp vụ quản lý lớp học do Nguyễn Anh Tú xây dựng",
    },
    {
      name: "Bảng tin & Tương tác (LMS-06)",
      description: "Các API Bảng tin (Post, Comment, Reaction) do Nguyễn Anh Tú xây dựng",
    },
    {
      name: "Hệ thống & Thông tin cá nhân",
      description: "Kiểm tra sức khỏe Core API và thông tin người dùng từ JWT",
    },
  ],
  security: [
    {
      BearerAuth: [],
    },
    {
      HeaderAuth: [],
    },
  ],
  paths: {
    ...submissionPaths,
    ...exercisePaths,
    ...materialPaths,
    "/docs/tokens/teacher": {
      post: {
        tags: ["Authentication & Lấy Token"],
        summary: "Lấy Token Giáo viên 1-Click (Demo Teacher)",
        description: `Endpoint tiện ích phục vụ việc test API.
Trả về JWT Token của tài khoản Giáo viên (\`teacher@lms.local\`).
Nếu Auth Service (:4001) đang bật, hệ thống sẽ lấy token chuẩn từ Auth Service. Nếu chưa bật, hệ thống sẽ tự ký token hợp lệ bằng JWT_SECRET.

Cách dùng: Nhấn **Test Request**, sau đó copy giá trị \`token\` và dán vào nút **Authorize** trên giao diện Scalar.`,
        responses: {
          "200": {
            description: "Lấy token thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", example: "teacher" },
                    email: { type: "string", example: "teacher@lms.local" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    huongDanSuDung: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/docs/tokens/student": {
      post: {
        tags: ["Authentication & Lấy Token"],
        summary: "Lấy Token Sinh viên 1-Click (Demo Student)",
        description: `Endpoint tiện ích phục vụ việc test API.
Trả về JWT Token của tài khoản Sinh viên (\`student@lms.local\`).

Cách dùng: Nhấn **Test Request**, sau đó copy giá trị \`token\` và dán vào nút **Authorize** trên giao diện Scalar để kiểm thử các tính năng Sinh viên (tham gia lớp, xem lớp đã tham gia).`,
        responses: {
          "200": {
            description: "Lấy token thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", example: "student" },
                    email: { type: "string", example: "student@lms.local" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    huongDanSuDung: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        servers: [
          {
            url: "http://localhost:4001",
            description: "Auth Service (Cổng 4001)",
          },
          {
            url: "http://localhost:4002",
            description: "Core API Proxy (Cổng 4002)",
          },
        ],
        tags: ["Authentication & Lấy Token"],
        summary: "Đăng nhập tài khoản qua Auth Service",
        description: `Gọi trực tiếp đến Auth Service để xác thực email và password.
Trả về JWT token và thông tin tài khoản.

Tài khoản seed mặc định:
- Giáo viên: \`teacher@lms.local\` / \`Demo123!\`
- Sinh viên: \`student@lms.local\` / \`Demo123!\``,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "teacher@lms.local" },
                  password: { type: "string", example: "Demo123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Đăng nhập thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
                        email: { type: "string", example: "teacher@lms.local" },
                        displayName: { type: "string", example: "Demo Teacher" },
                        role: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Sai email hoặc mật khẩu",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/classes": {
      post: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "1. Tạo lớp học mới (Chỉ Giáo viên)",
        description: `Tạo một lớp học mới trong hệ thống.

**Yêu cầu Quyền:**
- Bắt buộc token có \`role: teacher\`. Nếu là \`student\` sẽ bị chặn với mã lỗi **403 FORBIDDEN**.

**Quy tắc Validate Body:**
- \`name\`: Bắt buộc, kiểu chuỗi từ 1 đến 100 ký tự. Nếu để trống hoặc vượt quá 100 ký tự sẽ trả về **422 VALIDATION_ERROR**.

**Đặc thù Nghiệp vụ:**
- Hệ thống tự động sinh một mã mời gồm 6 ký tự in hoa (chữ và số) duy nhất.
- Tự động tạo bản ghi \`ClassMember\` cho chính giáo viên tạo lớp với \`roleInClass: "teacher"\`.
- Lưu \`teacherId\` của giáo viên vào lớp để kiểm tra quyền sở hữu (Ownership) khi sửa/xóa.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example: "Lập trình Di động MMA301",
                    description: "Tên lớp học (1 - 100 ký tự)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tạo lớp học thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tạo lớp học thành công" },
                    class: { $ref: "#/components/schemas/Class" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/teaching": {
      get: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "2. Danh sách lớp đang dạy (Chỉ Giáo viên)",
        description: `Lấy toàn bộ danh sách lớp học do chính giáo viên đang đăng nhập tạo ra.

**Yêu cầu Quyền:**
- Bắt buộc token có \`role: teacher\`. Nếu là \`student\` sẽ trả về **403 FORBIDDEN**.

**Đặc thù Nghiệp vụ:**
- Lọc trong cơ sở dữ liệu theo điều kiện \`teacherId === user.id\`.
- Kết quả được sắp xếp theo thời gian tạo mới nhất lên đầu.`,
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách lớp đang dạy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Class" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
        },
      },
    },
    "/classes/enrolled": {
      get: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "3. Danh sách lớp đã tham gia (Chỉ Sinh viên)",
        description: `Lấy toàn bộ danh sách các lớp học mà sinh viên đang đăng nhập đã tham gia.

**Yêu cầu Quyền:**
- Bắt buộc token có \`role: student\`. Nếu là \`teacher\` sẽ trả về **403 FORBIDDEN**.

**Đặc thù Nghiệp vụ:**
- Tra cứu trong bảng \`ClassMember\` với \`userId === user.id\` và \`roleInClass: "student"\`.
- Sau đó lấy đầy đủ thông tin chi tiết của từng lớp học tương ứng.`,
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách lớp học đã tham gia",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Class" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenStudentOnly" },
        },
      },
    },
    "/classes/join": {
      post: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "4. Tham gia lớp bằng mã mời (Chỉ Sinh viên)",
        description: `Sinh viên nhập mã code 6 ký tự để tham gia vào lớp học.

**Yêu cầu Quyền:**
- Bắt buộc token có \`role: student\`. Nếu là \`teacher\` sẽ trả về **403 FORBIDDEN**.

**Quy tắc Validate Body:**
- \`code\`: Bắt buộc, kiểu chuỗi đúng 6 ký tự. Hệ thống tự động chuyển thành chữ in hoa (uppercase). Sai định dạng trả về **422 VALIDATION_ERROR**.

**Đặc thù Nghiệp vụ:**
- Kiểm tra mã lớp có tồn tại hay không. Nếu không tồn tại trả về **404 CLASS_NOT_FOUND**.
- Kiểm tra xem sinh viên đã là thành viên của lớp này chưa. Nếu đã tham gia rồi sẽ trả về **403 ALREADY_JOINED**.
- Khi hợp lệ, hệ thống thêm bản ghi vào \`ClassMember\` với \`roleInClass: "student"\`.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: {
                  code: {
                    type: "string",
                    minLength: 6,
                    maxLength: 6,
                    example: "A8K92Z",
                    description: "Mã mời 6 ký tự in hoa (ví dụ: A8K92Z)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tham gia lớp học thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tham gia lớp học thành công" },
                    class: { $ref: "#/components/schemas/Class" },
                    membership: { $ref: "#/components/schemas/ClassMember" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": {
            description: "Đã là thành viên của lớp hoặc người gọi không phải là Sinh viên",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Không tìm thấy lớp học với mã code đã nhập",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/{id}": {
      get: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "5. Xem chi tiết lớp học (Thành viên trong lớp)",
        description: `Xem thông tin chi tiết của một lớp học.

**Yêu cầu Quyền:**
- Người gọi (Teacher hoặc Student) bắt buộc phải là thành viên đã tham gia lớp học này.
- Nếu người dùng chưa tham gia lớp sẽ trả về mã lỗi **403 FORBIDDEN** (\`Bạn không phải là thành viên của lớp học này\`).

**Quy tắc Validate Param:**
- \`id\`: Bắt buộc là MongoDB ObjectId hợp lệ (chuỗi 24 ký tự hex). Nếu truyền chuỗi bất kỳ không hợp lệ sẽ trả về **400 INVALID_ID**.

**Đặc thù Nghiệp vụ:**
- Kiểm tra sự tồn tại của lớp trong database (nếu bị xóa trả về **404 CLASS_NOT_FOUND**).
- Phản hồi trả về bao gồm thông tin lớp và trường \`roleInClass\` ('teacher' hoặc 'student') để phía Frontend biết người dùng đang là giáo viên hay học sinh trong lớp đó.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của lớp học (24 ký tự hex)",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Thông tin chi tiết lớp học",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    class: { $ref: "#/components/schemas/Class" },
                    roleInClass: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "7. Cập nhật tên lớp (Chỉ Giáo viên tạo lớp)",
        description: `Thay đổi tên của một lớp học.

**Yêu cầu Quyền & Kiểm tra Sở hữu (Ownership Check):**
- Người gọi bắt buộc phải là Giáo viên (\`role: teacher\`).
- **QUAN TRỌNG:** Giáo viên đó phải là người trực tiếp tạo ra lớp học này (\`cls.teacherId === user.id\`). Giáo viên khác trong hệ thống không được phép sửa lớp của người khác (trả về **403 FORBIDDEN**).

**Quy tắc Validate:**
- \`id\`: MongoDB ObjectId hợp lệ. Nếu sai trả về **400 INVALID_ID**.
- \`name\` (Body): Chuỗi từ 1 đến 100 ký tự. Nếu để trống trả về **422 VALIDATION_ERROR**.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của lớp học",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example: "Lập trình Di động MMA301 - Học kỳ 2",
                    description: "Tên mới của lớp học",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Cập nhật lớp học thành công" },
                    class: { $ref: "#/components/schemas/Class" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "8. Xóa lớp học (Chỉ Giáo viên tạo lớp)",
        description: `Xóa hoàn toàn một lớp học khỏi hệ thống.

**Yêu cầu Quyền & Kiểm tra Sở hữu (Ownership Check):**
- Bắt buộc là Giáo viên tạo lớp (\`teacherId === user.id\`).
- Nếu giáo viên khác hoặc sinh viên gọi sẽ bị từ chối với mã lỗi **403 FORBIDDEN**.

**Quy tắc Validate Param:**
- \`id\`: MongoDB ObjectId hợp lệ. Sai định dạng trả về **400 INVALID_ID**.

**Đặc thù Nghiệp vụ (Cascade Delete):**
- Hệ thống sẽ xóa bản ghi trong bảng \`Class\`.
- Đồng thời tự động xóa toàn bộ các bản ghi thành viên liên quan trong bảng \`ClassMember\` (Cascade Delete) để không để lại dữ liệu rác.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của lớp học",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Xóa lớp học thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Xóa lớp học thành công" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/classes/{id}/members": {
      get: {
        tags: ["Quản lý Lớp học (LMS-05)"],
        summary: "6. Danh sách thành viên trong lớp (Thành viên trong lớp)",
        description: `Lấy toàn bộ danh sách thành viên (bao gồm cả Giáo viên và Sinh viên) của lớp học đó.

**Yêu cầu Quyền:**
- Người gọi bắt buộc phải là thành viên thuộc lớp học đó (\`ClassMember\`). Nếu chưa tham gia sẽ trả về **403 FORBIDDEN**.

**Quy tắc Validate Param:**
- \`id\`: MongoDB ObjectId hợp lệ (24 ký tự hex). Sai định dạng trả về **400 INVALID_ID**.

**Đặc thù Nghiệp vụ:**
- Danh sách thành viên được sắp xếp theo thời gian tham gia từ trước đến sau (\`createdAt: 1\`).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của lớp học",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Danh sách thành viên trong lớp",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ClassMember" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Hệ thống & Thông tin cá nhân"],
        summary: "Kiểm tra trạng thái sống Core API",
        description: "Kiểm tra trạng thái hoạt động của Core API và kết nối cơ sở dữ liệu MongoDB.",
        responses: {
          "200": {
            description: "Hệ thống hoạt động bình thường",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "core-api" },
                    mongo: { type: "string", example: "connected" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Hệ thống & Thông tin cá nhân"],
        summary: "Xem thông tin người dùng từ Token",
        description: "Giải mã token hiện tại và trả về thông tin sub (User ID), email, role.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Thông tin payload người dùng",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
                        email: { type: "string", example: "teacher@lms.local" },
                        role: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/classes/{classId}/posts": {
      get: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Lấy danh sách bài đăng trong lớp (Hỗ trợ realtime polling)",
        description: `Thành viên lớp (Giáo viên hoặc Sinh viên) xem danh sách các bài đăng trong lớp học.
Hỗ trợ tham số query \`updatedAfter\` (định dạng ISO) để mobile client thực hiện long-polling lấy các bài đăng được tạo hoặc sửa đổi sau mốc thời gian này.`,
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token xác thực dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            description: "ID lớp học (MongoDB ObjectId)",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "updatedAfter",
            in: "query",
            required: false,
            description: "Thời điểm ISO để lọc các bài đăng mới hơn (Realtime Long Polling)",
            schema: { type: "string", format: "date-time", example: "2026-09-16T10:00:00.000Z" },
          },
        ],
        responses: {
          "200": {
            description: "Lấy danh sách bài đăng thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    posts: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Post" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Giáo viên đăng bài trong lớp",
        description: "Chỉ Giáo viên sở hữu hoặc giảng dạy trong lớp mới có quyền tạo bài đăng mới trên bảng tin.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token Giáo viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            description: "ID lớp học (MongoDB ObjectId)",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    example: "Chào mừng các bạn đến với học phần MMA301! Lớp học sẽ diễn ra vào sáng thứ 4 hàng tuần.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đăng bài thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tạo bài đăng thành công" },
                    post: { $ref: "#/components/schemas/Post" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/{classId}/posts/{postId}": {
      patch: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Chỉnh sửa bài đăng (Chỉ tác giả)",
        description: "Chỉ người tạo bài đăng (tác giả) mới có quyền chỉnh sửa nội dung bài đăng.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token Tác giả dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", example: "Nội dung bài đăng đã được cập nhật." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật bài đăng thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Cập nhật bài đăng thành công" },
                    post: { $ref: "#/components/schemas/Post" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Xóa bài đăng (Tác giả hoặc Giáo viên lớp)",
        description: "Tác giả của bài đăng hoặc Giáo viên trong lớp có quyền xóa bài đăng (Soft delete: đánh dấu isDeleted=true).",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token Tác giả hoặc Giáo viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        responses: {
          "200": {
            description: "Xóa bài đăng thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Xóa bài đăng thành công" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/classes/{classId}/posts/{postId}/comments": {
      get: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Lấy danh sách bình luận của bài đăng",
        description: "Thành viên trong lớp có thể xem danh sách tất cả các bình luận của bài đăng theo thứ tự thời gian tăng dần.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token xác thực dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        responses: {
          "200": {
            description: "Lấy danh sách bình luận thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    comments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Comment" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Thêm bình luận vào bài đăng",
        description: "Mọi thành viên trong lớp (cả Giáo viên và Sinh viên) đều có thể gửi bình luận vào bài đăng.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token thành viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", example: "Em đã nhận thông báo rồi ạ!" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tạo bình luận thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tạo bình luận thành công" },
                    comment: { $ref: "#/components/schemas/Comment" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/{classId}/posts/{postId}/comments/{commentId}": {
      patch: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Chỉnh sửa bình luận (Chỉ tác giả)",
        description: "Chỉ người viết bình luận mới có quyền sửa đổi nội dung bình luận.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token Tác giả dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
          {
            name: "commentId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a48888" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", example: "Bình luận đã được sửa." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật bình luận thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Cập nhật bình luận thành công" },
                    comment: { $ref: "#/components/schemas/Comment" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Xóa bình luận (Tác giả hoặc Giáo viên lớp)",
        description: "Tác giả của bình luận hoặc Giáo viên của lớp có quyền xóa bình luận (Soft delete).",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token Tác giả hoặc Giáo viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
          {
            name: "commentId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a48888" },
          },
        ],
        responses: {
          "200": {
            description: "Xóa bình luận thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Xóa bình luận thành công" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/classes/{classId}/posts/{postId}/reactions": {
      get: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Lấy thống kê biểu cảm của bài đăng",
        description: "Xem tổng số lượng biểu cảm, chi tiết từng loại biểu cảm (summary count) và biểu cảm hiện tại của người dùng gọi API.",
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token thành viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        responses: {
          "200": {
            description: "Lấy thống kê biểu cảm thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    postId: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
                    total: { type: "integer", example: 5 },
                    summary: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          emoji: { type: "string", example: "👍" },
                          count: { type: "integer", example: 4 },
                        },
                      },
                    },
                    userReaction: { type: "string", nullable: true, example: "👍" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Bảng tin & Tương tác (LMS-06)"],
        summary: "Thả / Đổi / Hủy biểu cảm trên bài đăng",
        description: `Thành viên lớp tương tác biểu cảm:
- Nếu chưa có biểu cảm: Thêm biểu cảm mới (action: "added", 201 Created).
- Nếu đã có và bấm biểu cảm khác: Đổi sang biểu cảm mới (action: "changed", 200 OK).
- Nếu bấm lại chính biểu cảm đang chọn: Hủy biểu cảm (action: "removed", 200 OK).`,
        security: [{ BearerAuth: [] }, { HeaderAuth: [] }],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Token thành viên dạng 'Bearer <token>'. Dán token vào đây nếu muốn điền trực tiếp trong Headers.",
            schema: { type: "string", example: "Bearer eyJhbGciOi..." },
          },
          {
            name: "classId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["emoji"],
                properties: {
                  emoji: { type: "string", example: "👍", description: "Icon emoji (ví dụ: 👍, ❤️, 😂, 🎉)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Đổi hoặc hủy biểu cảm thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["changed", "removed"] },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "201": {
            description: "Thêm biểu cảm thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action: { type: "string", example: "added" },
                    message: { type: "string", example: "Đã thêm biểu cảm" },
                    reaction: { $ref: "#/components/schemas/Reaction" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Dán JWT Token vào đây (Scalar sẽ tự thêm tiền tố 'Bearer '). Lấy token từ POST /docs/tokens/teacher hoặc POST /docs/tokens/student.",
      },
      HeaderAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Dán trực tiếp 'Bearer <token>' vào đây nếu muốn điền thủ công qua Header Authorization.",
      },
    },
    schemas: {
      ...submissionSchemas,
      ...exerciseSchemas,
      ...materialSchemas,
      Class: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a45678", description: "MongoDB ObjectId" },
          name: { type: "string", example: "Lập trình Di động MMA301", description: "Tên lớp học" },
          code: { type: "string", example: "A8K92Z", description: "Mã mời 6 ký tự in hoa duy nhất" },
          teacherId: { type: "string", example: "66e6b4f73a1b5c0012a40001", description: "ID giáo viên sở hữu" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ClassMember: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a49999" },
          classId: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          userId: { type: "string", example: "66e6b4f73a1b5c0012a40002" },
          roleInClass: { type: "string", enum: ["teacher", "student"], example: "student" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Post: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a47777", description: "MongoDB ObjectId" },
          classId: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          authorId: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
          content: { type: "string", example: "Thông báo kiểm tra tiến độ môn MMA301 tuần này" },
          isDeleted: { type: "boolean", example: false },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a48888" },
          postId: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          authorId: { type: "string", example: "66e6b4f73a1b5c0012a40002" },
          content: { type: "string", example: "Thưa thầy, nhóm em đã hoàn thành bảng tin ạ!" },
          isDeleted: { type: "boolean", example: false },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Reaction: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a49999" },
          postId: { type: "string", example: "66e6b4f73a1b5c0012a47777" },
          userId: { type: "string", example: "66e6b4f73a1b5c0012a40002" },
          emoji: { type: "string", example: "👍" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error", "code"],
        properties: {
          error: { type: "string", example: "Chỉ giáo viên mới có thể tạo lớp học" },
          code: { type: "string", example: "FORBIDDEN" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "401 UNAUTHENTICATED / INVALID_TOKEN: Chưa truyền token hoặc token không hợp lệ / hết hạn",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenTeacherOnly: {
        description: "403 FORBIDDEN: Chỉ giáo viên mới có quyền thực hiện thao tác này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenStudentOnly: {
        description: "403 FORBIDDEN: Chỉ học sinh mới có quyền thực hiện thao tác này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenOwnerOnly: {
        description: "403 FORBIDDEN: Chỉ giáo viên tạo ra lớp học này mới có quyền cập nhật hoặc xóa",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenNotMember: {
        description: "403 FORBIDDEN: Bạn không phải là thành viên của lớp học này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "404 NOT_FOUND: Không tìm thấy bản ghi tương ứng trong cơ sở dữ liệu",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InvalidId: {
        description: "400 INVALID_ID: Định dạng ID không phải là MongoDB ObjectId hợp lệ (24 ký tự hex)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "422 VALIDATION_ERROR: Dữ liệu truyền vào body không thỏa mãn điều kiện kiểm tra Zod",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};
