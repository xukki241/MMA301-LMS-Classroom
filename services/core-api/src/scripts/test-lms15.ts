import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ClassModel, ClassMember, ClassSession, Exam, Exercise, Submission, Grade } from "../models/index.js";

// LMS-15: lịch học, kỳ kiểm tra, tên thành viên, gỡ học sinh, tổng quan, sửa tài liệu.
const uri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms15_test_http";
const location = new URL(uri);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(location.hostname));
assert.match(location.pathname, /^\/lms15_test_[a-z0-9_]+$/);
process.env.MONGO_URI = uri;
process.env.JWT_SECRET = "lms15-local-test-secret-at-least-32-characters";
process.env.NODE_ENV = "test";
const { createApp } = await import("../app.js");

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const classIds: mongoose.Types.ObjectId[] = [];
  const sign = (id: string, role: string, name: string) =>
    jwt.sign({ email: `${id}@example.test`, role, name }, process.env.JWT_SECRET!, {
      subject: id, issuer: "lms-auth-service", audience: "lms-core-api", expiresIn: "10m",
    });
  let passed = 0;
  async function request(method: string, path: string, expected: number, auth?: string, body?: unknown) {
    const response = await fetch(origin + path, {
      method,
      headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    assert.equal(response.status, expected, `${method} ${path}: ${text}`);
    passed++;
    return JSON.parse(text);
  }

  try {
    const owner = randomUUID(), student = randomUUID(), peer = randomUUID(), outsider = randomUUID();
    const teacherToken = sign(owner, "teacher", "Cô Lan");
    const studentToken = sign(student, "student", "An Nguyen");
    const peerToken = sign(peer, "student", "Binh Tran");
    const outsiderToken = sign(outsider, "student", "Out Sider");

    const cls = await ClassModel.create({ name: "LMS15", code: randomUUID().slice(0, 6), teacherId: owner });
    classIds.push(cls._id);
    await ClassMember.create([
      { classId: cls._id, userId: owner, roleInClass: "teacher" },
      { classId: cls._id, userId: student, roleInClass: "student" },
      { classId: cls._id, userId: peer, roleInClass: "student" },
    ]);
    const base = `/classes/${cls._id}`;

    // Tên thành viên: đồng bộ lười khi mở danh sách.
    await request("GET", `${base}/members`, 200, studentToken);
    await request("GET", `${base}/members`, 200, teacherToken);
    const members = (await request("GET", `${base}/members`, 200, studentToken)).members as { userId: string; displayName: string }[];
    assert.equal(members.find((m) => m.userId === student)?.displayName, "An Nguyen");
    assert.equal(members.find((m) => m.userId === owner)?.displayName, "Cô Lan");

    // Lịch học hằng tuần.
    const session = { weekday: 2, startTime: "07:30", endTime: "09:30", room: "A101" };
    await request("POST", `${base}/sessions`, 403, studentToken, session);
    await request("POST", `${base}/sessions`, 401, undefined, session);
    await request("POST", `${base}/sessions`, 422, teacherToken, { ...session, weekday: 9 });
    await request("POST", `${base}/sessions`, 422, teacherToken, { ...session, startTime: "7:30" });
    await request("POST", `${base}/sessions`, 400, teacherToken, { ...session, endTime: "07:00" });
    const created = await request("POST", `${base}/sessions`, 201, teacherToken, session);
    assert.equal(created.session.room, "A101");
    await request("GET", `${base}/sessions`, 403, outsiderToken);
    const sessions = await request("GET", `${base}/sessions`, 200, studentToken);
    assert.equal(sessions.sessions.length, 1);
    await request("DELETE", `${base}/sessions/${created.session._id}`, 403, studentToken);

    // Kỳ kiểm tra.
    const exam = { title: "Giữa kỳ", startsAt: new Date(Date.now() + 3 * 86400_000).toISOString(), durationMinutes: 60, room: "B2" };
    await request("POST", `${base}/exams`, 403, studentToken, exam);
    await request("POST", `${base}/exams`, 400, teacherToken, { ...exam, startsAt: new Date(Date.now() - 1000).toISOString() });
    await request("POST", `${base}/exams`, 422, teacherToken, { ...exam, durationMinutes: 0 });
    const createdExam = await request("POST", `${base}/exams`, 201, teacherToken, exam);
    assert.equal((await request("GET", `${base}/exams`, 200, peerToken)).exams.length, 1);

    // Bài tập + điểm cho tổng quan.
    const exercise = await Exercise.create({ classId: cls._id, title: "BT1", dueAt: new Date(Date.now() - 3600_000), createdBy: owner });
    const open = await Exercise.create({ classId: cls._id, title: "BT2", dueAt: new Date(Date.now() + 86400_000), createdBy: owner });
    const submission = await Submission.create({ exerciseId: exercise._id, studentId: student, content: "ok" });
    await Grade.create({ submissionId: submission._id, score: 8.5, feedback: "Tốt", gradedBy: owner });
    await Submission.create({ exerciseId: exercise._id, studentId: peer, content: "late" });

    const studentView = await request("GET", "/me/overview", 200, studentToken);
    assert.equal(studentView.role, "student");
    assert.equal(studentView.classes.length, 1);
    assert.equal(studentView.sessions[0].className, "LMS15");
    assert.equal(studentView.exams.length, 1);
    const byTitle = (rows: { title: string }[], title: string) => rows.find((r) => r.title === title)! as unknown;
    assert.equal((byTitle(studentView.work, "BT1") as { status: string }).status, "graded");
    assert.equal((byTitle(studentView.work, "BT1") as { score: number }).score, 8.5);
    assert.equal((byTitle(studentView.work, "BT2") as { status: string }).status, "todo");
    const peerView = await request("GET", "/me/overview", 200, peerToken);
    assert.equal((byTitle(peerView.work, "BT1") as { status: string }).status, "submitted");
    const outsiderView = await request("GET", "/me/overview", 200, outsiderToken);
    assert.deepEqual(outsiderView.work, []);
    const teacherView = await request("GET", "/me/overview", 200, teacherToken);
    const t1 = byTitle(teacherView.work, "BT1") as { status: string; submissionCount: number; gradedCount: number };
    assert.equal(t1.status, "needs_grading");
    assert.equal(t1.submissionCount, 2);
    assert.equal(t1.gradedCount, 1);
    assert.equal((byTitle(teacherView.work, "BT2") as { status: string }).status, "open");
    await request("GET", "/me/overview", 401);

    // Tài liệu: sửa.
    const material = await request("POST", `${base}/materials`, 201, teacherToken, { title: "Slide 1", url: "https://example.com/a" });
    const mid = material.material._id;
    await request("PATCH", `${base}/materials/${mid}`, 403, studentToken, { title: "Hack" });
    await request("PATCH", `${base}/materials/${mid}`, 400, teacherToken, { url: "ftp://bad" });
    const patched = await request("PATCH", `${base}/materials/${mid}`, 200, teacherToken, { title: "Slide 1 v2" });
    assert.equal(patched.material.title, "Slide 1 v2");
    assert.equal(patched.material.url, "https://example.com/a");

    // Gỡ học sinh + xóa lịch.
    await request("DELETE", `${base}/members/${peer}`, 403, studentToken);
    await request("DELETE", `${base}/members/${owner}`, 400, teacherToken);
    await request("DELETE", `${base}/members/${outsider}`, 404, teacherToken);
    await request("DELETE", `${base}/members/${peer}`, 200, teacherToken);
    await request("GET", `${base}/members`, 403, peerToken);
    await request("DELETE", `${base}/sessions/${created.session._id}`, 200, teacherToken);
    await request("DELETE", `${base}/exams/${createdExam.exam._id}`, 200, teacherToken);
    await request("DELETE", `${base}/exams/${createdExam.exam._id}`, 404, teacherToken);
    void open;
  } finally {
    await Promise.all([
      ClassSession.deleteMany({ classId: { $in: classIds } }),
      Exam.deleteMany({ classId: { $in: classIds } }),
      ClassMember.deleteMany({ classId: { $in: classIds } }),
      ClassModel.deleteMany({ _id: { $in: classIds } }),
    ]);
    await mongoose.connection.dropDatabase();
    server.close();
    await mongoose.disconnect();
  }
  console.log(`LMS-15 OK (${passed} requests)`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
