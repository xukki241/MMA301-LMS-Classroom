const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const error = (description: string) => ({
  description,
  content: jsonSchema({ $ref: "#/components/schemas/CalendarError" }),
});

const commonErrors = {
  "401": error("Thiếu, sai hoặc hết hạn Bearer JWT (UNAUTHENTICATED / INVALID_TOKEN)."),
  "403": error("FORBIDDEN: Không có quyền truy cập lớp học."),
  "400": error("Yêu cầu không hợp lệ (sai định dạng ngày hoặc ID lớp)."),
};

export const calendarSchemas = {
  CalendarEvent: {
    type: "object",
    required: ["id", "type", "title", "dueAt", "status", "isOverdue"],
    properties: {
      id: { type: "string", description: "ID sự kiện" },
      type: { type: "string", enum: ["exercise", "task"], description: "Loại sự kiện (bài tập hoặc task cá nhân)" },
      title: { type: "string", description: "Tiêu đề sự kiện" },
      description: { type: "string", description: "Mô tả sự kiện" },
      dueAt: { type: "string", format: "date-time", description: "Thời hạn (ISO 8601)" },
      classId: { type: "string", description: "ID lớp học liên quan" },
      className: { type: "string", description: "Tên lớp học liên quan" },
      classCode: { type: "string", description: "Mã lớp học" },
      exerciseId: { type: "string", description: "ID bài tập (nếu type=exercise)" },
      status: {
        type: "string",
        enum: ["pending", "submitted", "graded", "completed"],
        description: "Trạng thái bài tập hoặc công việc",
      },
      isOverdue: { type: "boolean", description: "Đã quá hạn hay chưa" },
      submissionId: { type: "string", description: "ID bài nộp của học sinh (nếu có)" },
      grade: { type: "number", description: "Điểm số bài nộp (nếu đã chấm)" },
      priority: { type: "string", enum: ["low", "medium", "high"], description: "Độ ưu tiên (nếu type=task)" },
      taskStatus: { type: "string", description: "Trạng thái task (nếu type=task)" },
    },
  },
  CalendarSummary: {
    type: "object",
    required: ["total", "exercises", "tasks", "pending", "completed", "overdue"],
    properties: {
      total: { type: "number", description: "Tổng số sự kiện" },
      exercises: { type: "number", description: "Số lượng bài tập" },
      tasks: { type: "number", description: "Số lượng task cá nhân" },
      pending: { type: "number", description: "Số sự kiện cần làm/chưa nộp" },
      completed: { type: "number", description: "Số sự kiện đã hoàn thành" },
      overdue: { type: "number", description: "Số sự kiện quá hạn" },
    },
  },
  CalendarEventsResponse: {
    type: "object",
    required: ["success", "events", "summary"],
    properties: {
      success: { type: "boolean", example: true },
      events: {
        type: "array",
        items: { $ref: "#/components/schemas/CalendarEvent" },
      },
      summary: { $ref: "#/components/schemas/CalendarSummary" },
    },
  },
  CalendarError: {
    type: "object",
    required: ["error", "message"],
    properties: {
      error: { type: "string", example: "INVALID_DATE_RANGE" },
      message: { type: "string", example: "Thời gian bắt đầu không được lớn hơn thời gian kết thúc." },
      status: { type: "number", example: 400 },
    },
  },
};

export const calendarPaths = {
  "/calendar/events": {
    get: {
      tags: ["Lịch trình & Hạn chót (LMS-29)"],
      summary: "Tổng hợp toàn bộ deadline bài tập và task cá nhân (Học sinh & Giáo viên)",
      description:
        "Tự động tổng hợp hạn nộp bài tập (Exercise) từ các lớp học mà người dùng đang tham gia cùng các công việc cá nhân (Task).",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date-time" },
          description: "Mốc thời gian bắt đầu (mặc định: 7 ngày trước hôm nay)",
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date-time" },
          description: "Mốc thời gian kết thúc (mặc định: 30 ngày sau hôm nay)",
        },
        {
          name: "type",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "exercise", "task"] },
          description: "Lọc theo loại sự kiện: all (tất cả), exercise (bài tập), task (việc cá nhân)",
        },
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "pending", "completed", "overdue"] },
          description: "Lọc theo trạng thái: all, pending (chưa xong), completed (đã xong), overdue (quá hạn)",
        },
        {
          name: "classId",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Lọc theo lớp học cụ thể",
        },
      ],
      responses: {
        "200": {
          description: "Danh sách sự kiện deadline và thống kê tóm tắt",
          content: jsonSchema({ $ref: "#/components/schemas/CalendarEventsResponse" }),
        },
        ...commonErrors,
      },
    },
  },
};
