import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import {
  ClassMember,
  ClassModel,
  Exercise,
  Grade,
  Submission,
  Task,
} from "../models/index.js";
import { CalendarService } from "../services/calendar.service.js";

const mongoUri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms29_test_calendar";

function signTestToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    {
      issuer: "lms-auth-service",
      audience: "lms-core-api",
      expiresIn: "1h",
    }
  );
}

async function requestJson(
  server: http.Server,
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server not listening");

  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method,
        path,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = {};
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode ?? 500, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("=== BẮT ĐẦU TEST TÍCH HỢP CHO LMS-29 (CALENDAR & DEADLINE AGENDA) ===");
  await mongoose.connect(mongoUri);

  // Dọn dẹp dữ liệu cũ trong DB test
  await Promise.all([
    ClassModel.deleteMany({}),
    ClassMember.deleteMany({}),
    Exercise.deleteMany({}),
    Submission.deleteMany({}),
    Grade.deleteMany({}),
    Task.deleteMany({}),
  ]);

  const teacher: AuthUser = { id: "teacher_29_1", email: "teacher29@lms.local", role: "teacher" };
  const studentA: AuthUser = { id: "student_29_A", email: "studentA@lms.local", role: "student" };
  const studentB: AuthUser = { id: "student_29_B", email: "studentB@lms.local", role: "student" };

  console.log("1. Thiết lập dữ liệu mẫu (Classes, Exercises, Tasks)...");

  // Tạo Lớp học 1 (Teacher tạo, Student A tham gia)
  const class1 = await ClassModel.create({
    name: "Lớp Di động LMS29",
    code: "LMS29A",
    teacherId: teacher.id,
  });
  await ClassMember.create({
    classId: class1._id,
    userId: studentA.id,
    roleInClass: "student",
  });

  // Tạo Lớp học 2 (Teacher tạo, Student B tham gia)
  const class2 = await ClassModel.create({
    name: "Lớp Mạng máy tính",
    code: "NET29B",
    teacherId: teacher.id,
  });
  await ClassMember.create({
    classId: class2._id,
    userId: studentB.id,
    roleInClass: "student",
  });

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Tạo 2 Bài tập cho Lớp 1:
  // Exercise 1: Hạn 3 ngày tới
  const ex1 = await Exercise.create({
    classId: class1._id,
    title: "Bài tập 1: React Native Layout",
    description: "Làm theo hướng dẫn",
    dueAt: new Date(now + 3 * dayMs),
    createdBy: teacher.id,
  });

  // Exercise 2: Đã quá hạn 2 ngày trước
  const ex2 = await Exercise.create({
    classId: class1._id,
    title: "Bài tập 2: Setup Expo",
    description: "Nộp link repo",
    dueAt: new Date(now - 2 * dayMs),
    createdBy: teacher.id,
  });

  // Tạo 1 Bài tập cho Lớp 2 (Hạn 5 ngày tới)
  const ex3 = await Exercise.create({
    classId: class2._id,
    title: "Bài tập mạng: Cấu hình Socket",
    description: "Lớp 2 chỉ student B thấy",
    dueAt: new Date(now + 5 * dayMs),
    createdBy: teacher.id,
  });

  // Student A nộp bài cho Exercise 2 và được chấm điểm 9.5
  const subA = await Submission.create({
    exerciseId: ex2._id,
    studentId: studentA.id,
    content: "Đã hoàn thành repo https://github.com",
    submittedAt: new Date(now - 3 * dayMs),
  });
  await Grade.create({
    submissionId: subA._id,
    score: 9.5,
    feedback: "Rất tốt!",
    gradedBy: teacher.id,
  });

  // Tạo 2 Task cá nhân cho Student A:
  // Task 1: Chưa xong, hạn ngày mai
  const taskA1 = await Task.create({
    userId: studentA.id,
    title: "Ôn tập thi giữa kỳ",
    priority: "high",
    status: "todo",
    dueDate: new Date(now + 1 * dayMs),
    classId: class1._id,
  });

  // Task 2: Đã hoàn thành
  const taskA2 = await Task.create({
    userId: studentA.id,
    title: "Mua sổ ghi chép",
    priority: "low",
    status: "completed",
    dueDate: new Date(now + 2 * dayMs),
  });

  // Tạo 1 Task riêng tư cho Student B
  const taskB = await Task.create({
    userId: studentB.id,
    title: "Việc riêng của Student B",
    priority: "medium",
    status: "todo",
    dueDate: new Date(now + 1 * dayMs),
  });

  console.log("2. Kiểm tra Service boundaries:");

  // Test sai khoảng ngày
  await assert.rejects(
    async () => {
      await CalendarService.listEvents(studentA, { from: "ngay_sai" });
    },
    (err: any) => err instanceof HttpError && err.status === 400
  );
  console.log("   ✓ Mốc thời gian sai định dạng bị từ chối (400)");

  await assert.rejects(
    async () => {
      await CalendarService.listEvents(studentA, {
        from: new Date(now + 5 * dayMs).toISOString(),
        to: new Date(now + 1 * dayMs).toISOString(),
      });
    },
    (err: any) => err instanceof HttpError && err.status === 400
  );
  console.log("   ✓ from > to bị từ chối (400)");

  // Test phân lập lớp học: Student A lọc theo class2 của B -> 403
  await assert.rejects(
    async () => {
      await CalendarService.listEvents(studentA, { classId: class2._id.toString() });
    },
    (err: any) => err instanceof HttpError && err.status === 403
  );
  console.log("   ✓ Lọc lớp không thuộc về mình bị chặn (403)");

  // Student A lấy lịch trình
  const resA = await CalendarService.listEvents(studentA);
  assert.equal(resA.summary.total, 4, "Student A phải có 4 sự kiện (2 bài tập lớp 1 + 2 task của mình)");
  assert.equal(resA.summary.exercises, 2, "2 bài tập");
  assert.equal(resA.summary.tasks, 2, "2 task cá nhân");
  console.log("   ✓ Student A thấy đúng 4 sự kiện, không bị lẫn bài tập lớp 2 hay task của Student B");

  // Kiểm tra chi tiết bài tập đã nộp & có điểm
  const gradedExEvent = resA.events.find((e) => e.exerciseId === ex2._id.toString());
  assert.ok(gradedExEvent, "Tìm thấy sự kiện Exercise 2");
  assert.equal(gradedExEvent.status, "graded", "Trạng thái bài tập là graded");
  assert.equal(gradedExEvent.grade, 9.5, "Điểm bài tập là 9.5");
  console.log("   ✓ Trạng thái nộp bài và điểm số được trích xuất chính xác");

  // Kiểm tra bài tập chưa nộp và quá hạn
  const pendingExEvent = resA.events.find((e) => e.exerciseId === ex1._id.toString());
  assert.ok(pendingExEvent);
  assert.equal(pendingExEvent.status, "pending");
  assert.equal(pendingExEvent.isOverdue, false);
  console.log("   ✓ Trạng thái chưa nộp (pending) tính toán chính xác");

  // Student B lấy lịch trình
  const resB = await CalendarService.listEvents(studentB);
  assert.equal(resB.summary.total, 2, "Student B có 1 bài tập lớp 2 + 1 task riêng");
  assert.equal(resB.summary.exercises, 1);
  assert.equal(resB.summary.tasks, 1);
  console.log("   ✓ Student B chỉ thấy sự kiện của mình");

  // Teacher lấy lịch trình
  const resTeacher = await CalendarService.listEvents(teacher);
  assert.equal(resTeacher.summary.exercises, 3, "Teacher thấy cả 3 bài tập của cả 2 lớp mình dạy");
  console.log("   ✓ Teacher thấy tổng hợp bài tập của tất cả các lớp đang dạy");

  console.log("3. Kiểm tra HTTP Express Routes:");
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const tokenA = signTestToken(studentA);

    // Không có token -> 401
    const unauthRes = await requestJson(server, "GET", "/calendar/events");
    assert.equal(unauthRes.status, 401, "Thiếu token phải trả về 401");
    console.log("   ✓ GET /calendar/events không có token trả về 401");

    // Có token -> 200
    const authRes = await requestJson(server, "GET", "/calendar/events", tokenA);
    assert.equal(authRes.status, 200);
    assert.equal(authRes.body.success, true);
    assert.equal(authRes.body.events.length, 4);
    assert.ok(authRes.body.summary);
    console.log("   ✓ GET /calendar/events trả về 200 kèm events và summary đầy đủ");

    // Lọc theo type=exercise -> chỉ 2 bài tập
    const filterExRes = await requestJson(server, "GET", "/calendar/events?type=exercise", tokenA);
    assert.equal(filterExRes.status, 200);
    assert.equal(filterExRes.body.events.length, 2);
    assert.ok(filterExRes.body.events.every((e: any) => e.type === "exercise"));
    console.log("   ✓ Lọc ?type=exercise lọc đúng sự kiện bài tập");

    // Lọc theo type=task -> chỉ 2 task
    const filterTaskRes = await requestJson(server, "GET", "/calendar/events?type=task", tokenA);
    assert.equal(filterTaskRes.status, 200);
    assert.equal(filterTaskRes.body.events.length, 2);
    assert.ok(filterTaskRes.body.events.every((e: any) => e.type === "task"));
    console.log("   ✓ Lọc ?type=task lọc đúng task cá nhân");
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log("\n=== TẤT CẢ CÁC KIỂM THỬ LMS-29 ĐỀU ĐẠT (PASS) ===");
}

run().catch((err) => {
  console.error("LMS-29 Test Thất Bại:", err);
  process.exit(1);
});
