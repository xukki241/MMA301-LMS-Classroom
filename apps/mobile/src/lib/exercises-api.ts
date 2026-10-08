import { CORE_URL } from "./config";
import { http, HttpError, isNotFound } from "./http";

export type LmsExercise = {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
  createdBy: string;
  createdAt?: string;
};

export type LmsSubmission = {
  id: string;
  exerciseId: string;
  studentId: string;
  content: string;
  url: string;
  submittedAt?: string;
};

export type LmsGrade = {
  score: number;
  feedback: string;
  submissionId?: string;
};

export type SubmissionWithGrade = LmsSubmission & { grade: LmsGrade | null };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return value;
}

function parseExercise(value: unknown, classId: string): LmsExercise {
  const raw = record(value);
  const dueAt = requiredString(raw.dueAt);
  if (!Number.isFinite(Date.parse(dueAt))) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  const id = requiredString(raw._id ?? raw.id);
  const parsedClassId = requiredString(raw.classId);
  if (parsedClassId !== classId) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return {
    id,
    classId: parsedClassId,
    title: requiredString(raw.title),
    description: typeof raw.description === "string" ? raw.description : "",
    dueAt,
    createdBy: requiredString(raw.createdBy),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
  };
}

function parseSubmission(value: unknown, exerciseId: string): LmsSubmission {
  const raw = record(value);
  const id = requiredString(raw._id ?? raw.id);
  const parsedExerciseId = requiredString(raw.exerciseId);
  if (parsedExerciseId !== exerciseId) {
    throw new HttpError("Dữ liệu bài làm không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return {
    id,
    exerciseId: parsedExerciseId,
    studentId: requiredString(raw.studentId),
    content: typeof raw.content === "string" ? raw.content : "",
    url: typeof raw.url === "string" ? raw.url : "",
    submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : undefined,
  };
}

function parseGrade(value: unknown): LmsGrade | null {
  if (value === null || value === undefined) return null;
  const raw = record(value);
  const score = raw.score;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10) {
    throw new HttpError("Dữ liệu điểm không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return {
    score,
    feedback: typeof raw.feedback === "string" ? raw.feedback : "",
    submissionId:
      typeof raw.submissionId === "string"
        ? raw.submissionId
        : raw.submissionId != null
          ? String(raw.submissionId)
          : undefined,
  };
}

const exercisesUrl = (classId: string) => `${CORE_URL}/classes/${encodeURIComponent(classId)}/exercises`;
const submissionsUrl = (classId: string, exerciseId: string) =>
  `${exercisesUrl(classId)}/${encodeURIComponent(exerciseId)}/submissions`;

export function validateExerciseTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new HttpError("Tiêu đề bài tập không hợp lệ (1–200 ký tự).", 422, "VALIDATION_ERROR");
  }
  return trimmed;
}

export function validateDueAtIso(dueAt: string): string {
  const trimmed = dueAt.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);
  if (!hasTimezone || !Number.isFinite(Date.parse(trimmed))) {
    throw new HttpError("Hạn nộp phải là thời gian ISO hợp lệ.", 422, "VALIDATION_ERROR");
  }
  if (Date.parse(trimmed) <= Date.now()) {
    throw new HttpError("Hạn nộp phải ở tương lai.", 422, "VALIDATION_ERROR");
  }
  return trimmed;
}

export function validateSubmissionPayload(content: string, url: string): { content: string; url: string } {
  const trimmedContent = content.trim();
  const trimmedUrl = url.trim();
  if (!trimmedContent && !trimmedUrl) {
    throw new HttpError("Nhập nội dung bài làm hoặc liên kết đính kèm.", 422, "VALIDATION_ERROR");
  }
  if (trimmedUrl) {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      throw new HttpError("Liên kết phải dùng http:// hoặc https://.", 422, "VALIDATION_ERROR");
    }
  }
  return { content: trimmedContent, url: trimmedUrl };
}

export function validateGradeScore(raw: string): number {
  const score = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new HttpError("Điểm phải từ 0 đến 10.", 422, "VALIDATION_ERROR");
  }
  return score;
}

export async function listExercises(
  token: string,
  classId: string,
  signal?: AbortSignal,
): Promise<LmsExercise[]> {
  const raw = record(await http<unknown>(exercisesUrl(classId), { token, signal }));
  if (!Array.isArray(raw.exercises)) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  const items = raw.exercises.map(item => parseExercise(item, classId));
  if (new Set(items.map(item => item.id)).size !== items.length) {
    throw new HttpError("Dữ liệu bài tập không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return items;
}

export async function createExercise(
  token: string,
  classId: string,
  input: { title: string; description?: string; dueAt: string },
): Promise<LmsExercise> {
  const body = {
    title: validateExerciseTitle(input.title),
    description: (input.description ?? "").trim(),
    dueAt: validateDueAtIso(input.dueAt),
  };
  const raw = record(await http<unknown>(exercisesUrl(classId), { method: "POST", token, body }));
  return parseExercise(raw.exercise, classId);
}

export async function getMySubmission(
  token: string,
  classId: string,
  exerciseId: string,
  signal?: AbortSignal,
): Promise<{ submission: LmsSubmission; grade: LmsGrade | null } | null> {
  try {
    const raw = record(
      await http<unknown>(`${submissionsUrl(classId, exerciseId)}/mine`, { token, signal }),
    );
    return {
      submission: parseSubmission(raw.submission, exerciseId),
      grade: parseGrade(raw.grade),
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createSubmission(
  token: string,
  classId: string,
  exerciseId: string,
  input: { content: string; url: string },
): Promise<LmsSubmission> {
  const body = validateSubmissionPayload(input.content, input.url);
  const raw = record(
    await http<unknown>(submissionsUrl(classId, exerciseId), { method: "POST", token, body }),
  );
  return parseSubmission(raw.submission, exerciseId);
}

export async function updateMySubmission(
  token: string,
  classId: string,
  exerciseId: string,
  input: { content: string; url: string },
): Promise<LmsSubmission> {
  const body = validateSubmissionPayload(input.content, input.url);
  const raw = record(
    await http<unknown>(`${submissionsUrl(classId, exerciseId)}/mine`, { method: "PUT", token, body }),
  );
  return parseSubmission(raw.submission, exerciseId);
}

export async function listSubmissions(
  token: string,
  classId: string,
  exerciseId: string,
  signal?: AbortSignal,
): Promise<SubmissionWithGrade[]> {
  const raw = record(await http<unknown>(submissionsUrl(classId, exerciseId), { token, signal }));
  if (!Array.isArray(raw.submissions)) {
    throw new HttpError("Dữ liệu bài làm không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  const items = raw.submissions.map(item => {
    const row = record(item);
    const submission = parseSubmission(row, exerciseId);
    const grade = parseGrade(row.grade);
    return { ...submission, grade };
  });
  if (new Set(items.map(item => item.id)).size !== items.length) {
    throw new HttpError("Dữ liệu bài làm không hợp lệ.", 502, "INVALID_RESPONSE");
  }
  return items;
}

export async function putGrade(
  token: string,
  classId: string,
  exerciseId: string,
  submissionId: string,
  input: { score: number; feedback?: string },
): Promise<LmsGrade> {
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 10) {
    throw new HttpError("Điểm phải từ 0 đến 10.", 422, "VALIDATION_ERROR");
  }
  const body = {
    score: input.score,
    feedback: (input.feedback ?? "").trim(),
  };
  const raw = record(
    await http<unknown>(
      `${submissionsUrl(classId, exerciseId)}/${encodeURIComponent(submissionId)}/grade`,
      { method: "PUT", token, body },
    ),
  );
  const grade = parseGrade(raw.grade);
  if (!grade) throw new HttpError("Dữ liệu điểm không hợp lệ.", 502, "INVALID_RESPONSE");
  return grade;
}

export function isExerciseOpen(dueAt: string): boolean {
  return Date.now() < Date.parse(dueAt);
}

export function defaultDueAtIso(minutesFromNow = 60 * 24 * 7): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}
