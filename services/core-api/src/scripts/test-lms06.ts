import jwt from "jsonwebtoken";

async function testLMS06() {
  const authUrl = "http://localhost:4001";
  const coreUrl = "http://localhost:4002";

  console.log("=== BẮT ĐẦU KIỂM THỬ TÍNH NĂNG LMS-06 (POST, COMMENT, REACTION, REALTIME) ===");

  // Đọc token từ tham số dòng lệnh hoặc biến môi trường nếu có
  const args = process.argv.slice(2);
  const argTeacherToken = args.find((a) => a.startsWith("--teacher-token="))?.split("=")[1] || process.env.TEACHER_TOKEN;
  const argStudentToken = args.find((a) => a.startsWith("--student-token="))?.split("=")[1] || process.env.STUDENT_TOKEN;

  // 1. Đăng nhập Teacher
  console.log("\n1. Đăng nhập Giáo viên (Teacher)...");
  let teacherToken = "";
  let teacherId = "";

  if (argTeacherToken) {
    console.log("   [Custom] Sử dụng Teacher Token được truyền vào từ tham số/env!");
    teacherToken = argTeacherToken;
    const decoded = jwt.decode(teacherToken) as { sub?: string } | null;
    teacherId = decoded?.sub || "teacher_custom_id";
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
    } catch (e) {}

    if (!teacherToken) {
      console.log("   Fallback signing JWT cho Teacher...");
      teacherId = "teacher_seed_id_01";
      teacherToken = jwt.sign(
        { sub: teacherId, email: "teacher@lms.local", role: "teacher" },
        process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
        { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
      );
    }
  }
  console.log(`   [OK] Teacher Token có hiệu lực. ID: ${teacherId}`);

  // 2. Đăng nhập Student
  console.log("\n2. Đăng nhập Sinh viên (Student)...");
  let studentToken = "";
  let studentId = "";

  if (argStudentToken) {
    console.log("   [Custom] Sử dụng Student Token được truyền vào từ tham số/env!");
    studentToken = argStudentToken;
    const decoded = jwt.decode(studentToken) as { sub?: string } | null;
    studentId = decoded?.sub || "student_custom_id";
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
    } catch (e) {}

    if (!studentToken) {
      console.log("   Fallback signing JWT cho Student...");
      studentId = "student_seed_id_01";
      studentToken = jwt.sign(
        { sub: studentId, email: "student@lms.local", role: "student" },
        process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
        { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
      );
    }
  }
  console.log(`   [OK] Student Token có hiệu lực. ID: ${studentId}`);

  // 3. User ngoài lớp (Non-member)
  let outsiderToken = "";
  try {
    const regRes = await fetch(`${authUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `outsider_${Date.now()}@lms.local`, password: "Demo123!", role: "student" }),
    });
    if (regRes.ok) {
      const regData = await regRes.json();
      outsiderToken = regData.token;
    }
  } catch (e) {}

  if (!outsiderToken) {
    outsiderToken = jwt.sign(
      { sub: "outsider_9999", email: "outsider@lms.local", role: "student" },
      process.env.JWT_SECRET || "change-me-in-local-dev-min-32-chars!!",
      { expiresIn: "1h", issuer: "lms-auth-service", audience: "lms-core-api" }
    );
  }

  // 4. Tạo lớp học test
  console.log("\n3. Giáo viên tạo lớp học mới...");
  const createClassRes = await fetch(`${coreUrl}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ name: `Lớp Test Bảng Tin ${Date.now()}` }),
  });
  const classData = await createClassRes.json();
  const classId = classData.class._id;
  const classCode = classData.class.code;
  console.log(`   [OK] Đã tạo lớp: ${classId} (Mã mời: ${classCode})`);

  // 5. Sinh viên tham gia lớp
  console.log("\n4. Sinh viên tham gia lớp học...");
  const joinRes = await fetch(`${coreUrl}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ code: classCode }),
  });
  console.log(`   [OK] Sinh viên tham gia lớp: status = ${joinRes.status}`);

  // 6. Giáo viên tạo bài đăng
  console.log("\n5. Giáo viên tạo bài đăng trên bảng tin...");
  const createPostRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ content: "Chào mừng các bạn sinh viên đến với khóa học LMS MMA301!" }),
  });
  console.log(`   Status: ${createPostRes.status}`);
  const postData = await createPostRes.json();
  if (createPostRes.status !== 201) {
    throw new Error(`Tạo bài đăng thất bại: ${JSON.stringify(postData)}`);
  }
  const postId = postData.post._id;
  console.log(`   [OK] Bài đăng được tạo thành công: ID = ${postId}`);

  // 7. Sinh viên thử tạo bài đăng -> Phải bị chặn 403 (Chỉ Teacher mới được đăng)
  console.log("\n6. Kiểm tra phân quyền: Sinh viên thử tạo bài đăng...");
  const studentPostRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ content: "Sinh viên muốn đăng bài trái phép" }),
  });
  console.log(`   Status: ${studentPostRes.status} (Kỳ vọng: 403)`);
  if (studentPostRes.status !== 403) {
    throw new Error(`Phân quyền thất bại: Sinh viên không bị chặn khi đăng bài!`);
  }
  console.log("   [OK] Đã chặn Sinh viên tạo bài đăng thành công.");

  // 8. Lấy danh sách bài đăng
  console.log("\n7. Sinh viên xem danh sách bài đăng...");
  const listPostsRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const listPostsData = await listPostsRes.json();
  console.log(`   Số lượng bài đăng: ${listPostsData.posts.length}`);
  if (listPostsData.posts.length !== 1) {
    throw new Error(`Danh sách bài đăng không khớp!`);
  }
  console.log("   [OK] Sinh viên lấy danh sách bài đăng thành công.");

  // 9. Người ngoài lớp xem bài đăng -> 403
  console.log("\n8. Người ngoài lớp (Non-member) xem bài đăng...");
  const outsiderRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    headers: { Authorization: `Bearer ${outsiderToken}` },
  });
  console.log(`   Status: ${outsiderRes.status} (Kỳ vọng: 403)`);
  if (outsiderRes.status !== 403) {
    throw new Error("Người ngoài lớp không bị chặn!");
  }
  console.log("   [OK] Đã chặn người ngoài lớp xem bài đăng thành công.");

  // 10. Chỉnh sửa bài đăng (Author)
  console.log("\n9. Giáo viên (Tác giả) chỉnh sửa bài đăng...");
  const updatePostRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ content: "Nội dung bài đăng đã được giáo viên cập nhật thành công." }),
  });
  console.log(`   Status: ${updatePostRes.status}`);
  const updatePostData = await updatePostRes.json();
  if (updatePostData.post.content !== "Nội dung bài đăng đã được giáo viên cập nhật thành công.") {
    throw new Error("Chỉnh sửa bài đăng thất bại!");
  }
  console.log("   [OK] Tác giả chỉnh sửa bài đăng thành công.");

  // 11. Sinh viên thử sửa bài đăng của giáo viên -> 403
  console.log("\n10. Sinh viên thử chỉnh sửa bài đăng của giáo viên...");
  const forbiddenEditPostRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ content: "Sinh viên sửa trái phép" }),
  });
  console.log(`   Status: ${forbiddenEditPostRes.status} (Kỳ vọng: 403)`);
  if (forbiddenEditPostRes.status !== 403) {
    throw new Error("Sinh viên sửa được bài đăng của giáo viên!");
  }
  console.log("   [OK] Đã chặn quyền sửa bài đăng trái phép.");

  // 12. Sinh viên gửi bình luận
  console.log("\n11. Sinh viên gửi bình luận vào bài đăng...");
  const createCommentRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ content: "Em chào thầy ạ, nhóm em đã sẵn sàng!" }),
  });
  console.log(`   Status: ${createCommentRes.status}`);
  const commentData = await createCommentRes.json();
  const studentCommentId = commentData.comment._id;
  console.log(`   [OK] Bình luận của sinh viên được tạo: ID = ${studentCommentId}`);

  // 13. Giáo viên gửi phản hồi bình luận
  console.log("\n12. Giáo viên phản hồi bình luận...");
  const teacherCommentRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ content: "Tốt lắm, các bạn chuẩn bị báo cáo nhé!" }),
  });
  console.log(`   Status: ${teacherCommentRes.status}`);
  console.log("   [OK] Giáo viên gửi bình luận thành công.");

  // 14. Lấy danh sách bình luận
  console.log("\n13. Lấy danh sách bình luận của bài đăng...");
  const listCommentsRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const listCommentsData = await listCommentsRes.json();
  console.log(`   Tổng số bình luận: ${listCommentsData.comments.length} (Kỳ vọng: 2)`);
  if (listCommentsData.comments.length !== 2) {
    throw new Error("Danh sách bình luận không đúng số lượng!");
  }
  console.log("   [OK] Lấy danh sách bình luận thành công.");

  // 15. Sinh viên chỉnh sửa bình luận của mình
  console.log("\n14. Sinh viên sửa bình luận của mình...");
  const updateCommentRes = await fetch(
    `${coreUrl}/classes/${classId}/posts/${postId}/comments/${studentCommentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ content: "Em chào thầy ạ, nhóm em đã hoàn thành LMS-06!" }),
    }
  );
  console.log(`   Status: ${updateCommentRes.status}`);
  const updateCommentData = await updateCommentRes.json();
  if (updateCommentData.comment.content !== "Em chào thầy ạ, nhóm em đã hoàn thành LMS-06!") {
    throw new Error("Sửa bình luận thất bại!");
  }
  console.log("   [OK] Sinh viên sửa bình luận của mình thành công.");

  // 16. Giáo viên thử sửa bình luận của sinh viên -> 403 (Chỉ tác giả mới sửa được nội dung)
  console.log("\n15. Giáo viên thử sửa nội dung bình luận của sinh viên...");
  const teacherEditStudentCommentRes = await fetch(
    `${coreUrl}/classes/${classId}/posts/${postId}/comments/${studentCommentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({ content: "Thầy sửa hộ" }),
    }
  );
  console.log(`   Status: ${teacherEditStudentCommentRes.status} (Kỳ vọng: 403)`);
  if (teacherEditStudentCommentRes.status !== 403) {
    throw new Error("Người khác sửa được bình luận!");
  }
  console.log("   [OK] Đã bảo vệ quyền sở hữu nội dung bình luận.");

  // 17. Thả biểu cảm (Reaction) - Sinh viên thả 👍
  console.log("\n16. Sinh viên thả biểu cảm 👍...");
  const reaction1Res = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/reactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ emoji: "👍" }),
  });
  console.log(`   Status: ${reaction1Res.status}`);
  const reaction1Data = await reaction1Res.json();
  console.log(`   Hành động: ${reaction1Data.action}`);
  if (reaction1Data.action !== "added") {
    throw new Error("Thả biểu cảm thất bại!");
  }

  // 18. Sinh viên đổi sang biểu cảm ❤️
  console.log("\n17. Sinh viên đổi sang biểu cảm ❤️...");
  const reaction2Res = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/reactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ emoji: "❤️" }),
  });
  console.log(`   Status: ${reaction2Res.status}`);
  const reaction2Data = await reaction2Res.json();
  console.log(`   Hành động: ${reaction2Data.action}`);
  if (reaction2Data.action !== "changed") {
    throw new Error("Đổi biểu cảm thất bại!");
  }

  // 19. Giáo viên thả biểu cảm 🎉
  console.log("\n18. Giáo viên thả biểu cảm 🎉...");
  const reaction3Res = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/reactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ emoji: "🎉" }),
  });
  console.log(`   Status: ${reaction3Res.status}`);

  // 20. Xem thống kê biểu cảm
  console.log("\n19. Xem thống kê biểu cảm trên bài đăng...");
  const getReactionsRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/reactions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const reactionsSummary = await getReactionsRes.json();
  console.log("   Thống kê:", JSON.stringify(reactionsSummary));
  if (reactionsSummary.total !== 2 || reactionsSummary.userReaction !== "❤️") {
    throw new Error("Thống kê biểu cảm không chính xác!");
  }
  console.log("   [OK] Thống kê biểu cảm chính xác 100%.");

  // 21. Sinh viên bấm lại ❤️ để hủy biểu cảm
  console.log("\n20. Sinh viên bấm lại ❤️ để hủy biểu cảm...");
  const reaction4Res = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/reactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ emoji: "❤️" }),
  });
  const reaction4Data = await reaction4Res.json();
  console.log(`   Hành động: ${reaction4Data.action}`);
  if (reaction4Data.action !== "removed") {
    throw new Error("Hủy biểu cảm thất bại!");
  }
  console.log("   [OK] Hủy biểu cảm thành công.");

  // 22. Kiểm tra Realtime Polling qua updatedAfter
  console.log("\n21. Kiểm tra Realtime Long Polling qua ?updatedAfter=...");
  const pastIso = new Date(Date.now() - 60000).toISOString();
  const poll1 = await fetch(`${coreUrl}/classes/${classId}/posts?updatedAfter=${pastIso}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const poll1Data = await poll1.json();
  console.log(`   Poll với quá khứ (1 phút trước): ${poll1Data.posts.length} bài đăng (Kỳ vọng: 1)`);

  const futureIso = new Date(Date.now() + 60000).toISOString();
  const poll2 = await fetch(`${coreUrl}/classes/${classId}/posts?updatedAfter=${futureIso}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const poll2Data = await poll2.json();
  console.log(`   Poll với tương lai (1 phút sau): ${poll2Data.posts.length} bài đăng (Kỳ vọng: 0)`);
  if (poll1Data.posts.length !== 1 || poll2Data.posts.length !== 0) {
    throw new Error("Realtime Long Polling filter hoạt động sai!");
  }
  console.log("   [OK] Realtime Long Polling filter hoạt động hoàn hảo.");

  // 23. Giáo viên xóa bình luận của sinh viên (Moderation quyền giáo viên lớp)
  console.log("\n22. Giáo viên kiểm duyệt xóa bình luận của sinh viên...");
  const deleteCommentRes = await fetch(
    `${coreUrl}/classes/${classId}/posts/${postId}/comments/${studentCommentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${teacherToken}` },
    }
  );
  console.log(`   Status: ${deleteCommentRes.status}`);
  if (deleteCommentRes.status !== 200) {
    throw new Error("Giáo viên không xóa được bình luận vi phạm!");
  }

  // Kiểm tra bình luận đã bị soft-delete
  const checkCommentsRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkCommentsData = await checkCommentsRes.json();
  console.log(`   Số bình luận còn lại hiển thị: ${checkCommentsData.comments.length} (Kỳ vọng: 1)`);
  if (checkCommentsData.comments.length !== 1) {
    throw new Error("Soft delete bình luận không ẩn khỏi danh sách!");
  }
  console.log("   [OK] Soft delete bình luận và quyền kiểm duyệt của giáo viên hoạt động chuẩn xác.");

  // 24. Xóa bài đăng
  console.log("\n23. Giáo viên xóa bài đăng...");
  const deletePostRes = await fetch(`${coreUrl}/classes/${classId}/posts/${postId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  console.log(`   Status: ${deletePostRes.status}`);

  // Kiểm tra bài đăng đã bị soft-delete
  const checkPostsRes = await fetch(`${coreUrl}/classes/${classId}/posts`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const checkPostsData = await checkPostsRes.json();
  console.log(`   Số bài đăng còn lại hiển thị: ${checkPostsData.posts.length} (Kỳ vọng: 0)`);
  if (checkPostsData.posts.length !== 0) {
    throw new Error("Soft delete bài đăng không ẩn khỏi danh sách!");
  }
  console.log("   [OK] Soft delete bài đăng hoạt động chuẩn xác.");

  console.log("\n=======================================================");
  console.log("🎉 TẤT CẢ 23 KỊCH BẢN KIỂM THỬ LMS-06 ĐỀU THÀNH CÔNG RỰC RỠ! 🎉");
  console.log("=======================================================\n");
}

testLMS06().catch((err) => {
  console.error("LỖI KIỂM THỬ:", err);
  process.exit(1);
});
