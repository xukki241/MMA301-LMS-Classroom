const json = (schema: object) => ({ "application/json": { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const base = "/classes/{classId}/exercises/{exerciseId}/submissions";
const parameters = (withSubmission = false) => ["classId", "exerciseId", ...(withSubmission ? ["submissionId"] : [])].map(name => ({
  name, in: "path", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
}));
const errors = {
  "400": { description: "INVALID_ID, DEADLINE_PASSED hoặc GRADING_NOT_OPEN", content: json(ref("ErrorResponse")) },
  "401": { description: "Thiếu hoặc sai JWT", content: json(ref("ErrorResponse")) },
  "403": { description: "FORBIDDEN: sai role, không phải thành viên, không sở hữu lớp/bài nộp", content: json(ref("ErrorResponse")) },
  "404": { description: "CLASS_NOT_FOUND, EXERCISE_NOT_FOUND hoặc SUBMISSION_NOT_FOUND", content: json(ref("ErrorResponse")) },
  "422": { description: "VALIDATION_ERROR: body không hợp lệ hoặc chứa trường lạ", content: json(ref("ErrorResponse")) },
};
const common = { tags: ["Submission & Grade (LMS-09)"], security: [{ BearerAuth: [] }] };
const submissionResponse = { type: "object", required: ["submission"], properties: { submission: ref("Submission") } };
const readResponse = { type: "object", required: ["submission", "grade"], properties: { submission: ref("Submission"), grade: { anyOf: [ref("Grade"), { type: "null" }] } } };

export const submissionSchemas = {
  SubmissionInput: {
    type: "object", additionalProperties: false,
    description: "Ít nhất content hoặc url phải có giá trị sau trim. PUT thay thế cả hai trường; trường bỏ qua thành chuỗi rỗng.",
    properties: { content: { type: "string", maxLength: 10000, default: "" }, url: { type: "string", maxLength: 2048, default: "", description: "Rỗng hoặc URL HTTP(S)" } },
    example: { content: "My homework submission", url: "" },
  },
  GradeInput: {
    type: "object", additionalProperties: false, required: ["score"],
    properties: { score: { type: "number", minimum: 0, maximum: 10 }, feedback: { type: "string", maxLength: 10000, default: "" } },
    example: { score: 8.5, feedback: "Good explanation" },
  },
  Submission: {
    type: "object", required: ["_id", "exerciseId", "studentId", "content", "url", "submittedAt"],
    properties: {
      _id: { type: "string" }, exerciseId: { type: "string" }, studentId: { type: "string", description: "Từ JWT, không nhận từ body" },
      content: { type: "string" }, url: { type: "string" }, submittedAt: { type: "string", format: "date-time", description: "Lần nộp/sửa gần nhất" },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
    },
  },
  Grade: {
    type: "object", required: ["_id", "submissionId", "score", "feedback", "gradedBy", "gradedAt"],
    properties: {
      _id: { type: "string" }, submissionId: { type: "string" }, score: { type: "number", minimum: 0, maximum: 10 }, feedback: { type: "string" },
      gradedBy: { type: "string" }, gradedAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
    },
  },
};

export const submissionPaths = {
  [base]: {
    post: {
      ...common, summary: "Student nộp bài trước hạn", parameters: parameters(),
      description: "Một bài nộp/student/exercise. Nộp đúng hoặc sau hạn trả 400; nộp trùng trả 409. Dùng PUT /mine để sửa trước hạn.",
      requestBody: { required: true, content: json(ref("SubmissionInput")) },
      responses: { ...errors, "201": { description: "Đã tạo bài nộp", content: json(submissionResponse) }, "409": { description: "SUBMISSION_EXISTS", content: json(ref("ErrorResponse")) } },
    },
    get: {
      ...common, summary: "Teacher sở hữu lớp xem danh sách bài nộp", parameters: parameters(),
      description: "Sắp xếp submittedAt rồi _id tăng dần. Mỗi bài kèm grade hoặc null.",
      responses: { ...errors, "200": { description: "Danh sách bài nộp", content: json({ type: "object", properties: { submissions: { type: "array", items: { allOf: [ref("Submission"), { type: "object", properties: { grade: { anyOf: [ref("Grade"), { type: "null" }] } } }] } } } }) } },
    },
  },
  [`${base}/mine`]: {
    put: {
      ...common, summary: "Student sửa bài của mình trước hạn", parameters: parameters(),
      requestBody: { required: true, content: json(ref("SubmissionInput")) },
      responses: { ...errors, "200": { description: "Đã sửa; giữ nguyên ID bài nộp", content: json(submissionResponse) } },
    },
    get: {
      ...common, summary: "Student đọc bài và điểm của mình", parameters: parameters(),
      responses: { ...errors, "200": { description: "Bài nộp và grade (null nếu chưa chấm)", content: json(readResponse) } },
    },
  },
  [`${base}/{submissionId}`]: {
    get: {
      ...common, summary: "Đọc bài nộp: Teacher sở hữu lớp hoặc Student sở hữu bài", parameters: parameters(true),
      responses: { ...errors, "200": { description: "Bài nộp và grade", content: json(readResponse) } },
    },
  },
  [`${base}/{submissionId}/grade`]: {
    put: {
      ...common, summary: "Teacher sở hữu lớp tạo/cập nhật điểm sau hạn nộp", parameters: parameters(true),
      description: "Mở chấm khi giờ server >= dueAt. Score 0–10. Mỗi submission có một Grade; PUT lặp lại giữ nguyên Grade ID. Server gán gradedBy/gradedAt.",
      requestBody: { required: true, content: json(ref("GradeInput")) },
      responses: { ...errors, "200": { description: "Điểm đã lưu", content: json({ type: "object", properties: { grade: ref("Grade") } }) } },
    },
  },
};
