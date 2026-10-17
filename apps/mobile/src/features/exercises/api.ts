import { CORE_URL } from "../../lib/config";
import { http } from "../../lib/http";

export type Exercise = {
  _id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
};

export type Grade = {
  _id: string;
  submissionId: string;
  score: number;
  feedback: string;
  gradedAt: string;
};

export type Submission = {
  _id: string;
  exerciseId: string;
  studentId: string;
  content: string;
  url: string;
  submittedAt: string;
};

export type SubmissionDetail = { submission: Submission; grade: Grade | null };
export type SubmissionRow = Submission & { grade: Grade | null };
export type ExerciseInput = { title: string; description: string; dueAt: string };
export type GradeInput = { score: number; feedback: string };

function exercisesUrl(classId: string) {
  return `${CORE_URL}/classes/${encodeURIComponent(classId)}/exercises`;
}

function submissionsUrl(classId: string, exerciseId: string) {
  return `${exercisesUrl(classId)}/${encodeURIComponent(exerciseId)}/submissions`;
}

export async function listExercises(token: string, classId: string, signal?: AbortSignal) {
  const result = await http<{ exercises: Exercise[] }>(exercisesUrl(classId), { token, signal });
  return result.exercises;
}

export async function createExercise(token: string, classId: string, input: ExerciseInput) {
  const result = await http<{ exercise: Exercise }>(exercisesUrl(classId), {
    token, method: "POST", body: input, retry: 0,
  });
  return result.exercise;
}

export async function listSubmissions(token: string, classId: string, exerciseId: string, signal?: AbortSignal) {
  const result = await http<{ submissions: SubmissionRow[] }>(submissionsUrl(classId, exerciseId), { token, signal });
  return result.submissions;
}

export function getSubmission(token: string, classId: string, exerciseId: string, submissionId: string, signal?: AbortSignal) {
  return http<SubmissionDetail>(`${submissionsUrl(classId, exerciseId)}/${encodeURIComponent(submissionId)}`, { token, signal });
}

export async function saveGrade(token: string, classId: string, exerciseId: string, submissionId: string, input: GradeInput) {
  const result = await http<{ grade: Grade }>(`${submissionsUrl(classId, exerciseId)}/${encodeURIComponent(submissionId)}/grade`, {
    token, method: "PUT", body: input, retry: 0,
  });
  return result.grade;
}
