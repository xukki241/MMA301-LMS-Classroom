import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Material } from "../models/index.js";
import { MaterialService } from "../services/material.service.js";

const mongoUri = process.env.TEST_CORE_MONGO_URI ?? "mongodb://127.0.0.1:27017/lms14_test_materials";

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

async function run() {
  console.log("=== BẮT ĐẦU TEST TÍCH HỢP & PERMISSIONS CHO LMS-14 (MATERIAL) ===");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const ownerTeacher: AuthUser = { id: randomUUID(), email: "teacher_owner@test.local", role: "teacher" };
  const otherTeacher: AuthUser = { id: randomUUID(), email: "teacher_other@test.local", role: "teacher" };
  const studentMember: AuthUser = { id: randomUUID(), email: "student_member@test.local", role: "student" };
  const outsiderStudent: AuthUser = { id: randomUUID(), email: "student_outsider@test.local", role: "student" };

  let classId: mongoose.Types.ObjectId | undefined;
  let server: http.Server | undefined;

  try {
    // 1. Setup test class and memberships
    const cls = await ClassModel.create({
      name: "LMS-14 Test Class Materials",
      code: randomUUID().slice(0, 6).toUpperCase(),
      teacherId: ownerTeacher.id,
    });
    classId = cls._id;

    await ClassMember.create({ classId, userId: ownerTeacher.id, roleInClass: "teacher" });
    await ClassMember.create({ classId, userId: otherTeacher.id, roleInClass: "teacher" });
    await ClassMember.create({ classId, userId: studentMember.id, roleInClass: "student" });

    const forbidden = (err: unknown) => err instanceof HttpError && err.status === 403;
    const badRequest = (err: unknown) => err instanceof HttpError && err.status === 400;
    const notFound = (err: unknown) => err instanceof HttpError && err.status === 404;

    // --- PHASE 1: DIRECT SERVICE PERMISSION BOUNDARIES ---
    console.log("1. Kiểm tra Service boundaries:");

    // Student cannot create material
    await assert.rejects(
      MaterialService.createMaterial(studentMember, String(classId), {
        title: "Student upload",
        url: "https://example.com/student.pdf",
      }),
      forbidden
    );
    console.log("   ✓ Student bị chặn tạo tài liệu (403)");

    // Non-owner teacher cannot create material
    await assert.rejects(
      MaterialService.createMaterial(otherTeacher, String(classId), {
        title: "Other teacher upload",
        url: "https://example.com/other.pdf",
      }),
      forbidden
    );
    console.log("   ✓ Giáo viên không sở hữu lớp bị chặn tạo tài liệu (403)");

    // Invalid URL rejected
    await assert.rejects(
      MaterialService.createMaterial(ownerTeacher, String(classId), {
        title: "Bad url",
        url: "invalid-url",
      }),
      badRequest
    );
    console.log("   ✓ URL không hợp lệ bị từ chối (400)");

    // Empty title rejected
    await assert.rejects(
      MaterialService.createMaterial(ownerTeacher, String(classId), {
        title: "   ",
        url: "https://example.com/valid",
      }),
      badRequest
    );
    console.log("   ✓ Tiêu đề rỗng bị từ chối (400)");

    // Title length < 2 rejected
    await assert.rejects(
      MaterialService.createMaterial(ownerTeacher, String(classId), {
        title: "a",
        url: "https://example.com/valid",
      }),
      badRequest
    );
    console.log("   ✓ Tiêu đề ngắn hơn 2 ký tự bị từ chối (400)");

    // Non-member cannot list materials
    await assert.rejects(
      MaterialService.listMaterials(outsiderStudent, String(classId)),
      forbidden
    );
    console.log("   ✓ Học sinh ngoài lớp bị chặn xem tài liệu (403)");

    // Valid creation by owner teacher
    const created1 = await MaterialService.createMaterial(ownerTeacher, String(classId), {
      title: "Slide Bài Giảng Buổi 1",
      url: "https://docs.google.com/presentation/d/slide-1",
      description: "Tài liệu môn học",
    });
    assert.equal(created1.title, "Slide Bài Giảng Buổi 1");
    console.log("   ✓ Giáo viên sở hữu lớp tạo tài liệu thành công");

    // Member student can list materials (AuthUser object)
    const studentList = await MaterialService.listMaterials(studentMember, String(classId));
    assert.equal(studentList.length, 1);
    assert.equal(studentList[0].title, "Slide Bài Giảng Buổi 1");
    console.log("   ✓ Học sinh trong lớp xem được danh sách tài liệu");

    // Member student can list materials (userId string)
    const studentListByUserId = await MaterialService.listMaterials(studentMember.id, String(classId));
    assert.equal(studentListByUserId.length, 1);
    assert.equal(studentListByUserId[0].title, "Slide Bài Giảng Buổi 1");
    console.log("   ✓ Gọi listMaterials bằng userId (string) thành công");

    // Non-owner teacher cannot delete material
    await assert.rejects(
      MaterialService.deleteMaterial(otherTeacher, String(classId), String(created1._id)),
      forbidden
    );
    console.log("   ✓ Giáo viên không sở hữu lớp bị chặn xóa tài liệu (403)");

    // Student cannot delete material
    await assert.rejects(
      MaterialService.deleteMaterial(studentMember, String(classId), String(created1._id)),
      forbidden
    );
    console.log("   ✓ Học sinh bị chặn xóa tài liệu (403)");

    // Deleting non-existent material returns 404
    await assert.rejects(
      MaterialService.deleteMaterial(ownerTeacher, String(classId), new mongoose.Types.ObjectId().toHexString()),
      notFound
    );
    console.log("   ✓ Xóa tài liệu không tồn tại trả về 404");

    // Owner teacher deletes material
    const delResult = await MaterialService.deleteMaterial(ownerTeacher, String(classId), String(created1._id));
    assert.equal(delResult.success, true);
    assert.equal(await Material.countDocuments({ classId }), 0);
    console.log("   ✓ Giáo viên sở hữu lớp xóa tài liệu thành công");

    // --- PHASE 2: HTTP ENDPOINTS VIA EXPRESS APP ---
    console.log("2. Kiểm tra HTTP Endpoints qua Express App:");
    const app = createApp();
    const port = 4995;
    server = app.listen(port);
    const baseUrl = `http://127.0.0.1:${port}`;

    const ownerToken = signTestToken(ownerTeacher);
    const studentToken = signTestToken(studentMember);

    // POST /classes/:classId/materials
    const postRes = await fetch(`${baseUrl}/classes/${classId}/materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: "Tài liệu HTTP Test 1",
        url: "https://github.com/xukki241/MMA301-LMS-Classroom",
        description: "Source code repository",
      }),
    });
    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.ok(postData.material?._id);
    const matId = postData.material._id;
    console.log("   ✓ HTTP POST /classes/:classId/materials trả về 201");

    // POST by student -> 403
    const postStudentRes = await fetch(`${baseUrl}/classes/${classId}/materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: "Student HTTP Post",
        url: "https://example.com/doc",
      }),
    });
    assert.equal(postStudentRes.status, 403);
    console.log("   ✓ HTTP POST bởi student trả về 403");

    // GET /classes/:classId/materials by student -> 200
    const getRes = await fetch(`${baseUrl}/classes/${classId}/materials`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert.equal(getData.materials.length, 1);
    assert.equal(getData.materials[0]._id, matId);
    console.log("   ✓ HTTP GET /classes/:classId/materials trả về 200 và đúng payload");

    // DELETE /classes/:classId/materials/:materialId by teacher -> 200
    const delRes = await fetch(`${baseUrl}/classes/${classId}/materials/${matId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.success, true);
    console.log("   ✓ HTTP DELETE /classes/:classId/materials/:materialId trả về 200");

    console.log("=== TẤT CẢ TEST CHO LMS-14 ĐỀU PASS 100%! ===");
  } finally {
    if (server) {
      server.close();
    }
    if (classId) {
      await Material.deleteMany({ classId });
      await ClassMember.deleteMany({ classId });
      await ClassModel.deleteOne({ _id: classId });
    }
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error("LỖI TEST LMS-14:", err);
  process.exit(1);
});
