import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Task } from "../models/index.js";
import { TaskService } from "../services/task.service.js";

const mongoUri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms28_test_tasks";

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
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
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
  console.log("=== BẮT ĐẦU TEST TÍCH HỢP & PERMISSIONS CHO LMS-28 (PERSONAL TASKS) ===");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const userA: AuthUser = { id: randomUUID(), email: "student_a@test.local", role: "student" };
  const userB: AuthUser = { id: randomUUID(), email: "student_b@test.local", role: "student" };
  const teacherA: AuthUser = { id: randomUUID(), email: "teacher_a@test.local", role: "teacher" };

  let testClassId: mongoose.Types.ObjectId | undefined;
  let server: http.Server | undefined;

  try {
    // 0. Tạo lớp test để kiểm tra liên kết classId
    const testClass = await ClassModel.create({
      name: "LMS-28 Test Class",
      code: randomUUID().slice(0, 6).toUpperCase(),
      teacherId: teacherA.id,
    });
    testClassId = testClass._id;
    await ClassMember.create({ classId: testClassId, userId: userA.id, roleInClass: "student" });

    const forbidden = (err: unknown) => err instanceof HttpError && err.status === 403;
    const badRequest = (err: unknown) => err instanceof HttpError && err.status === 400;
    const notFound = (err: unknown) => err instanceof HttpError && err.status === 404;

    // --- PHASE 1: DIRECT SERVICE LOGIC & PERMISSION BOUNDARIES ---
    console.log("1. Kiểm tra Service boundaries:");

    // 1.1 Ràng buộc validate khi tạo Task
    await assert.rejects(
      TaskService.createTask(userA, { title: " " }),
      badRequest
    );
    console.log("   ✓ Tiêu đề rỗng bị từ chối (400)");

    await assert.rejects(
      TaskService.createTask(userA, { title: "x" }),
      badRequest
    );
    console.log("   ✓ Tiêu đề dưới 2 ký tự bị từ chối (400)");

    await assert.rejects(
      TaskService.createTask(userA, { title: "Hợp lệ", dueDate: "invalid-date" }),
      badRequest
    );
    console.log("   ✓ Ngày hạn không hợp lệ bị từ chối (400)");

    // User B không thuộc lớp testClassId thì không được gắn classId đó vào task
    await assert.rejects(
      TaskService.createTask(userB, { title: "Task lớp", classId: String(testClassId) }),
      forbidden
    );
    console.log("   ✓ Không phải thành viên lớp thì không được gắn classId vào Task (403)");

    // 1.2 User A tạo Task hợp lệ
    const taskA1 = await TaskService.createTask(userA, {
      title: "Làm bài tập React Native",
      description: "Đọc tài liệu AsyncStorage",
      dueDate: new Date(Date.now() + 86400000), // Ngày mai
      priority: "high",
      status: "todo",
      classId: String(testClassId),
    });
    assert.equal(taskA1.title, "Làm bài tập React Native");
    assert.equal(taskA1.priority, "high");
    assert.equal(taskA1.status, "todo");
    console.log("   ✓ User A tạo Task thành công");

    const taskA2 = await TaskService.createTask(userA, {
      title: "Chuẩn bị bài thuyết trình",
      priority: "medium",
      status: "in_progress",
    });

    // 1.3 Phân lập dữ liệu: User B gọi listTasks KHÔNG thấy task của User A
    const listB = await TaskService.listTasks(userB);
    assert.equal(listB.length, 0);
    console.log("   ✓ Phân lập dữ liệu: User B không thấy task của User A");

    // User A gọi listTasks thấy đủ 2 task
    const listA = await TaskService.listTasks(userA);
    assert.equal(listA.length, 2);
    console.log("   ✓ User A lấy đúng danh sách 2 task của mình");

    // 1.4 Bảo vệ truy cập chi tiết / sửa / xóa chéo
    await assert.rejects(
      TaskService.getTaskById(userB, String(taskA1._id)),
      forbidden
    );
    console.log("   ✓ User B bị chặn xem chi tiết task của User A (403)");

    await assert.rejects(
      TaskService.updateTask(userB, String(taskA1._id), { title: "Hack task" }),
      forbidden
    );
    console.log("   ✓ User B bị chặn sửa task của User A (403)");

    await assert.rejects(
      TaskService.toggleTaskStatus(userB, String(taskA1._id)),
      forbidden
    );
    console.log("   ✓ User B bị chặn toggle task của User A (403)");

    await assert.rejects(
      TaskService.deleteTask(userB, String(taskA1._id)),
      forbidden
    );
    console.log("   ✓ User B bị chặn xóa task của User A (403)");

    // 1.5 User A cập nhật & toggle task của mình
    const updatedA1 = await TaskService.updateTask(userA, String(taskA1._id), {
      title: "Làm bài tập React Native (Đã sửa tiêu đề)",
      priority: "low",
    });
    assert.equal(updatedA1.title, "Làm bài tập React Native (Đã sửa tiêu đề)");
    assert.equal(updatedA1.priority, "low");
    console.log("   ✓ User A cập nhật task thành công");

    const toggledA1 = await TaskService.toggleTaskStatus(userA, String(taskA1._id));
    assert.equal(toggledA1.status, "completed");
    console.log("   ✓ User A toggle hoàn thành task (todo -> completed)");

    const toggledBack = await TaskService.toggleTaskStatus(userA, String(taskA1._id));
    assert.equal(toggledBack.status, "todo");
    console.log("   ✓ User A toggle lại task (completed -> todo)");

    // 1.6 Kiểm tra filter
    const pendingOnly = await TaskService.listTasks(userA, { status: "pending" });
    assert.equal(pendingOnly.length, 2);

    const classOnly = await TaskService.listTasks(userA, { classId: String(testClassId) });
    assert.equal(classOnly.length, 1);
    assert.equal(classOnly[0].title, "Làm bài tập React Native (Đã sửa tiêu đề)");
    console.log("   ✓ Lọc task theo classId và status chính xác");

    // --- PHASE 2: HTTP EXPRESS ROUTES INTEGRATION ---
    console.log("\n2. Kiểm tra HTTP Express Routes:");
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, resolve));

    const tokenA = signTestToken(userA);
    const tokenB = signTestToken(userB);

    // 2.1 Chưa gửi token -> 401
    const unauthRes = await requestJson(server, "GET", "/tasks");
    assert.equal(unauthRes.status, 401);
    console.log("   ✓ GET /tasks không có token trả về 401");

    // 2.2 GET /tasks hợp lệ -> 200
    const listRes = await requestJson(server, "GET", "/tasks", tokenA);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.equal(listRes.body.tasks.length, 2);
    console.log("   ✓ GET /tasks có token trả về 200 kèm danh sách");

    // 2.3 POST /tasks -> 201
    const createRes = await requestJson(server, "POST", "/tasks", tokenA, {
      title: "Task tạo qua HTTP",
      description: "Mô tả test",
      priority: "high",
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    const httpTaskId = createRes.body.task._id;
    console.log("   ✓ POST /tasks trả về 201 Created");

    // 2.4 User B truy cập task của User A qua HTTP -> 403
    const getOtherRes = await requestJson(server, "GET", `/tasks/${httpTaskId}`, tokenB);
    assert.equal(getOtherRes.status, 403);
    console.log("   ✓ User B GET /tasks/:id của User A trả về 403 Forbidden");

    // 2.5 PATCH /tasks/:id/toggle -> 200
    const toggleRes = await requestJson(server, "PATCH", `/tasks/${httpTaskId}/toggle`, tokenA);
    assert.equal(toggleRes.status, 200);
    assert.equal(toggleRes.body.task.status, "completed");
    console.log("   ✓ PATCH /tasks/:id/toggle trả về 200 và chuyển trạng thái");

    // 2.6 DELETE /tasks/:id -> 200
    const deleteRes = await requestJson(server, "DELETE", `/tasks/${httpTaskId}`, tokenA);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
    console.log("   ✓ DELETE /tasks/:id trả về 200");

    // Kiểm tra đã xóa thật trong DB
    const deletedCheck = await Task.findById(httpTaskId);
    assert.equal(deletedCheck, null);
    console.log("   ✓ Bản ghi task đã được xóa hoàn toàn khỏi MongoDB");

    console.log("\n=== TẤT CẢ CÁC KIỂM THỬ LMS-28 ĐỀU ĐẠT (PASS) ===");
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    // Dọn dẹp dữ liệu test
    if (testClassId) {
      await ClassModel.deleteOne({ _id: testClassId });
      await ClassMember.deleteMany({ classId: testClassId });
    }
    await Task.deleteMany({ userId: { $in: [userA.id, userB.id] } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error("LMS-28 Test thất bại:", err);
  process.exit(1);
});
