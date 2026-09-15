export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MMA301 LMS Classroom — Core API (Nguyễn Anh Tú)",
    version: "1.0.0",
    description: `### 📚 Phân hệ Core API Quản lý Lớp học (Task LMS-05)
Phụ trách: **Nguyễn Anh Tú**  
Email: [dambautv2005@gmail.com](mailto:dambautv2005@gmail.com)

Hệ thống cung cấp toàn bộ RESTful API cho nghiệp vụ quản lý lớp học trong dự án MMA301 LMS Classroom:
- **Giáo viên (Teacher)**: Tạo lớp, cấp mã tham gia 6 ký tự ngẫu nhiên, xem danh sách lớp đang dạy, cập nhật thông tin và xóa lớp.
- **Học sinh (Student)**: Tham gia lớp học qua mã mời (Code), xem danh sách các lớp đã tham gia.
- **Thành viên (Teacher / Student)**: Xem chi tiết lớp và danh sách thành viên trong lớp.

---
### 🔐 Hướng dẫn xác thực
API sử dụng JWT Bearer Token. Để test API trên giao diện này:
1. Đăng nhập tại Auth Service (\`POST http://localhost:4001/auth/login\`) với tài khoản demo:
   - **Teacher**: \`teacher@lms.local\` / \`Demo123!\`
   - **Student**: \`student@lms.local\` / \`Demo123!\`
2. Nhấn nút **Authorize** (hoặc điền token) với cú pháp: \`Bearer <your_token>\`.`,
  },
  servers: [
    {
      url: "http://localhost:4002",
      description: "Local Core API Server",
    },
  ],
  tags: [
    {
      name: "Class Management (LMS-05)",
      description: "Nghiệp vụ quản lý lớp học do Nguyễn Anh Tú thực hiện",
    },
    {
      name: "System & Authentication",
      description: "Kiểm tra trạng thái hệ thống và xác thực thông tin tài khoản",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System & Authentication"],
        summary: "Kiểm tra trạng thái Core API",
        description: "Kiểm tra xem dịch vụ Core API và MongoDB có đang hoạt động bình thường hay không.",
        responses: {
          "200": {
            description: "Dịch vụ hoạt động tốt",
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
        tags: ["System & Authentication"],
        summary: "Lấy thông tin người dùng hiện tại",
        description: "Giải mã JWT Token và trả về thông tin người dùng đang đăng nhập (sub, email, role).",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Thông tin payload JWT",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
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
    "/classes": {
      post: {
        tags: ["Class Management (LMS-05)"],
        summary: "Tạo lớp học mới (Chỉ dành cho Giáo viên)",
        description: "Giáo viên tạo lớp học mới. Hệ thống sẽ tự động sinh mã code 6 ký tự (in hoa, chữ và số) duy nhất và tự động gán giáo viên vào làm thành viên lớp (`roleInClass: teacher`).",
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
                    description: "Tên lớp học",
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
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/teaching": {
      get: {
        tags: ["Class Management (LMS-05)"],
        summary: "Danh sách lớp đang giảng dạy (Chỉ Giáo viên)",
        description: "Lấy tất cả các lớp học do giáo viên hiện tại tạo và đứng lớp.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách lớp học",
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
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
        },
      },
    },
    "/classes/enrolled": {
      get: {
        tags: ["Class Management (LMS-05)"],
        summary: "Danh sách lớp đã tham gia (Chỉ Sinh viên)",
        description: "Lấy tất cả các lớp học mà sinh viên hiện tại đã tham gia.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách lớp đã tham gia",
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
          "403": { $ref: "#/components/responses/ForbiddenStudentOnly" },
        },
      },
    },
    "/classes/join": {
      post: {
        tags: ["Class Management (LMS-05)"],
        summary: "Tham gia lớp học bằng mã mời (Chỉ Sinh viên)",
        description: "Sinh viên nhập mã 6 ký tự của lớp học để tham gia vào lớp. Trả về thông tin lớp học và bản ghi thành viên mới tạo.",
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
                    description: "Mã mời 6 ký tự",
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
          "403": {
            description: "Bạn đã là thành viên hoặc tài khoản không phải là sinh viên",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Không tìm thấy lớp học có mã mời tương ứng",
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
        tags: ["Class Management (LMS-05)"],
        summary: "Xem thông tin chi tiết lớp học",
        description: "Xem chi tiết một lớp học. Người gọi bắt buộc phải là thành viên của lớp đó (Giáo viên hoặc Học sinh). Trả về vai trò của người gọi trong lớp (`roleInClass`).",
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
            description: "Chi tiết lớp học",
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
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Class Management (LMS-05)"],
        summary: "Cập nhật tên lớp học (Chỉ Giáo viên tạo lớp)",
        description: "Giáo viên chủ sở hữu cập nhật tên lớp học. Trả về thông tin lớp học sau khi cập nhật.",
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
                    example: "Lập trình Di động MMA301 - Lớp Mới",
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
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Class Management (LMS-05)"],
        summary: "Xóa lớp học (Chỉ Giáo viên tạo lớp)",
        description: "Giáo viên chủ sở hữu xóa lớp học. Hệ thống sẽ tự động dọn dẹp tất cả các bản ghi ClassMember liên quan đến lớp này.",
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
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/classes/{id}/members": {
      get: {
        tags: ["Class Management (LMS-05)"],
        summary: "Xem danh sách thành viên trong lớp",
        description: "Lấy danh sách tất cả thành viên (Giáo viên và Sinh viên) của lớp học. Yêu cầu người gọi phải là thành viên trong lớp.",
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
            description: "Danh sách thành viên",
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
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
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
        description: "Nhập JSON Web Token (JWT) được cấp từ endpoint `/auth/login` của Auth Service.",
      },
    },
    schemas: {
      Class: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          name: { type: "string", example: "Lập trình Di động MMA301" },
          code: { type: "string", example: "7A9XZ1", description: "Mã 6 ký tự duy nhất" },
          teacherId: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
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
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "FORBIDDEN" },
              message: { type: "string", example: "Chỉ giáo viên mới có quyền thực hiện thao tác này" },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Token không hợp lệ hoặc đã hết hạn",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenTeacherOnly: {
        description: "Chỉ giáo viên mới có quyền thực hiện thao tác này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenStudentOnly: {
        description: "Chỉ sinh viên mới có quyền thực hiện thao tác này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenOwnerOnly: {
        description: "Chỉ giáo viên tạo lớp mới có quyền thay đổi hoặc xóa lớp học này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenNotMember: {
        description: "Bạn không phải là thành viên của lớp học này",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Không tìm thấy dữ liệu yêu cầu",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InvalidId: {
        description: "Định dạng ID không hợp lệ",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Dữ liệu đầu vào không hợp lệ",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};
