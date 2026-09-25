import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ClassModel, ClassMember, Exercise } from "../models/index.js";
import { ExerciseService } from "../services/exercise.service.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";

// Direct service integration exercises inconsistent role/ownership records that normal
// registration cannot create. Only records created by this run are removed in finally.
const uri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms08_test_permissions";
const parsed = new URL(uri);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname));
assert.match(parsed.pathname, /^\/lms08_test_[a-z0-9_]+$/);

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const owner: AuthUser = { id: randomUUID(), email: "owner@example.test", role: "teacher" };
  const other: AuthUser = { id: randomUUID(), email: "other@example.test", role: "teacher" };
  let classId: mongoose.Types.ObjectId | undefined;
  try {
    const cls = await ClassModel.create({ name: "LMS08 permission boundaries", teacherId: owner.id, code: randomUUID() });
    classId = cls._id;
    const membership = await ClassMember.create({ classId, userId: owner.id, roleInClass: "teacher" });
    const input = { title: "Boundary", description: "", dueAt: new Date(Date.now() + 86_400_000).toISOString() };
    const forbidden = (error: unknown) => error instanceof HttpError && error.status === 403;
    await assert.rejects(ExerciseService.createExercise({ ...owner, role: "student" }, String(classId), input), forbidden);
    console.log("PASS JWT student role denied even with teacher membership and class ownership");
    membership.roleInClass = "student";
    await membership.save();
    await assert.rejects(ExerciseService.createExercise(owner, String(classId), input), forbidden);
    console.log("PASS owner with non-teacher membership denied");
    await ClassMember.create({ classId, userId: other.id, roleInClass: "teacher" });
    await assert.rejects(ExerciseService.createExercise(other, String(classId), input), forbidden);
    console.log("PASS teacher membership without ownership denied");
    membership.roleInClass = "teacher";
    await membership.save();
    const originalNow = Date.now;
    const boundary = new Date("2098-01-01T00:00:00Z").getTime();
    try {
      Date.now = () => boundary;
      await assert.rejects(ExerciseService.createExercise(owner, String(classId), { ...input, dueAt: "2098-01-01T00:00:00Z" }),
        (error: unknown) => error instanceof HttpError && error.status === 400);
    } finally {
      Date.now = originalNow;
    }
    console.log("PASS deadline exactly at server time rejected");
    assert.equal(await Exercise.countDocuments({ classId }), 0);
    await ExerciseService.createExercise(owner, String(classId), input);
    assert.equal(await Exercise.countDocuments({ classId }), 1);
    console.log("PASS rejected writes persist nothing; valid owner still creates");
    console.log("LMS-08 permission boundaries: 5 passed, 0 failed");
  } finally {
    if (classId) {
      await Exercise.deleteMany({ classId });
      await ClassMember.deleteMany({ classId });
      await ClassModel.deleteOne({ _id: classId });
    }
    await mongoose.disconnect();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
