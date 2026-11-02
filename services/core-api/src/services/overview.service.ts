import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, ClassSession, Exam, Exercise, Grade, Submission } from "../models/index.js";

export type StudentWorkStatus = "todo" | "submitted" | "graded" | "overdue";
export type TeacherWorkStatus = "open" | "needs_grading" | "done" | "closed";

/** Quá khứ gần vẫn hiện để người dùng thấy kỳ kiểm tra vừa diễn ra. */
const EXAM_GRACE_MS = 24 * 3600 * 1000;

export class OverviewService {
  /**
   * Tổng hợp mọi thứ trang chủ / lịch / việc cần: lớp, lịch học, kỳ kiểm tra
   * và danh sách bài tập kèm trạng thái theo vai trò của người dùng.
   */
  static async getOverview(user: AuthUser) {
    const memberships = await ClassMember.find({ userId: user.id, roleInClass: user.role }).lean();
    const classIdSet = new Set(memberships.map((membership) => String(membership.classId)));
    // Giáo viên vẫn thấy lớp mình tạo khi thiếu dòng ClassMember (teacherId là nguồn sở hữu).
    if (user.role === "teacher") {
      const owned = await ClassModel.find({ teacherId: user.id }).select("_id").lean();
      for (const row of owned) classIdSet.add(String(row._id));
    }
    const classIds = [...classIdSet];
    const classes = await ClassModel.find({ _id: { $in: classIds } }).sort({ createdAt: -1 }).lean();
    const classNames = new Map(classes.map((c) => [String(c._id), c.name]));
    const withClass = <T extends { classId: unknown }>(row: T) => ({
      ...row,
      className: classNames.get(String(row.classId)) ?? "",
    });

    const [sessions, exams, exercises] = await Promise.all([
      ClassSession.find({ classId: { $in: classIds } }).sort({ weekday: 1, startTime: 1 }).lean(),
      Exam.find({ classId: { $in: classIds }, startsAt: { $gte: new Date(Date.now() - EXAM_GRACE_MS) } })
        .sort({ startsAt: 1 })
        .lean(),
      Exercise.find({ classId: { $in: classIds } }).sort({ dueAt: 1, _id: 1 }).lean(),
    ]);

    const exerciseIds = exercises.map((e) => e._id);
    const now = Date.now();
    let work;

    if (user.role === "student") {
      const submissions = await Submission.find({ exerciseId: { $in: exerciseIds }, studentId: user.id }).lean();
      const grades = await Grade.find({ submissionId: { $in: submissions.map((s) => s._id) } }).lean();
      const submissionByExercise = new Map(submissions.map((s) => [String(s.exerciseId), s]));
      const gradeBySubmission = new Map(grades.map((g) => [String(g.submissionId), g]));
      work = exercises.map((exercise) => {
        const submission = submissionByExercise.get(String(exercise._id));
        const grade = submission ? gradeBySubmission.get(String(submission._id)) : undefined;
        let status: StudentWorkStatus = "todo";
        if (grade) status = "graded";
        else if (submission) status = "submitted";
        else if (exercise.dueAt.getTime() <= now) status = "overdue";
        return {
          ...withClass({
            exerciseId: String(exercise._id),
            classId: String(exercise.classId),
            title: exercise.title,
            dueAt: exercise.dueAt,
          }),
          status,
          score: grade?.score ?? null,
          feedback: grade?.feedback ?? "",
        };
      });
    } else {
      const submissions = await Submission.find({ exerciseId: { $in: exerciseIds } }).lean();
      const grades = await Grade.find({ submissionId: { $in: submissions.map((s) => s._id) } }).lean();
      const gradedIds = new Set(grades.map((g) => String(g.submissionId)));
      work = exercises.map((exercise) => {
        const mine = submissions.filter((s) => String(s.exerciseId) === String(exercise._id));
        const gradedCount = mine.filter((s) => gradedIds.has(String(s._id))).length;
        const pending = mine.length - gradedCount;
        let status: TeacherWorkStatus = "open";
        const due = exercise.dueAt.getTime() <= now;
        if (!due) status = "open";
        else if (mine.length === 0) status = "closed";
        else if (pending > 0) status = "needs_grading";
        else if (gradedCount === mine.length) status = "done";
        return {
          ...withClass({
            exerciseId: String(exercise._id),
            classId: String(exercise.classId),
            title: exercise.title,
            dueAt: exercise.dueAt,
          }),
          status,
          submissionCount: mine.length,
          gradedCount,
        };
      });
    }

    return {
      role: user.role,
      classes: classes.map((c) => ({ id: String(c._id), name: c.name, code: c.code })),
      sessions: sessions.map(withClass),
      exams: exams.map(withClass),
      work,
    };
  }
}
