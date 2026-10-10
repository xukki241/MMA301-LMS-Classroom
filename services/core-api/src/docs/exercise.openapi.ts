const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const error = (description: string) => ({ description, content: jsonSchema({ $ref: "#/components/schemas/ExerciseError" }) });
const commonErrors = {
  "401": error("Thiếu, sai hoặc hết hạn Bearer JWT (UNAUTHENTICATED / INVALID_TOKEN)."),
  "403": error("FORBIDDEN: Không có membership hoặc không đủ quyền với lớp."),
  "404": error("CLASS_NOT_FOUND: Không tìm thấy lớp."),
};

export const exerciseSchemas = {
  CreateExercise: {
    type: "object", additionalProperties: false, required: ["title", "dueAt"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200, description: "Trim trước khi kiểm tra; không chỉ chứa khoảng trắng." },
      description: { type: "string", maxLength: 10000, default: "" },
      dueAt: { type: "string", format: "date-time", description: "ISO 8601 có Z hoặc offset, lớn hơn giờ server; lưu UTC." },
    },
    example: { title: "Assignment 1", description: "Submit project report", dueAt: "2099-01-01T00:00:00.000Z" },
  },
  Exercise: {
    type: "object", required: ["_id", "classId", "title", "description", "dueAt", "createdBy", "createdAt", "updatedAt"],
    properties: {
      _id: { type: "string", description: "MongoDB ObjectId" },
      classId: { type: "string" }, title: { type: "string" }, description: { type: "string" },
      dueAt: { type: "string", format: "date-time" }, createdBy: { type: "string", description: "JWT user.id do server gán." },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
      __v: { type: "integer" },
    },
  },
  ExerciseError: {
    type: "object", required: ["error", "code"],
    properties: { error: { type: "string" }, code: { type: "string" } },
  },
};

export const exercisePaths = {
  "/classes/{classId}/exercises": {
    parameters: [{ name: "classId", in: "path", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } }],
    post: {
      tags: ["Bài tập (LMS-08)"], operationId: "createExercise", summary: "Giáo viên sở hữu lớp tạo bài tập",
      description: "Yêu cầu JWT role teacher, class.teacherId trùng user.id và membership teacher. Body chỉ nhận title, description, dueAt. Nộp bài/chấm điểm và UI thuộc task khác.",
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: jsonSchema({ $ref: "#/components/schemas/CreateExercise" }) },
      responses: {
        "201": { description: "Bài tập đã lưu.", content: jsonSchema({ type: "object", required: ["message", "exercise"], properties: {
          message: { type: "string" }, exercise: { $ref: "#/components/schemas/Exercise" },
        } }) },
        "400": error("INVALID_ID; INVALID_DUE_AT (thiếu/sai ngày, thiếu timezone hoặc hạn không ở tương lai); INVALID_JSON."),
        ...commonErrors,
        "422": error("VALIDATION_ERROR: Body/title/description không hợp lệ hoặc có trường ngoài schema."),
      },
    },
    get: {
      tags: ["Bài tập (LMS-08)"], operationId: "listExercises", summary: "Thành viên xem bài tập của lớp",
      description: "Cần membership của đúng lớp. Sắp xếp dueAt tăng dần rồi _id tăng dần. Trả mảng rỗng nếu lớp chưa có bài; MVP chưa phân trang.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": { description: "Danh sách bài tập.", content: jsonSchema({ type: "object", required: ["exercises"], properties: {
          exercises: { type: "array", items: { $ref: "#/components/schemas/Exercise" } },
        } }) },
        "400": error("INVALID_ID: classId không phải ObjectId."), ...commonErrors,
      },
    },
  },
};
