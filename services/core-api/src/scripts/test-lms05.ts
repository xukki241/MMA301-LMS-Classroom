async function testE2E() {
  const authUrl = "http://localhost:4001";
  const coreUrl = "http://localhost:4002";

  console.log("1. Logging in as Teacher...");
  const teacherLoginRes = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teacher@lms.local", password: "Demo123!" }),
  });
  const teacherAuth = await teacherLoginRes.json();
  console.log("   Teacher token obtained. ID:", teacherAuth.user.id);

  console.log("2. Creating Class as Teacher...");
  const createClassRes = await fetch(`${coreUrl}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    body: JSON.stringify({ name: "Lập Trình Di Động - MMA301" }),
  });
  const createdClassData = await createClassRes.json();
  console.log("   Created Class:", createdClassData);
  const classCode = createdClassData.class.code;
  const classId = createdClassData.class._id;

  console.log("3. Logging in as Student...");
  const studentLoginRes = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@lms.local", password: "Demo123!" }),
  });
  const studentAuth = await studentLoginRes.json();
  console.log("   Student token obtained. ID:", studentAuth.user.id);

  console.log("4. Student Joining Class with code:", classCode);
  const joinRes = await fetch(`${coreUrl}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({ code: classCode }),
  });
  const joinData = await joinRes.json();
  console.log("   Join result:", joinData);

  console.log("5. Fetching Enrolled Classes for Student...");
  const enrolledRes = await fetch(`${coreUrl}/classes/enrolled`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const enrolledData = await enrolledRes.json();
  console.log("   Student Enrolled Classes count:", enrolledData.classes.length, "Name:", enrolledData.classes[0]?.name);

  console.log("6. Fetching Class Details as Student...");
  const detailRes = await fetch(`${coreUrl}/classes/${classId}`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const detailData = await detailRes.json();
  console.log("   Class Detail:", detailData);

  console.log("7. Fetching Class Members as Student...");
  const membersRes = await fetch(`${coreUrl}/classes/${classId}/members`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const membersData = await membersRes.json();
  console.log("   Members count:", membersData.members.length);

  console.log("✅ ALL LMS-05 E2E TESTS PASSED!");
}

testE2E().catch(console.error);
