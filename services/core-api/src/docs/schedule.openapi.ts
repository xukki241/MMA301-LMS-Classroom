const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const error = (description: string) => ({ description, content: jsonSchema({ $ref: "#/components/schemas/ScheduleError" }) });
const commonErrors = {
  "401": error("Thiếu, sai hoặc hết hạn Bearer JWT (UNAUTHENTICATED / INVALID_TOKEN)."),
  "403": error("FORBIDDEN: Không phải thành viên lớp hoặc không phải giáo viên chủ lớp."),
  "404": error("CLASS_NOT_FOUND / SESSION_NOT_FOUND / EXAM_NOT_FOUND / MEMBER_NOT_FOUND."),
};
const objectId = { type: "string", pattern: "^[a-fA-F0-9]{24}$" };
const param = (name: string) => ({ name, in: "path", required: true, schema: objectId });
const ok = (description: string, properties: object, required: string[]) => ({
  description,
  content: jsonSchema({ type: "object", required, properties }),
});

export const scheduleSchemas = {
  ScheduleError: {
    type: "object", required: ["error", "code"],
    properties: { error: { type: "string" }, code: { type: "string" } },
  },
  CreateClassSession: {
    type: "object", additionalProperties: false, required: ["weekday", "startTime", "endTime"],
    properties: {
      weekday: { type: "integer", minimum: 0, maximum: 6, description: "0 = Chủ nhật … 6 = Thứ bảy." },
      startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "07:30" },
      endTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "09:30" },
      room: { type: "string", maxLength: 60, default: "" },
      note: { type: "string", maxLength: 300, default: "" },
    },
  },
  ClassSession: {
    type: "object", required: ["_id", "classId", "weekday", "startTime", "endTime", "createdBy"],
    properties: {
      _id: { type: "string" }, classId: { type: "string" }, weekday: { type: "integer" },
      startTime: { type: "string" }, endTime: { type: "string" }, room: { type: "string" },
      note: { type: "string" }, createdBy: { type: "string" },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateExam: {
    type: "object", additionalProperties: false, required: ["title", "startsAt", "durationMinutes"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      startsAt: { type: "string", format: "date-time", description: "ISO 8601 có timezone, lớn hơn giờ server." },
      durationMinutes: { type: "integer", minimum: 1, maximum: 600 },
      room: { type: "string", maxLength: 60, default: "" },
      note: { type: "string", maxLength: 300, default: "" },
    },
  },
  Exam: {
    type: "object", required: ["_id", "classId", "title", "startsAt", "durationMinutes", "createdBy"],
    properties: {
      _id: { type: "string" }, classId: { type: "string" }, title: { type: "string" },
      startsAt: { type: "string", format: "date-time" }, durationMinutes: { type: "integer" },
      room: { type: "string" }, note: { type: "string" }, createdBy: { type: "string" },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
    },
  },
  UserOverview: {
    type: "object", required: ["role", "classes", "sessions", "exams", "work"],
    properties: {
      role: { type: "string", enum: ["teacher", "student"] },
      classes: { type: "array", items: { type: "object", properties: {
        id: { type: "string" }, name: { type: "string" }, code: { type: "string" },
      } } },
      sessions: { type: "array", items: { type: "object", description: "ClassSession kèm className." } },
      exams: { type: "array", items: { type: "object", description: "Exam sắp tới (kể cả 24h gần nhất) kèm className." } },
      work: {
        type: "array",
        description: "Học sinh: status todo|submitted|graded|overdue kèm score/feedback. Giáo viên: status open|needs_grading|done|closed (closed = đã quá hạn và chưa có bài nộp) kèm submissionCount/gradedCount. Mốc thời gian là dueAt <= giờ server.",
        items: { type: "object", required: ["exerciseId", "classId", "className", "title", "dueAt", "status"],
          properties: {
            exerciseId: { type: "string" }, classId: { type: "string" }, className: { type: "string" },
            title: { type: "string" }, dueAt: { type: "string", format: "date-time" },
            status: { type: "string" }, score: { type: "number", nullable: true }, feedback: { type: "string" },
            submissionCount: { type: "integer" }, gradedCount: { type: "integer" },
          } },
      },
    },
  },
  PaymentHistoryItem: {
    type: "object",
    required: ["id", "classId", "className", "materialId", "materialTitle", "studentId", "amount", "provider", "transactionRef", "status", "createdAt", "updatedAt"],
    properties: {
      id: { type: "string" },
      classId: { type: "string" },
      className: { type: "string" },
      materialId: { type: "string" },
      materialTitle: { type: "string" },
      studentId: { type: "string" },
      amount: { type: "number" },
      provider: { type: "string", enum: ["SEPAY", "SEPAY_DEMO"] },
      transactionRef: { type: "string" },
      status: { type: "string", enum: ["pending", "success", "failed"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  SubmissionHistoryItem: {
    type: "object",
    required: ["id", "exerciseId", "exerciseTitle", "classId", "className", "studentId", "content", "url", "submittedAt", "dueAt", "score", "feedback", "status"],
    properties: {
      id: { type: "string" },
      exerciseId: { type: "string" },
      exerciseTitle: { type: "string" },
      classId: { type: "string" },
      className: { type: "string" },
      studentId: { type: "string" },
      content: { type: "string" },
      url: { type: "string" },
      submittedAt: { type: "string", format: "date-time" },
      dueAt: { type: "string", format: "date-time" },
      score: { type: "number", nullable: true },
      feedback: { type: "string" },
      status: { type: "string", enum: ["submitted", "graded"] },
    },
  },
  UpdateMaterial: {
    type: "object", additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 2, maxLength: 200 },
      url: { type: "string", format: "uri" },
      description: { type: "string", maxLength: 1000 },
    },
  },
};

export const schedulePaths = {
  "/me/overview": {
    get: {
      tags: ["Tổng quan (LMS-15)"], operationId: "getMyOverview",
      summary: "Tổng quan theo người dùng: lớp, lịch học, kỳ kiểm tra, bài tập/điểm",
      description: "Một lần gọi cho Trang chủ, Lịch và Việc. Học sinh nhận trạng thái bài làm và điểm; giáo viên nhận số bài nộp/đã chấm.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": { description: "Tổng quan.", content: jsonSchema({ $ref: "#/components/schemas/UserOverview" }) },
        "401": commonErrors["401"],
      },
    },
  },
  "/me/payments": {
    get: {
      tags: ["Tổng quan (LMS-15)"],
      operationId: "listMyPayments",
      summary: "Lịch sử giao dịch mở khóa tài nguyên",
      description: "Học sinh: giao dịch của mình. Giáo viên: giao dịch trong lớp mình chủ. Mới cập nhật trước.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": ok(
          "Danh sách giao dịch.",
          { payments: { type: "array", items: { $ref: "#/components/schemas/PaymentHistoryItem" } } },
          ["payments"]
        ),
        "401": commonErrors["401"],
        "403": error("FORBIDDEN."),
      },
    },
  },
  "/me/submissions": {
    get: {
      tags: ["Tổng quan (LMS-15)"],
      operationId: "listMySubmissions",
      summary: "Lịch sử nộp bài",
      description: "Học sinh: bài mình đã nộp. Giáo viên: bài nộp trong lớp mình chủ (tối đa 200), kèm điểm nếu đã chấm.",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": ok(
          "Danh sách bài nộp.",
          { submissions: { type: "array", items: { $ref: "#/components/schemas/SubmissionHistoryItem" } } },
          ["submissions"]
        ),
        "401": commonErrors["401"],
        "403": error("FORBIDDEN."),
      },
    },
  },
  "/classes/{classId}/sessions": {
    parameters: [param("classId")],
    get: {
      tags: ["Lịch (LMS-15)"], operationId: "listClassSessions", summary: "Thành viên xem lịch học hằng tuần của lớp",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": ok("Danh sách buổi học.", { sessions: { type: "array", items: { $ref: "#/components/schemas/ClassSession" } } }, ["sessions"]),
        ...commonErrors,
      },
    },
    post: {
      tags: ["Lịch (LMS-15)"], operationId: "createClassSession", summary: "Giáo viên chủ lớp thêm buổi học hằng tuần",
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: jsonSchema({ $ref: "#/components/schemas/CreateClassSession" }) },
      responses: {
        "201": ok("Buổi học đã lưu.", { message: { type: "string" }, session: { $ref: "#/components/schemas/ClassSession" } }, ["message", "session"]),
        "400": error("INVALID_TIME_RANGE: endTime phải sau startTime."),
        ...commonErrors,
        "422": error("VALIDATION_ERROR."),
      },
    },
  },
  "/classes/{classId}/sessions/{sessionId}": {
    parameters: [param("classId"), param("sessionId")],
    delete: {
      tags: ["Lịch (LMS-15)"], operationId: "deleteClassSession", summary: "Giáo viên chủ lớp xóa buổi học",
      security: [{ BearerAuth: [] }],
      responses: { "200": ok("Đã xóa.", { message: { type: "string" } }, ["message"]), ...commonErrors },
    },
  },
  "/classes/{classId}/exams": {
    parameters: [param("classId")],
    get: {
      tags: ["Lịch (LMS-15)"], operationId: "listClassExams", summary: "Thành viên xem kỳ kiểm tra của lớp",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": ok("Danh sách kỳ kiểm tra.", { exams: { type: "array", items: { $ref: "#/components/schemas/Exam" } } }, ["exams"]),
        ...commonErrors,
      },
    },
    post: {
      tags: ["Lịch (LMS-15)"], operationId: "createClassExam", summary: "Giáo viên chủ lớp tạo kỳ kiểm tra",
      security: [{ BearerAuth: [] }],
      requestBody: { required: true, content: jsonSchema({ $ref: "#/components/schemas/CreateExam" }) },
      responses: {
        "201": ok("Kỳ kiểm tra đã lưu.", { message: { type: "string" }, exam: { $ref: "#/components/schemas/Exam" } }, ["message", "exam"]),
        "400": error("INVALID_STARTS_AT: thời điểm phải ở tương lai."),
        ...commonErrors,
        "422": error("VALIDATION_ERROR."),
      },
    },
  },
  "/classes/{classId}/exams/{examId}": {
    parameters: [param("classId"), param("examId")],
    delete: {
      tags: ["Lịch (LMS-15)"], operationId: "deleteClassExam", summary: "Giáo viên chủ lớp xóa kỳ kiểm tra",
      security: [{ BearerAuth: [] }],
      responses: { "200": ok("Đã xóa.", { message: { type: "string" } }, ["message"]), ...commonErrors },
    },
  },
  "/classes/{id}/members/{userId}": {
    parameters: [param("id"), { name: "userId", in: "path", required: true, schema: { type: "string" } }],
    delete: {
      tags: ["Lịch (LMS-15)"], operationId: "removeClassMember", summary: "Giáo viên chủ lớp gỡ học sinh khỏi lớp",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": ok("Đã gỡ học sinh.", { message: { type: "string" } }, ["message"]),
        "400": error("CANNOT_REMOVE_OWNER."),
        ...commonErrors,
      },
    },
  },
};
