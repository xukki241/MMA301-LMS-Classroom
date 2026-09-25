import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ClassModel, ClassMember, Exercise, Submission, Grade } from "../models/index.js";

// Real HTTP + Mongo tests. Only this run's fixtures are removed.
const uri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms09_test_http";
const location = new URL(uri);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(location.hostname));
assert.match(location.pathname, /^\/lms09_test_[a-z0-9_]+$/);
process.env.MONGO_URI = uri;
process.env.JWT_SECRET = "lms09-local-test-secret-at-least-32-characters";
process.env.NODE_ENV = "test";
const { createApp } = await import("../app.js");
const stage = Number(process.env.LMS09_TEST_STAGE ?? 3);

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Submission.init(), Grade.init()]);
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const classIds: mongoose.Types.ObjectId[] = [];
  const exerciseIds: mongoose.Types.ObjectId[] = [];
  const token = (id: string, role = "student") => jwt.sign({ email: `${id}@example.test`, role }, process.env.JWT_SECRET!, {
    subject: id, issuer: "lms-auth-service", audience: "lms-core-api", expiresIn: "10m",
  });
  // Optional real Auth login. Use only an Auth service with a disposable test database
  // and the test secret above; these temporary accounts stay in that test database.
  async function account(role: "teacher" | "student") {
    if (!process.env.AUTH_URL) {
      const id = randomUUID();
      return { id, token: token(id, role) };
    }
    const authUrl = new URL(process.env.AUTH_URL);
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(authUrl.hostname));
    const body = { email: `lms09-${randomUUID()}@example.test`, password: `Test-${randomUUID()}!`, role, displayName: "LMS09 test" };
    const registered = await fetch(`${authUrl.origin}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    assert.equal(registered.status, 201);
    await registered.text();
    const loggedIn = await fetch(`${authUrl.origin}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email, password: body.password }), signal: AbortSignal.timeout(5000) });
    assert.equal(loggedIn.status, 200);
    const data = await loggedIn.json() as { token: string; user: { id: string } };
    return { id: data.user.id, token: data.token };
  }
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
    const result = JSON.parse(text);
    if (expected >= 400) {
      assert.equal(typeof result.error, "string");
      assert.equal(typeof result.code, "string");
    }
    passed++;
    return result;
  }
  try {
    const ownerAccount = await account("teacher"), studentAccount = await account("student"), peerAccount = await account("student");
    const owner = ownerAccount.id, student = studentAccount.id, peer = peerAccount.id, outsider = randomUUID();
    const teacherToken = ownerAccount.token, studentToken = studentAccount.token, peerToken = peerAccount.token;
    const cls = await ClassModel.create({ name: "LMS09 HTTP", code: randomUUID(), teacherId: owner });
    classIds.push(cls._id);
    await ClassMember.create([
      { classId: cls._id, userId: owner, roleInClass: "teacher" },
      { classId: cls._id, userId: student, roleInClass: "student" },
      { classId: cls._id, userId: peer, roleInClass: "student" },
    ]);
    const other = await ClassModel.create({ name: "Other", code: randomUUID(), teacherId: outsider });
    classIds.push(other._id);
    const exercise = await Exercise.create({ classId: cls._id, title: "Test", dueAt: new Date(Date.now() + 600_000), createdBy: owner });
    exerciseIds.push(exercise._id);
    const base = `/classes/${cls._id}/exercises/${exercise._id}/submissions`;
    const answer = { content: "My answer", url: "" };

    const created = await request("POST", base, 201, studentToken, answer);
    const id = created.submission._id;
    assert.equal(created.submission.studentId, student);
    assert.equal(created.submission.exerciseId, String(exercise._id));
    await request("POST", base, 409, studentToken, answer);
    const edited = await request("PUT", base + "/mine", 200, studentToken, { content: "Revised answer", url: "https://example.test/work" });
    assert.equal(edited.submission._id, id);
    assert.equal(edited.submission.content, "Revised answer");
    await request("PUT", base + "/mine", 200, studentToken, { content: "Revised answer", url: "https://example.test/work" });
    assert.equal(await Submission.countDocuments({ exerciseId: exercise._id, studentId: student }), 1);
    await request("PUT", base + "/mine", 404, peerToken, answer);
    await request("POST", base, 401, undefined, answer);
    await request("POST", base, 403, teacherToken, answer);
    await request("POST", base, 403, token(outsider), answer);
    for (const body of [{}, { content: "  " }, { url: "javascript:alert(1)" }, { content: "x", studentId: outsider }, { content: "x".repeat(10001) }, { url: "https://example.test/" + "a".repeat(2048) }]) {
      await request("POST", base, 422, peerToken, body);
    }
    const races = await Promise.all([
      fetch(origin + base, { method: "POST", headers: { Authorization: `Bearer ${peerToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://example.test/work" }) }),
      fetch(origin + base, { method: "POST", headers: { Authorization: `Bearer ${peerToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://example.test/work" }) }),
    ]);
    assert.deepEqual(races.map(r => r.status).sort(), [201, 409]);
    await Promise.all(races.map(r => r.text()));
    assert.equal(await Submission.countDocuments({ exerciseId: exercise._id, studentId: peer }), 1);
    await request("POST", base.replace(String(cls._id), "bad-id"), 400, studentToken, answer);
    await request("POST", base.replace(String(exercise._id), String(new mongoose.Types.ObjectId())), 404, studentToken, answer);
    await request("POST", base.replace(String(cls._id), String(other._id)), 403, studentToken, answer);
    await Exercise.updateOne({ _id: exercise._id }, { dueAt: new Date(Date.now() - 1000) });
    await request("POST", base, 400, studentToken, answer);
    await request("PUT", base + "/mine", 400, studentToken, answer);
    console.log("PASS submission create/edit, validation, deadline, roles, duplicate/concurrent POST");

    if (stage >= 2) {
      const mine = await request("GET", base + "/mine", 200, studentToken);
      assert.equal(mine.submission.content, "Revised answer");
      assert.equal(mine.grade, null);
      await request("GET", base + "/mine", 403, token(owner, "student"));
    }
    if (stage >= 2) {
      await request("GET", base + "/" + id, 200, studentToken);
      await request("GET", base + "/" + id, 200, teacherToken);
      await request("GET", base + "/" + id, 403, peerToken);
      await request("GET", base + "/" + id, 403, token(outsider));
      await request("GET", base, 403, studentToken);
      const listed = await request("GET", base, 200, teacherToken);
      assert.equal(listed.submissions.length, 2);
      assert.ok(listed.submissions.every((s: { grade: unknown }) => s.grade === null));
      await request("GET", base + "/bad-id", 400, teacherToken);
      await request("GET", base + "/" + new mongoose.Types.ObjectId(), 404, teacherToken);
      console.log("PASS own read, teacher list, nested resource checks and grade null");
    }
    if (stage >= 3) {
      const path = `${base}/${id}/grade`;
      await request("PUT", path, 403, studentToken, { score: 8 });
      await ClassMember.create({ classId: cls._id, userId: outsider, roleInClass: "teacher" });
      await request("PUT", path, 403, token(outsider, "teacher"), { score: 8 });
      for (const body of [{ score: -1 }, { score: 11 }, { score: "8" }, {}, { score: null }, { score: 8, gradedBy: outsider }, { score: 8, feedback: "x".repeat(10001) }]) {
        await request("PUT", path, 422, teacherToken, body);
      }
      await Exercise.updateOne({ _id: exercise._id }, { dueAt: new Date(Date.now() + 600_000) });
      await request("PUT", path, 400, teacherToken, { score: 8 });
      await Exercise.updateOne({ _id: exercise._id }, { dueAt: new Date(Date.now() - 1000) });
      const results = await Promise.all([
        request("PUT", path, 200, teacherToken, { score: 0, feedback: "Zero" }),
        request("PUT", path, 200, teacherToken, { score: 10, feedback: "Ten" }),
      ]);
      assert.equal(results[0].grade._id, results[1].grade._id);
      assert.equal(await Grade.countDocuments({ submissionId: id }), 1);
      const concurrentGrade = await Grade.findOne({ submissionId: id }).lean();
      assert.ok(concurrentGrade);
      assert.ok((concurrentGrade.score === 0 && concurrentGrade.feedback === "Zero") || (concurrentGrade.score === 10 && concurrentGrade.feedback === "Ten"));
      const updated = await request("PUT", path, 200, teacherToken, { score: 8.5, feedback: "Good explanation" });
      assert.equal(updated.grade._id, results[0].grade._id);
      assert.equal(updated.grade.gradedBy, owner);
      const read = await request("GET", base + "/mine", 200, studentToken);
      assert.equal(read.grade.score, 8.5);
      assert.equal(read.grade.feedback, "Good explanation");
      const listed = await request("GET", base, 200, teacherToken);
      assert.equal(listed.submissions.find((s: { _id: string }) => s._id === id).grade.score, 8.5);
      console.log("PASS grade boundaries, permissions, early grading, concurrent upserts and persistence");
    }
    console.log(`LMS-09 HTTP: ${passed} requests checked; all assertions passed (stage ${stage}, ${process.env.AUTH_URL ? "real Auth login" : "local test JWTs"}).`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
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
