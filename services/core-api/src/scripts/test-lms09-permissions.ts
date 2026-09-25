import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ClassModel, ClassMember, Exercise, Submission, Grade } from "../models/index.js";
import { SubmissionService } from "../services/submission.service.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";

const uri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms09_test_permissions";
const location = new URL(uri);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(location.hostname));
assert.match(location.pathname, /^\/lms09_test_[a-z0-9_]+$/);

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Submission.init(), Grade.init()]);
  const owner: AuthUser = { id: randomUUID(), email: "owner@example.test", role: "teacher" };
  const student: AuthUser = { id: randomUUID(), email: "student@example.test", role: "student" };
  const peer: AuthUser = { id: randomUUID(), email: "peer@example.test", role: "student" };
  const teacher: AuthUser = { id: randomUUID(), email: "other@example.test", role: "teacher" };
  const classIds: mongoose.Types.ObjectId[] = [], exerciseIds: mongoose.Types.ObjectId[] = [];
  const originalNow = Date.now;
  let passed = 0;
  async function rejects(name: string, status: number, code: string, action: () => Promise<unknown>) {
    await assert.rejects(action, error => error instanceof HttpError && error.status === status && error.code === code, name);
    passed++;
    console.log(`PASS ${name}`);
  }
  try {
    const cls = await ClassModel.create({ name: "Permissions", code: randomUUID(), teacherId: owner.id });
    const other = await ClassModel.create({ name: "Other class", code: randomUUID(), teacherId: owner.id });
    classIds.push(cls._id, other._id);
    await ClassMember.create([
      { classId: cls._id, userId: owner.id, roleInClass: "teacher" },
      { classId: cls._id, userId: student.id, roleInClass: "student" },
      { classId: cls._id, userId: peer.id, roleInClass: "student" },
      { classId: cls._id, userId: teacher.id, roleInClass: "teacher" },
      { classId: other._id, userId: owner.id, roleInClass: "teacher" },
    ]);
    const deadline = new Date("2098-01-01T00:00:00Z").getTime();
    const exercise = await Exercise.create({ classId: cls._id, title: "Boundary", dueAt: new Date(deadline), createdBy: owner.id });
    const different = await Exercise.create({ classId: other._id, title: "Different", dueAt: new Date(deadline), createdBy: owner.id });
    exerciseIds.push(exercise._id, different._id);
    const c = String(cls._id), e = String(exercise._id);
    const input = { content: "Original", url: "" };
    Date.now = () => deadline - 1;
    const submission = await SubmissionService.createSubmission(student, c, e, input);
    const s = String(submission._id);
    const edited = await SubmissionService.updateMySubmission(student, c, e, { content: "Final answer", url: "" });
    assert.equal(edited.content, "Final answer");
    assert.equal(edited.submittedAt.getTime(), deadline - 1);
    console.log("PASS submit/edit one millisecond before deadline");
    await rejects("early grade blocked", 400, "GRADING_NOT_OPEN", () => SubmissionService.putGrade(owner, c, e, s, { score: 8, feedback: "" }));
    await rejects("teacher JWT cannot submit as student member", 403, "FORBIDDEN", () => SubmissionService.createSubmission({ ...student, role: "teacher" }, c, e, input));
    await rejects("student JWT cannot use teacher membership", 403, "FORBIDDEN", () => SubmissionService.createSubmission({ ...owner, role: "student" }, c, e, input));
    await rejects("missing own submission", 404, "SUBMISSION_NOT_FOUND", () => SubmissionService.getMySubmission(peer, c, e));

    Date.now = () => deadline;
    await rejects("submit at exact deadline blocked", 400, "DEADLINE_PASSED", () => SubmissionService.createSubmission(peer, c, e, input));
    await rejects("edit at exact deadline blocked", 400, "DEADLINE_PASSED", () => SubmissionService.updateMySubmission(student, c, e, input));
    const grade = await SubmissionService.putGrade(owner, c, e, s, { score: 0, feedback: "At deadline" });
    assert.equal(grade?.score, 0);
    assert.equal(grade?.gradedAt.getTime(), deadline);
    console.log("PASS grade at exact deadline and zero score");

    await rejects("non-owner teacher cannot grade", 403, "FORBIDDEN", () => SubmissionService.putGrade(teacher, c, e, s, { score: 10, feedback: "" }));
    await rejects("non-owner teacher cannot list", 403, "FORBIDDEN", () => SubmissionService.listSubmissions(teacher, c, e));
    await rejects("non-owner teacher cannot read", 403, "FORBIDDEN", () => SubmissionService.getSubmission(teacher, c, e, s));
    await rejects("student JWT cannot grade despite ownership", 403, "FORBIDDEN", () => SubmissionService.putGrade({ ...owner, role: "student" }, c, e, s, { score: 10, feedback: "" }));
    await ClassMember.updateOne({ classId: cls._id, userId: owner.id }, { roleInClass: "student" });
    await rejects("owner needs teacher membership to grade", 403, "FORBIDDEN", () => SubmissionService.putGrade(owner, c, e, s, { score: 10, feedback: "" }));
    await ClassMember.updateOne({ classId: cls._id, userId: owner.id }, { roleInClass: "teacher" });
    await rejects("cross-class exercise blocked", 404, "EXERCISE_NOT_FOUND", () => SubmissionService.listSubmissions(owner, c, String(different._id)));
    await rejects("cross-exercise submission read blocked", 404, "SUBMISSION_NOT_FOUND", () => SubmissionService.getSubmission(owner, String(other._id), String(different._id), s));
    await rejects("cross-exercise grading blocked", 404, "SUBMISSION_NOT_FOUND", () => SubmissionService.putGrade(owner, String(other._id), String(different._id), s, { score: 10, feedback: "" }));
    await rejects("missing class", 404, "CLASS_NOT_FOUND", () => SubmissionService.listSubmissions(owner, String(new mongoose.Types.ObjectId()), e));
    await rejects("malformed exercise ID", 400, "INVALID_ID", () => SubmissionService.listSubmissions(owner, c, "bad"));
    await rejects("peer cannot read graded work", 403, "FORBIDDEN", () => SubmissionService.getSubmission(peer, c, e, s));
    await ClassMember.deleteOne({ classId: cls._id, userId: student.id });
    await rejects("removed member cannot read their own work", 403, "FORBIDDEN", () => SubmissionService.getMySubmission(student, c, e));
    const stored = await Submission.findById(s).lean();
    const storedGrade = await Grade.findOne({ submissionId: s }).lean();
    assert.equal(stored?.content, "Final answer");
    assert.equal(storedGrade?.score, 0);
    console.log(`LMS-09 boundaries: ${passed} rejection cases and deadline/persistence assertions passed.`);
  } finally {
    Date.now = originalNow;
    const submissions = await Submission.find({ exerciseId: { $in: exerciseIds } }).select("_id");
    await Grade.deleteMany({ submissionId: { $in: submissions.map(s => s._id) } });
    await Submission.deleteMany({ exerciseId: { $in: exerciseIds } });
    await Exercise.deleteMany({ _id: { $in: exerciseIds } });
    await ClassMember.deleteMany({ classId: { $in: classIds } });
    await ClassModel.deleteMany({ _id: { $in: classIds } });
    await mongoose.disconnect();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
