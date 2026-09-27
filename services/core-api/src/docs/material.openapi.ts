const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const error = (description: string) => ({
  description,
  content: jsonSchema({ $ref: "#/components/schemas/MaterialError" }),
});

const commonErrors = {
  "401": error("Thiếu, sai hoặc hết hạn Bearer JWT (UNAUTHENTICATED / INVALID_TOKEN)."),
  "403": error("FORBIDDEN: Không có quyền truy cập hoặc không phải thành viên/chủ sở hữu lớp."),
  "404": error("CLASS_NOT_FOUND hoặc MATERIAL_NOT_FOUND: Không tìm thấy tài nguyên."),
};

export const materialSchemas = {
  CreateMaterial: {
    type: "object",
    additionalProperties: false,
    required: ["title", "url"],
    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 200,
        description: "Tiêu đề tài liệu; tối thiểu 2 ký tự.",
      },
      url: {
        type: "string",
        format: "uri",
        description: "Đường dẫn tài liệu hợp lệ bắt đầu bằng http:// hoặc https://",
      },
      description: {
        type: "string",
        maxLength: 1000,
        default: "",
        description: "Mô tả thêm về tài liệu.",
      },
    },
    example: {
      title: "Slide Bài giảng Buổi 1",
      url: "https://docs.google.com/presentation/d/demo",
      description: "Tài liệu kiến trúc mobile",
    },
  },
  Material: {
    type: "object",
    required: ["_id", "classId", "title", "url", "createdBy", "createdAt", "updatedAt"],
    properties: {
      _id: { type: "string", description: "MongoDB ObjectId" },
      classId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      url: { type: "string" },
      createdBy: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      __v: { type: "integer" },
    },
  },
  MaterialError: {
    type: "object",
    required: ["error", "code"],
    properties: {
      error: { type: "string" },
      code: { type: "string" },
    },
  },
};

export const materialPaths = {
  "/classes/{classId}/materials": {
    parameters: [
      {
        name: "classId",
        in: "path",
        required: true,
        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
      },
    ],
    get: {
      tags: ["Material (LMS-14)"],
      operationId: "listMaterials",
      summary: "Danh sách tài liệu học tập của lớp",
      description: "Thành viên lớp (Giáo viên hoặc Học sinh đã tham gia) xem danh sách tài liệu sắp xếp mới nhất trước.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Danh sách tài liệu.",
          content: jsonSchema({
            type: "object",
            required: ["success", "materials"],
            properties: {
              success: { type: "boolean" },
              materials: {
                type: "array",
                items: { $ref: "#/components/schemas/Material" },
              },
            },
          }),
        },
        "400": error("INVALID_ID: classId không hợp lệ."),
        ...commonErrors,
      },
    },
    post: {
      tags: ["Material (LMS-14)"],
      operationId: "createMaterial",
      summary: "Giáo viên tạo liên kết tài liệu mới",
      description: "Chỉ giáo viên sở hữu lớp mới có thể thêm tài liệu bài giảng.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonSchema({ $ref: "#/components/schemas/CreateMaterial" }),
      },
      responses: {
        "201": {
          description: "Thêm tài liệu thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "material"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              material: { $ref: "#/components/schemas/Material" },
            },
          }),
        },
        "400": error("INVALID_ID hoặc INVALID_URL hoặc INVALID_TITLE."),
        ...commonErrors,
      },
    },
  },
  "/classes/{classId}/materials/{materialId}": {
    parameters: [
      {
        name: "classId",
        in: "path",
        required: true,
        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
      },
      {
        name: "materialId",
        in: "path",
        required: true,
        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
      },
    ],
    delete: {
      tags: ["Material (LMS-14)"],
      operationId: "deleteMaterial",
      summary: "Giáo viên xóa tài liệu khỏi lớp",
      description: "Chỉ giáo viên phụ trách lớp mới có quyền xóa tài liệu.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Đã xóa tài liệu thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          }),
        },
        "400": error("INVALID_ID: Định dạng ID không hợp lệ."),
        ...commonErrors,
      },
    },
  },
};
