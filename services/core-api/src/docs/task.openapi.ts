const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const error = (description: string) => ({
  description,
  content: jsonSchema({ $ref: "#/components/schemas/TaskError" }),
});

const commonErrors = {
  "401": error("Thiếu, sai hoặc hết hạn Bearer JWT (UNAUTHENTICATED / INVALID_TOKEN)."),
  "403": error("FORBIDDEN: Không có quyền truy cập hoặc không phải chủ sở hữu công việc."),
  "404": error("TASK_NOT_FOUND: Không tìm thấy công việc."),
};

export const taskSchemas = {
  CreateTask: {
    type: "object",
    additionalProperties: false,
    required: ["title"],
    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 200,
        description: "Tiêu đề công việc; tối thiểu 2 ký tự, tối đa 200 ký tự.",
      },
      description: {
        type: "string",
        maxLength: 1000,
        default: "",
        description: "Mô tả chi tiết công việc.",
      },
      dueDate: {
        type: "string",
        format: "date-time",
        description: "Hạn chót hoàn thành (ISO 8601).",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        default: "medium",
        description: "Mức độ ưu tiên của công việc.",
      },
      status: {
        type: "string",
        enum: ["todo", "in_progress", "completed"],
        default: "todo",
        description: "Trạng thái công việc.",
      },
      classId: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        description: "ID lớp học liên quan (tùy chọn, người dùng phải là thành viên lớp).",
      },
      exerciseId: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        description: "ID bài tập liên quan (tùy chọn).",
      },
    },
    example: {
      title: "Ôn tập kiến thức React Native",
      description: "Đọc tài liệu về AsyncStorage và TanStack Query",
      dueDate: "2026-10-15T17:00:00.000Z",
      priority: "high",
      status: "todo",
    },
  },
  UpdateTask: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 200,
        description: "Tiêu đề công việc.",
      },
      description: {
        type: "string",
        maxLength: 1000,
        description: "Mô tả chi tiết công việc.",
      },
      dueDate: {
        type: "string",
        format: "date-time",
        nullable: true,
        description: "Hạn chót hoàn thành (truyền null nếu muốn xóa hạn).",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Mức độ ưu tiên.",
      },
      status: {
        type: "string",
        enum: ["todo", "in_progress", "completed"],
        description: "Trạng thái công việc.",
      },
      classId: {
        type: "string",
        nullable: true,
        description: "ID lớp học liên quan (truyền null nếu muốn gỡ liên kết).",
      },
    },
    example: {
      title: "Ôn tập kiến thức React Native (Hoàn thành phần hook)",
      priority: "medium",
      status: "in_progress",
    },
  },
  Task: {
    type: "object",
    required: ["_id", "userId", "title", "description", "priority", "status", "createdAt", "updatedAt"],
    properties: {
      _id: { type: "string", description: "MongoDB ObjectId" },
      userId: { type: "string", description: "ID người dùng sở hữu" },
      classId: { type: "string", description: "ID lớp học liên kết (nếu có)" },
      exerciseId: { type: "string", description: "ID bài tập liên kết (nếu có)" },
      title: { type: "string" },
      description: { type: "string" },
      dueDate: { type: "string", format: "date-time" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      status: { type: "string", enum: ["todo", "in_progress", "completed"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      __v: { type: "integer" },
    },
  },
  TaskError: {
    type: "object",
    required: ["error", "code"],
    properties: {
      error: { type: "string", example: "Không tìm thấy công việc" },
      code: {
        type: "string",
        example: "TASK_NOT_FOUND",
        enum: [
          "UNAUTHENTICATED",
          "INVALID_TOKEN",
          "FORBIDDEN",
          "INVALID_TASK_ID",
          "INVALID_CLASS_ID",
          "INVALID_EXERCISE_ID",
          "INVALID_TITLE",
          "TITLE_TOO_LONG",
          "INVALID_DUE_DATE",
          "INVALID_PRIORITY",
          "INVALID_STATUS",
          "TASK_NOT_FOUND",
          "CLASS_NOT_FOUND",
        ],
      },
    },
  },
};

export const taskPaths = {
  "/tasks": {
    get: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "listTasks",
      summary: "Lấy danh sách công việc cá nhân của người dùng hiện tại",
      description: "Trả về danh sách công việc thuộc về tài khoản gửi request. Hỗ trợ lọc theo trạng thái, độ ưu tiên, lớp học hoặc công việc quá hạn.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["todo", "in_progress", "completed", "pending"] },
          description: "Lọc theo trạng thái ('pending' lấy cả todo và in_progress).",
        },
        {
          name: "priority",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["low", "medium", "high"] },
          description: "Lọc theo độ ưu tiên.",
        },
        {
          name: "classId",
          in: "query",
          required: false,
          schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
          description: "Lọc theo ID lớp học.",
        },
        {
          name: "overdue",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["true", "false"] },
          description: "Chỉ lấy các công việc đã quá hạn chưa hoàn thành.",
        },
      ],
      responses: {
        "200": {
          description: "Lấy danh sách công việc thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "tasks"],
            properties: {
              success: { type: "boolean" },
              tasks: {
                type: "array",
                items: { $ref: "#/components/schemas/Task" },
              },
            },
          }),
        },
        ...commonErrors,
      },
    },
    post: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "createTask",
      summary: "Tạo công việc cá nhân mới",
      description: "Tạo công việc mới gắn với tài khoản đang đăng nhập.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonSchema({ $ref: "#/components/schemas/CreateTask" }),
      },
      responses: {
        "201": {
          description: "Tạo công việc thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "message", "task"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              task: { $ref: "#/components/schemas/Task" },
            },
          }),
        },
        "400": error("INVALID_TITLE hoặc INVALID_DUE_DATE hoặc INVALID_CLASS_ID."),
        ...commonErrors,
      },
    },
  },
  "/tasks/{id}": {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
        description: "MongoDB ObjectId của công việc.",
      },
    ],
    get: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "getTask",
      summary: "Xem chi tiết một công việc cá nhân",
      description: "Chỉ người sở hữu công việc mới có quyền xem.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Lấy thông tin công việc thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "task"],
            properties: {
              success: { type: "boolean" },
              task: { $ref: "#/components/schemas/Task" },
            },
          }),
        },
        "400": error("INVALID_TASK_ID: Định dạng ID công việc không hợp lệ."),
        ...commonErrors,
      },
    },
    patch: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "updateTask",
      summary: "Cập nhật công việc cá nhân",
      description: "Cập nhật tiêu đề, mô tả, hạn nộp, độ ưu tiên hoặc trạng thái công việc.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: jsonSchema({ $ref: "#/components/schemas/UpdateTask" }),
      },
      responses: {
        "200": {
          description: "Cập nhật công việc thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "message", "task"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              task: { $ref: "#/components/schemas/Task" },
            },
          }),
        },
        "400": error("Dữ liệu cập nhật không hợp lệ."),
        ...commonErrors,
      },
    },
    delete: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "deleteTask",
      summary: "Xóa công việc cá nhân",
      description: "Chỉ người sở hữu mới có quyền xóa.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Đã xóa công việc thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "message"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          }),
        },
        "400": error("INVALID_TASK_ID: Định dạng ID không hợp lệ."),
        ...commonErrors,
      },
    },
  },
  "/tasks/{id}/toggle": {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
        description: "MongoDB ObjectId của công việc.",
      },
    ],
    patch: {
      tags: ["Công việc cá nhân (LMS-28)"],
      operationId: "toggleTask",
      summary: "Chuyển đổi nhanh trạng thái hoàn thành công việc",
      description: "Nếu đang là completed thì chuyển sang todo; nếu ngược lại thì chuyển sang completed.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Chuyển trạng thái thành công.",
          content: jsonSchema({
            type: "object",
            required: ["success", "message", "task"],
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              task: { $ref: "#/components/schemas/Task" },
            },
          }),
        },
        "400": error("INVALID_TASK_ID: Định dạng ID không hợp lệ."),
        ...commonErrors,
      },
    },
  },
};
