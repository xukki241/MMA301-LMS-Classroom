import jwt from "jsonwebtoken";

async function testLMS07() {
  const authUrl = "http://localhost:4001";
  const coreUrl = "http://localhost:4002";

  console.log("================================================================================");
  console.log("=== STARTING LMS-07 VERIFICATION: API CONTRACT & OWNERSHIP HELPERS ===");
  console.log("================================================================================");

  const args = process.argv.slice(2);
  const argTeacherToken = args.find((a) => a.startsWith("--teacher-token="))?.split("=")[1] || process.env.TEACHER_TOKEN;
  const argStudentToken = args.find((a) => a.startsWith("--student-token="))?.split("=")[1] || process.env.STUDENT_TOKEN;

  // 1. Obtain Teacher 1 Token
  console.log("\n[1/11] Obtaining Teacher 1 Token...");
  let teacherToken = "";
  let teacherId = "";

  if (argTeacherToken) {
    teacherToken = argTeacherToken;
    const decoded = jwt.decode(teacherToken) as { sub?: string } | null;
    teacherId = decoded?.sub || "teacher_1_id";
  } else {
    try {
      const res = await fetch(`${authUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "teacher@lms.local", password: "Demo123!" }),
      });
      if (res.ok) {
        const data = await res.json();
        teacherToken = data.token;
        teacherId = data.user.id;
      }
    } catch {}

    if (!teacherToken) {
      console.log("   Fallback signing JWT for Teacher 1...");
      teacherId = "66e6b4f73a1b5c0012a40001";
      teacherToken = jwt.sign(
        { sub: teacherId, email: "teacher@lms.local", role: "teacher" },
        process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
        { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
      );
    }
  }
  console.log(`   [OK] Teacher 1 authenticated. ID: ${teacherId}`);

  // 2. Obtain Student Token
  console.log("\n[2/11] Obtaining Student Token...");
  let studentToken = "";
  let studentId = "";

  if (argStudentToken) {
    studentToken = argStudentToken;
    const decoded = jwt.decode(studentToken) as { sub?: string } | null;
    studentId = decoded?.sub || "student_1_id";
  } else {
    try {
      const res = await fetch(`${authUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@lms.local", password: "Demo123!" }),
      });
      if (res.ok) {
        const data = await res.json();
        studentToken = data.token;
        studentId = data.user.id;
      }
    } catch {}

    if (!studentToken) {
      console.log("   Fallback signing JWT for Student...");
      studentId = "66e6b4f73a1b5c0012a40002";
      studentToken = jwt.sign(
        { sub: studentId, email: "student@lms.local", role: "student" },
        process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
        { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
      );
    }
  }
  console.log(`   [OK] Student authenticated. ID: ${studentId}`);

  // 3. Obtain Teacher 2 Token (for non-owner tests)
  console.log("\n[3/11] Generating Teacher 2 Token (Different Teacher)...");
  const teacher2Id = "66e6b4f73a1b5c0012a40003";
  const teacher2Token = jwt.sign(
    { sub: teacher2Id, email: "teacher2@lms.local", role: "teacher" },
    process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
    { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
  );
  console.log(`   [OK] Teacher 2 authenticated. ID: ${teacher2Id}`);

  // 4. Outsider Token (Student not enrolled in the class)
  const outsiderId = "66e6b4f73a1b5c0012a40099";
  const outsiderToken = jwt.sign(
    { sub: outsiderId, email: "outsider@lms.local", role: "student" },
    process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
    { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
  );

  // 5. Test Teacher 1 creates class (POST /classes)
  console.log("\n[4/11] Teacher 1 creates class...");
  const createClassRes = await fetch(`${coreUrl}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ name: `LMS-07 Test Class ${Date.now()}` }),
  });
  const createClassData = await createClassRes.json();
  if (createClassRes.status !== 201) {
    throw new Error(`Failed to create class: ${JSON.stringify(createClassData)}`);
  }
  const classId = createClassData.class._id;
  const classCode = createClassData.class.code;
  console.log(`   Status: ${createClassRes.status}`);
  console.log(`   Message: "${createClassData.message}"`);
  if (createClassData.message !== "Class created successfully") {
    throw new Error(`Expected English message "Class created successfully", received "${createClassData.message}"`);
  }
  console.log(`   [OK] Class created: ID ${classId}, Code ${classCode}`);

  // 6. Test requireRole: Student tries to create class -> 403
  console.log("\n[5/11] Guard Test: Student tries to create class (requireRole)...");
  const studentCreateClassRes = await fetch(`${coreUrl}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ name: "Student Illegal Class" }),
  });
  console.log(`   Status: ${studentCreateClassRes.status} (Expected: 403)`);
  if (studentCreateClassRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for student creating class, got ${studentCreateClassRes.status}`);
  }
  console.log("   [OK] requireRole('teacher') successfully blocked Student with 403.");

  // 7. Test requireRole: Teacher tries to call student-only route (GET /classes/enrolled) -> 403
  console.log("\n[6/11] Guard Test: Teacher calls /classes/enrolled (requireRole)...");
  const teacherEnrolledRes = await fetch(`${coreUrl}/classes/enrolled`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  console.log(`   Status: ${teacherEnrolledRes.status} (Expected: 403)`);
  if (teacherEnrolledRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for teacher calling /classes/enrolled, got ${teacherEnrolledRes.status}`);
  }
  console.log("   [OK] requireRole('student') successfully blocked Teacher with 403.");

  // 8. Student joins class
  console.log("\n[7/11] Student joins class with code...");
  const joinRes = await fetch(`${coreUrl}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ code: classCode }),
  });
  const joinData = await joinRes.json();
  if (joinRes.status !== 200) {
    throw new Error(`Student failed to join class: ${JSON.stringify(joinData)}`);
  }
  console.log(`   Message: "${joinData.message}"`);
  if (joinData.message !== "Joined class successfully") {
    throw new Error(`Expected English message "Joined class successfully", received "${joinData.message}"`);
  }
  console.log("   [OK] Student joined class successfully.");

  // 9. Test assertClassMembership: Outsider tries to list posts -> 403
  console.log("\n[8/11] Guard Test: Outsider accesses class posts (assertClassMembership)...");
  const outsiderListRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    headers: { Authorization: `Bearer ${outsiderToken}` },
  });
  console.log(`   Status: ${outsiderListRes.status} (Expected: 403)`);
  if (outsiderListRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for outsider, got ${outsiderListRes.status}`);
  }
  const outsiderData = await outsiderListRes.json();
  console.log(`   Error message: "${outsiderData.message}"`);
  if (outsiderData.message !== "You are not a member of this class") {
    throw new Error(`Expected English message "You are not a member of this class", received "${outsiderData.message}"`);
  }
  console.log("   [OK] assertClassMembership successfully protected class posts from non-members.");

  // 10. Test Invalid ID format: 400 INVALID_ID
  console.log("\n[9/11] Guard Test: Invalid class ID format (assertClassMembership)...");
  const invalidIdRes = await fetch(`${coreUrl}/classes/invalid-mongo-id-123/posts`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`   Status: ${invalidIdRes.status} (Expected: 400)`);
  if (invalidIdRes.status !== 400) {
    throw new Error(`Expected 400 Invalid ID, got ${invalidIdRes.status}`);
  }
  const invalidIdData = await invalidIdRes.json();
  console.log(`   Error message: "${invalidIdData.message}"`);
  if (invalidIdData.message !== "Invalid class ID format") {
    throw new Error(`Expected English message "Invalid class ID format", received "${invalidIdData.message}"`);
  }
  console.log("   [OK] assertClassMembership validated ObjectId format cleanly.");

  // 11. Test Class Ownership: Teacher 2 (Not Owner) tries to update class -> 403
  console.log("\n[10/11] Ownership Test: Teacher 2 (Not Owner) tries to update class...");
  const teacher2UpdateRes = await fetch(`${coreUrl}/classes/${classId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacher2Token}`,
    },
    body: JSON.stringify({ name: "Hacked Class Name" }),
  });
  console.log(`   Status: ${teacher2UpdateRes.status} (Expected: 403)`);
  if (teacher2UpdateRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-owner teacher update, got ${teacher2UpdateRes.status}`);
  }
  const teacher2UpdateData = await teacher2UpdateRes.json();
  console.log(`   Error message: "${teacher2UpdateData.message}"`);
  if (teacher2UpdateData.message !== "Only the class owner can update this class") {
    throw new Error(`Expected English message "Only the class owner can update this class", received "${teacher2UpdateData.message}"`);
  }
  console.log("   [OK] Ownership check successfully rejected non-owner teacher.");

  // 12. Teacher 1 (Owner) updates class -> 200
  console.log("\n[11/11] Ownership Test: Teacher 1 (Owner) updates class...");
  const ownerUpdateRes = await fetch(`${coreUrl}/classes/${classId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ name: "Updated Class Name LMS-07" }),
  });
  console.log(`   Status: ${ownerUpdateRes.status} (Expected: 200)`);
  if (ownerUpdateRes.status !== 200) {
    throw new Error(`Expected 200 for owner update, got ${ownerUpdateRes.status}`);
  }
  const ownerUpdateData = await ownerUpdateRes.json();
  console.log(`   Message: "${ownerUpdateData.message}"`);
  if (ownerUpdateData.message !== "Class updated successfully") {
    throw new Error(`Expected English message "Class updated successfully", received "${ownerUpdateData.message}"`);
  }
  console.log("   [OK] Owner successfully updated class.");

  console.log("\n================================================================================");
  console.log("🎉 ALL 11 LMS-07 VERIFICATION SCENARIOS PASSED WITH FLYING COLORS! 🎉");
  console.log("================================================================================\n");
}

testLMS07().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
