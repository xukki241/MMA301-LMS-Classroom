import type { ExerciseInput, GradeInput } from "./api";

export type ExerciseForm = { title: string; description: string; date: string; time: string };
export type ExerciseErrors = { title?: string; description?: string; deadline?: string };
export type GradeErrors = { score?: string; feedback?: string };

export function validateExercise(form: ExerciseForm, now = Date.now()): { errors: ExerciseErrors; value?: ExerciseInput } {
  const errors: ExerciseErrors = {};
  const title = form.title.trim();
  if (!title || title.length > 200) errors.title = "Tiêu đề cần từ 1 đến 200 ký tự.";
  if (form.description.length > 10000) errors.description = "Mô tả tối đa 10.000 ký tự.";

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.date.trim());
  const timeParts = /^(\d{2}):(\d{2})$/.exec(form.time.trim());
  let deadline: Date | undefined;
  if (dateParts && timeParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3]);
    const hour = Number(timeParts[1]);
    const minute = Number(timeParts[2]);
    deadline = new Date(year, month - 1, day, hour, minute);
    // Date rolls February 30 into March. Compare each part to reject that rollover.
    if (year < 1000 || deadline.getFullYear() !== year || deadline.getMonth() !== month - 1 ||
        deadline.getDate() !== day || deadline.getHours() !== hour || deadline.getMinutes() !== minute) {
      deadline = undefined;
    }
  }
  if (!deadline) errors.deadline = "Nhập ngày hợp lệ YYYY-MM-DD và giờ HH:mm (24 giờ).";
  else if (deadline.getTime() <= now) errors.deadline = "Hạn nộp phải ở tương lai.";

  if (Object.keys(errors).length || !deadline) return { errors };
  return { errors, value: { title, description: form.description, dueAt: deadline.toISOString() } };
}

export function validateGrade(text: string, feedback: string): { errors: GradeErrors; value?: GradeInput } {
  const errors: GradeErrors = {};
  const normalized = text.trim().replace(",", ".");
  const score = Number(normalized);
  if (!/^\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(score) || score < 0 || score > 10) {
    errors.score = "Nhập điểm từ 0 đến 10, có thể dùng số thập phân.";
  }
  if (feedback.length > 10000) errors.feedback = "Phản hồi tối đa 10.000 ký tự.";
  if (Object.keys(errors).length) return { errors };
  return { errors, value: { score, feedback } };
}

export function safeSubmissionUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
