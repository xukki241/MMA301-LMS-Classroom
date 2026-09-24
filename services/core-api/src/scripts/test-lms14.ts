async function testLMS14() {
  const authUrl = "http://localhost:4001";
  const coreUrl = "http://localhost:4002";

  console.log("=== BẮT ĐẦU TEST LMS-14 (MATERIAL CRUD) ===");

  // 1. Login Teacher
  console.log("1. Đăng nhập tài khoản Giáo viên...");
  const teacherRes = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teacher@lms.local", password: "Demo123!" }),
  });
  const teacherAuth = await teacherRes.json();
  if (!teacherAuth.token) throw new Error("Không thể đăng nhập Giáo viên: " + JSON.stringify(teacherAuth));
  console.log("   -> Token GV thành công. ID:", teacherAuth.user.id);

  // 2. Lấy lớp của Giáo viên
  console.log("2. Lấy danh sách lớp học của Giáo viên...");
  const teachingRes = await fetch(`${coreUrl}/classes/teaching`, {
    headers: { Authorization: `Bearer ${teacherAuth.token}` },
  });
  const teachingData = await teachingRes.json();
  let targetClass = teachingData.classes?.[0];

  if (!targetClass) {
    console.log("   Chưa có lớp, tạo lớp mới...");
    const createClassRes = await fetch(`${coreUrl}/classes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherAuth.token}`,
      },
      body: JSON.stringify({ name: "Lập trình Di Động MMA301" }),
    });
    const createClassData = await createClassRes.json();
    targetClass = createClassData.class;
  }
  const classId = targetClass._id;
  const classCode = targetClass.code;
  console.log(`   -> Sử dụng lớp: ${targetClass.name} (ID: ${classId}, Code: ${classCode})`);

  // 3. Login Student & ensure joined
  console.log("3. Đăng nhập tài khoản Học sinh...");
  const studentRes = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@lms.local", password: "Demo123!" }),
  });
  const studentAuth = await studentRes.json();
  if (!studentAuth.token) throw new Error("Không thể đăng nhập Học sinh: " + JSON.stringify(studentAuth));

  // Thử join lớp (nếu chưa join)
  await fetch(`${coreUrl}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({ code: classCode }),
  });

  // 4. Giáo viên thêm Tài liệu 1
  console.log("4. Giáo viên thêm tài liệu: Slide Bài giảng Buổi 1...");
  const addMat1Res = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    body: JSON.stringify({
      title: "Slide Bài giảng Buổi 1 - Kiến trúc ứng dụng LMS",
      url: "https://docs.google.com/presentation/d/demo-lms-slide",
      description: "Tài liệu giới thiệu kiến trúc Mobile Expo và Node.js Backend",
    }),
  });
  const text1 = await addMat1Res.text();
  console.log(`   -> Response status: ${addMat1Res.status}, body: ${text1.slice(0, 150)}`);
  const addMat1Data = JSON.parse(text1);
  console.log(`   -> Thêm thành công: status ${addMat1Res.status}, id: ${addMat1Data.material?._id}`);

  // 5. Giáo viên thêm Tài liệu 2
  console.log("5. Giáo viên thêm tài liệu: Tài liệu thực hành GitHub...");
  const addMat2Res = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    body: JSON.stringify({
      title: "Source Code Mẫu & Hướng Dẫn Thực Hành Lab 1",
      url: "https://github.com/xukki241/MMA301-LMS-Classroom",
      description: "Mã nguồn tham khảo trên GitHub",
    }),
  });
  const addMat2Data = await addMat2Res.json();
  console.log(`   -> Thêm thành công: status ${addMat2Res.status}, id: ${addMat2Data.material?._id}`);

  // 6. Học sinh xem danh sách tài liệu
  console.log("6. Học sinh gọi GET /classes/:id/materials...");
  const getMatRes = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const getMatData = await getMatRes.json();
  console.log(`   -> Lấy danh sách thành công! Tổng số tài liệu: ${getMatData.materials?.length}`);
  if (!getMatData.materials || getMatData.materials.length === 0) {
    throw new Error("Không có tài liệu nào trả về!");
  }

  // 7. Học sinh cố tình thêm tài liệu (phải bị chặn 403 Forbidden)
  console.log("7. Kiểm tra phân quyền: Học sinh cố tình thêm tài liệu...");
  const forbiddenRes = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({
      title: "Học sinh cố tình upload",
      url: "https://google.com",
    }),
  });
  console.log(`   -> Kết quả: status ${forbiddenRes.status} (Kỳ vọng: 403)`);
  if (forbiddenRes.status !== 403) {
    throw new Error(`Kỳ vọng 403 nhưng nhận được ${forbiddenRes.status}`);
  }

  // 8. Kiểm tra validation: Gửi URL rỗng (phải bị lỗi 400 Bad Request)
  console.log("8. Kiểm tra validation: Gửi URL rỗng hoặc sai định dạng...");
  const badUrlRes = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    body: JSON.stringify({
      title: "Tài liệu link lỗi",
      url: "invalid-url",
    }),
  });
  console.log(`   -> Kết quả: status ${badUrlRes.status} (Kỳ vọng: 400)`);
  if (badUrlRes.status !== 400) {
    throw new Error(`Kỳ vọng 400 nhưng nhận được ${badUrlRes.status}`);
  }

  // 9. Thêm và Xóa một tài liệu tạm
  console.log("9. Kiểm tra xóa tài liệu (DELETE)...");
  const tempMatRes = await fetch(`${coreUrl}/classes/${classId}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    body: JSON.stringify({
      title: "Tài liệu tạm cần xóa",
      url: "https://example.com/temp",
    }),
  });
  const tempMatData = await tempMatRes.json();
  const tempId = tempMatData.material._id;

  const deleteRes = await fetch(`${coreUrl}/classes/${classId}/materials/${tempId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherAuth.token}` },
  });
  const deleteData = await deleteRes.json();
  console.log(`   -> Xóa thành công: status ${deleteRes.status}, message: ${deleteData.message}`);

  console.log("=== TẤT CẢ TEST BACKEND CHO LMS-14 ĐỀU PASS 100%! ===");
}

testLMS14().catch((err) => {
  console.error("LỖI TEST LMS-14:", err);
  process.exit(1);
});
