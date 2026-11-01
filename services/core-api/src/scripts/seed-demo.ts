/**
 * Nạp dữ liệu demo cho app mobile (lớp, lịch học, kỳ kiểm tra, bài tập, tài liệu, điểm).
 *
 * Idempotent: chạy lại không tạo thêm lớp/bài/kỳ kiểm tra cùng tiêu đề.
 * Buổi học đánh dấu "Demo:" được chỉnh lại cho đúng thứ hôm nay, không chất chồng.
 *
 * Cần auth-service và core-api đang chạy, và tài khoản đã được seed:
 *   npm run seed --prefix services/auth-service
 *   npm run seed:demo --prefix services/core-api
 *
 * Bài đã hết hạn không nộp được qua API, nên script tạo bài còn hạn rồi lùi dueAt
 * và chèn submission bằng model. Điểm chấm qua PUT grade sau khi đã hết hạn.
 *
 * Có ít nhất 1 tài liệu trả phí (locked) cho student@lms.local — dùng Maestro payment unlock.
 */
import { connectMongo, disconnectMongo } from "../db/mongo.js";
import { Exercise, Grade, MaterialUnlock, Submission } from "../models/index.js";

const TEACHER = { email: process.env.SEED_TEACHER_EMAIL ?? "teacher@lms.local", displayName: "Nguyễn Lan Anh", role: "teacher" as const };
const STUDENT = { email: process.env.SEED_STUDENT_EMAIL ?? "student@lms.local", displayName: "Trần Minh Khôi", role: "student" as const };
const STUDENT_2 = { email: process.env.SEED_STUDENT2_EMAIL ?? "student2@lms.local", displayName: "Phạm Hà My", role: "student" as const };
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo123!";

const AUTH_BASE = `http://127.0.0.1:${process.env.AUTH_PORT ?? "4001"}`;
const CORE_BASE = `http://127.0.0.1:${process.env.CORE_PORT ?? "4002"}`;

const PAID_MATERIAL_TITLE = "Bài giảng Premium · React Native";
const PAID_MATERIAL_PRICE = 15000;

type Json = Record<string, unknown>;

interface SessionUser {
  token: string;
  id: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

function mongoDbName(uri: string | undefined): string {
  if (!uri) return "(không có URI)";
  const path = uri.split("?")[0]?.split("/").pop() ?? "";
  return decodeURIComponent(path) || "(không có tên DB)";
}

function idOf(row: Json): string {
  const value = row.id ?? row._id;
  return String(value ?? "");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function api(base: string, method: string, path: string, token?: string, body?: unknown, accept: number[] = [200, 201]): Promise<Json> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data: Json = {};
  if (text) {
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = { error: text };
    }
  }
  if (!accept.includes(response.status)) {
    throw new ApiError(
      `${method} ${path} → ${response.status} ${String(data.error ?? data.message ?? text)}`,
      response.status,
      String(data.code ?? "")
    );
  }
  return data;
}

async function waitHealthy(url: string): Promise<void> {
  const deadline = Date.now() + 45_000;
  let last = "chưa kết nối";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${url} chưa sẵn sàng (${last})`);
}

async function loginOrRegister(account: { email: string; displayName: string; role: "teacher" | "student" }): Promise<SessionUser> {
  let data: Json;
  try {
    data = await api(AUTH_BASE, "POST", "/auth/login", undefined, { email: account.email, password: PASSWORD });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      data = await api(AUTH_BASE, "POST", "/auth/register", undefined, {
        email: account.email,
        password: PASSWORD,
        displayName: account.displayName,
        role: account.role,
      }, [201]);
    } catch (registerError) {
      if (registerError instanceof ApiError && registerError.code === "EMAIL_TAKEN") {
        throw new Error(`Không đăng nhập được ${account.email}. Chạy npm run seed ở auth-service với cùng SEED_PASSWORD.`);
      }
      throw registerError;
    }
  }

  const user = data.user as Json | undefined;
  assert(user && typeof user.id === "string" && typeof data.token === "string", `Phản hồi auth thiếu user/token cho ${account.email}`);
  const displayName = String(user.displayName ?? "");
  if (displayName !== account.displayName) {
    throw new Error(
      `${account.email} đang có displayName "${displayName}". Chạy lại npm run seed ở auth-service để cập nhật tên tiếng Việt.`
    );
  }
  return {
    token: String(data.token),
    id: String(user.id),
    email: String(user.email),
    displayName,
    role: account.role,
  };
}

function rows(data: Json, key: string): Json[] {
  const value = data[key];
  assert(Array.isArray(value), `Thiếu mảng ${key}`);
  return value as Json[];
}

function atLocal(daysFromToday: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

async function ensureClass(teacher: SessionUser, name: string): Promise<{ id: string; code: string; name: string }> {
  const listed = rows(await api(CORE_BASE, "GET", "/classes/teaching", teacher.token), "classes");
  const matches = listed.filter((item) => item.name === name);
  const existing = matches.length > 0 ? matches[matches.length - 1] : undefined;
  const created = existing ?? (await api(CORE_BASE, "POST", "/classes", teacher.token, { name }, [201])).class;
  assert(created && typeof created === "object", `Không tạo được lớp ${name}`);
  const cls = created as Json;
  return { id: idOf(cls), code: String(cls.code), name: String(cls.name) };
}

async function ensureJoined(student: SessionUser, classId: string, code: string): Promise<void> {
  try {
    await api(CORE_BASE, "GET", `/classes/${classId}`, student.token);
    return;
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 403 && error.status !== 404)) throw error;
  }
  try {
    await api(CORE_BASE, "POST", "/classes/join", student.token, { code });
  } catch (error) {
    if (error instanceof ApiError && error.code === "ALREADY_JOINED") return;
    throw error;
  }
}

interface SessionWanted {
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
  note: string;
}

async function ensureSessions(teacher: SessionUser, classId: string, wanted: SessionWanted[]): Promise<void> {
  const sync = async () => rows(await api(CORE_BASE, "GET", `/classes/${classId}/sessions`, teacher.token), "sessions");
  let sessions = await sync();
  for (const item of wanted) {
    const found = sessions.find((session) => session.weekday === item.weekday && session.startTime === item.startTime && session.endTime === item.endTime);
    if (!found) {
      await api(CORE_BASE, "POST", `/classes/${classId}/sessions`, teacher.token, item, [201]);
    }
  }
  sessions = await sync();
  for (const session of sessions) {
    if (!String(session.note ?? "").startsWith("Demo:")) continue;
    const keep = wanted.some((item) => item.weekday === session.weekday && item.startTime === session.startTime);
    if (!keep) {
      await api(CORE_BASE, "DELETE", `/classes/${classId}/sessions/${idOf(session)}`, teacher.token);
    }
  }
}

async function ensureExam(
  teacher: SessionUser,
  classId: string,
  exam: { title: string; daysAhead: number; durationMinutes: number; room: string; note: string }
): Promise<void> {
  const exams = rows(await api(CORE_BASE, "GET", `/classes/${classId}/exams`, teacher.token), "exams");
  const found = exams.find((item) => item.title === exam.title);
  if (found && Date.parse(String(found.startsAt)) > Date.now()) return;
  if (found) {
    await api(CORE_BASE, "DELETE", `/classes/${classId}/exams/${idOf(found)}`, teacher.token);
  }
  await api(CORE_BASE, "POST", `/classes/${classId}/exams`, teacher.token, {
    title: exam.title,
    startsAt: atLocal(exam.daysAhead, 8, 0),
    durationMinutes: exam.durationMinutes,
    room: exam.room,
    note: exam.note,
  }, [201]);
}

async function ensureMaterial(
  teacher: SessionUser,
  classId: string,
  material: { title: string; url: string; description: string; priceVnd?: number }
): Promise<Json> {
  const materials = rows(await api(CORE_BASE, "GET", `/classes/${classId}/materials`, teacher.token), "materials");
  const found = materials.find((item) => item.title === material.title);
  if (found) {
    const price = Number(found.priceVnd ?? 0);
    const wanted = material.priceVnd ?? 0;
    if (price !== wanted) {
      await api(CORE_BASE, "PATCH", `/classes/${classId}/materials/${idOf(found)}`, teacher.token, {
        title: material.title,
        url: material.url,
        description: material.description,
        priceVnd: wanted,
      });
      return { ...found, priceVnd: wanted };
    }
    return found;
  }
  const created = await api(CORE_BASE, "POST", `/classes/${classId}/materials`, teacher.token, {
    title: material.title,
    url: material.url,
    description: material.description,
    priceVnd: material.priceVnd ?? 0,
  }, [201]);
  return (created.material as Json) ?? created;
}

async function ensurePaidMaterialLockedForStudent(
  teacher: SessionUser,
  student: SessionUser,
  classId: string
): Promise<{ id: string; title: string; priceVnd: number; locked: boolean }> {
  const material = await ensureMaterial(teacher, classId, {
    title: PAID_MATERIAL_TITLE,
    url: "https://reactnative.dev/docs/getting-started",
    description: "Tài liệu premium dùng cho demo mở khóa SePay / Maestro.",
    priceVnd: PAID_MATERIAL_PRICE,
  });
  const materialId = idOf(material);
  await MaterialUnlock.deleteMany({ materialId, userId: student.id });

  const studentView = rows(await api(CORE_BASE, "GET", `/classes/${classId}/materials`, student.token), "materials");
  const paid = studentView.find((item) => item.title === PAID_MATERIAL_TITLE);
  assert(paid, "Học sinh không thấy tài liệu trả phí");
  assert(Boolean(paid.locked), "Tài liệu trả phí phải còn khóa cho student@lms.local");
  assert(Number(paid.priceVnd) === PAID_MATERIAL_PRICE, "Sai giá tài liệu trả phí");
  return {
    id: idOf(paid),
    title: String(paid.title),
    priceVnd: Number(paid.priceVnd),
    locked: Boolean(paid.locked),
  };
}

async function listExercises(teacher: SessionUser, classId: string): Promise<Json[]> {
  return rows(await api(CORE_BASE, "GET", `/classes/${classId}/exercises`, teacher.token), "exercises");
}

async function ensureOpenExercise(
  teacher: SessionUser,
  classId: string,
  exercise: { title: string; description: string; daysAhead: number }
): Promise<void> {
  let found = (await listExercises(teacher, classId)).find((item) => item.title === exercise.title);
  if (!found) {
    const created = await api(CORE_BASE, "POST", `/classes/${classId}/exercises`, teacher.token, {
      title: exercise.title,
      description: exercise.description,
      dueAt: atLocal(exercise.daysAhead, 23, 0),
    }, [201]);
    found = created.exercise as Json;
  }
  const exerciseId = idOf(found);
  const dueAt = Date.parse(String(found.dueAt));
  if (dueAt < Date.now() + 2 * 24 * 3600 * 1000) {
    const submissions = await Submission.find({ exerciseId });
    await Grade.deleteMany({ submissionId: { $in: submissions.map((item) => item._id) } });
    await Submission.deleteMany({ exerciseId });
    await Exercise.updateOne({ _id: exerciseId }, { $set: { dueAt: new Date(atLocal(exercise.daysAhead, 23, 0)) } });
  }
}

async function ensureSubmittedExercise(
  teacher: SessionUser,
  classId: string,
  students: SessionUser[],
  exercise: { title: string; description: string; daysAhead: number; content: string }
): Promise<void> {
  let found = (await listExercises(teacher, classId)).find((item) => item.title === exercise.title);
  if (!found) {
    const created = await api(CORE_BASE, "POST", `/classes/${classId}/exercises`, teacher.token, {
      title: exercise.title,
      description: exercise.description,
      dueAt: atLocal(exercise.daysAhead, 23, 0),
    }, [201]);
    found = created.exercise as Json;
  }
  const exerciseId = idOf(found);
  const dueAt = Date.parse(String(found.dueAt));
  if (dueAt < Date.now() + 24 * 3600 * 1000) {
    await Exercise.updateOne({ _id: exerciseId }, { $set: { dueAt: new Date(atLocal(exercise.daysAhead, 23, 0)) } });
  }
  for (const student of students) {
    await Submission.findOneAndUpdate(
      { exerciseId, studentId: student.id },
      {
        $setOnInsert: {
          content: `${exercise.content} (${student.displayName})`,
          url: "",
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }
}

async function ensureGradedExercise(
  teacher: SessionUser,
  classId: string,
  students: SessionUser[],
  gradedStudent: SessionUser,
  exercise: { title: string; description: string; score: number; feedback: string; content: string; peerContent: string }
): Promise<void> {
  let found = (await listExercises(teacher, classId)).find((item) => item.title === exercise.title);
  if (!found) {
    const created = await api(CORE_BASE, "POST", `/classes/${classId}/exercises`, teacher.token, {
      title: exercise.title,
      description: exercise.description,
      dueAt: atLocal(3, 23, 0),
    }, [201]);
    found = created.exercise as Json;
  }
  const exerciseId = idOf(found);
  const past = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  if (Date.parse(String(found.dueAt)) > Date.now()) {
    await Exercise.updateOne({ _id: exerciseId }, { $set: { dueAt: past } });
  }
  for (const student of students) {
    await Submission.findOneAndUpdate(
      { exerciseId, studentId: student.id },
      {
        $setOnInsert: {
          content: student.id === gradedStudent.id ? exercise.content : exercise.peerContent,
          url: "",
          submittedAt: past,
        },
      },
      { upsert: true, new: true }
    );
  }
  const graded = await Submission.findOne({ exerciseId, studentId: gradedStudent.id });
  assert(graded, "Thiếu bài nộp để chấm điểm");
  await api(
    CORE_BASE,
    "PUT",
    `/classes/${classId}/exercises/${exerciseId}/submissions/${graded._id}/grade`,
    teacher.token,
    { score: exercise.score, feedback: exercise.feedback }
  );
}

async function ensureNeedsGradingExercise(
  teacher: SessionUser,
  classId: string,
  students: SessionUser[],
  exercise: { title: string; description: string; content: string }
): Promise<void> {
  let found = (await listExercises(teacher, classId)).find((item) => item.title === exercise.title);
  if (!found) {
    const created = await api(CORE_BASE, "POST", `/classes/${classId}/exercises`, teacher.token, {
      title: exercise.title,
      description: exercise.description,
      dueAt: atLocal(2, 23, 0),
    }, [201]);
    found = created.exercise as Json;
  }
  const exerciseId = idOf(found);
  const past = new Date(Date.now() - 12 * 3600 * 1000);
  if (Date.parse(String(found.dueAt)) > Date.now()) {
    await Exercise.updateOne({ _id: exerciseId }, { $set: { dueAt: past } });
  }
  for (const student of students) {
    const submission = await Submission.findOneAndUpdate(
      { exerciseId, studentId: student.id },
      {
        $setOnInsert: {
          content: `${exercise.content} — ${student.displayName}`,
          url: "",
          submittedAt: past,
        },
      },
      { upsert: true, new: true }
    );
    await Grade.deleteMany({ submissionId: submission!._id });
  }
}

async function refreshNames(people: SessionUser[], classId: string): Promise<Json[]> {
  for (const person of people) {
    await api(CORE_BASE, "GET", `/classes/${classId}/members`, person.token);
  }
  return rows(await api(CORE_BASE, "GET", `/classes/${classId}/members`, people[0].token), "members");
}

async function main(): Promise<void> {
  const today = new Date().getDay();
  await connectMongo();
  try {
    await waitHealthy(`${AUTH_BASE}/health`);
    await waitHealthy(`${CORE_BASE}/health`);

    const teacher = await loginOrRegister(TEACHER);
    const student = await loginOrRegister(STUDENT);
    const student2 = await loginOrRegister(STUDENT_2);
    const people = [teacher, student, student2];
    const students = [student, student2];

    const mobile = await ensureClass(teacher, "Lập trình di động");
    const database = await ensureClass(teacher, "Cơ sở dữ liệu");
    const uiux = await ensureClass(teacher, "Thiết kế giao diện");
    const classes = [mobile, database, uiux];

    for (const cls of classes) {
      await ensureJoined(student, cls.id, cls.code);
      await ensureJoined(student2, cls.id, cls.code);
    }

    await ensureSessions(teacher, mobile.id, [
      { weekday: today, startTime: "07:30", endTime: "09:15", room: "P.301", note: "Demo: lý thuyết Android" },
      { weekday: (today + 1) % 7, startTime: "09:30", endTime: "11:15", room: "Lab A", note: "Demo: lab Expo Router" },
      { weekday: (today + 2) % 7, startTime: "13:30", endTime: "15:15", room: "P.301", note: "Demo: thực hành Android" },
      { weekday: (today + 4) % 7, startTime: "15:30", endTime: "17:00", room: "P.301", note: "Demo: ôn tập giữa kỳ" },
    ]);
    await ensureSessions(teacher, database.id, [
      { weekday: today, startTime: "09:30", endTime: "11:15", room: "B.204", note: "Demo: SQL và mô hình quan hệ" },
      { weekday: (today + 2) % 7, startTime: "07:30", endTime: "09:15", room: "B.204", note: "Demo: index và tối ưu" },
      { weekday: (today + 3) % 7, startTime: "15:30", endTime: "17:00", room: "B.204", note: "Demo: thực hành truy vấn" },
    ]);
    await ensureSessions(teacher, uiux.id, [
      { weekday: today, startTime: "13:00", endTime: "14:45", room: "Design Lab", note: "Demo: wireframe mobile" },
      { weekday: (today + 3) % 7, startTime: "10:00", endTime: "11:45", room: "Design Lab", note: "Demo: critique UI" },
    ]);

    await ensureExam(teacher, mobile.id, {
      title: "Kiểm tra giữa kỳ Android",
      daysAhead: 10,
      durationMinutes: 90,
      room: "P.301",
      note: "Mang máy tính, không dùng tài liệu",
    });
    await ensureExam(teacher, mobile.id, {
      title: "Quiz Navigation",
      daysAhead: 4,
      durationMinutes: 30,
      room: "Online",
      note: "Làm trên LMS",
    });
    await ensureExam(teacher, database.id, {
      title: "Kiểm tra SQL",
      daysAhead: 17,
      durationMinutes: 60,
      room: "B.204",
      note: "Làm bài trên giấy",
    });
    await ensureExam(teacher, uiux.id, {
      title: "Critique sản phẩm UI",
      daysAhead: 12,
      durationMinutes: 45,
      room: "Design Lab",
      note: "Mang prototype Figma",
    });

    await ensureMaterial(teacher, mobile.id, {
      title: "Slide Navigation",
      url: "https://developer.android.com/guide/navigation",
      description: "Tài liệu buổi học điều hướng màn hình",
    });
    await ensureMaterial(teacher, mobile.id, {
      title: "Checklist nộp bài mobile",
      url: "https://reactnative.dev/docs/upgrading",
      description: "Hướng dẫn nộp bài và kiểm tra trước khi demo",
    });
    await ensureMaterial(teacher, database.id, {
      title: "Tài liệu SQL cơ bản",
      url: "https://www.postgresql.org/docs/current/tutorial-sql.html",
      description: "Tutorial SQL của PostgreSQL",
    });
    await ensureMaterial(teacher, uiux.id, {
      title: "Material Design guidelines",
      url: "https://m3.material.io/",
      description: "Tham khảo hệ thống thiết kế Material 3",
    });
    const paidMaterial = await ensurePaidMaterialLockedForStudent(teacher, student, mobile.id);

    await ensureOpenExercise(teacher, mobile.id, {
      title: "Bài tập Navigation",
      description: "Làm màn danh sách và màn chi tiết, nộp mô tả ngắn.",
      daysAhead: 14,
    });
    await ensureOpenExercise(teacher, mobile.id, {
      title: "Bài tập Auth flow",
      description: "Mô tả luồng đăng nhập / đăng xuất trên app.",
      daysAhead: 9,
    });
    await ensureOpenExercise(teacher, database.id, {
      title: "Bài tập truy vấn SELECT",
      description: "Viết các câu SELECT theo đề trên lớp.",
      daysAhead: 7,
    });
    await ensureOpenExercise(teacher, uiux.id, {
      title: "Wireframe màn Home",
      description: "Nộp link Figma wireframe màn Home student.",
      daysAhead: 11,
    });

    await ensureSubmittedExercise(teacher, mobile.id, students, {
      title: "Bài tập State & Props",
      description: "Nộp ví dụ dùng state/props trong một màn hình.",
      daysAhead: 5,
      content: "Đã nộp ví dụ Counter + props Card.",
    });
    await ensureSubmittedExercise(teacher, database.id, [student], {
      title: "Bài tập JOIN",
      description: "Viết 2 câu JOIN theo schema demo.",
      daysAhead: 6,
      content: "Nộp 2 câu JOIN INNER/LEFT.",
    });

    await ensureGradedExercise(teacher, mobile.id, students, student, {
      title: "Bài tập Component",
      description: "Mô tả các component đã dùng trong bài.",
      score: 8.5,
      feedback: "Bài làm rõ, đúng luồng màn hình.",
      content: "Đã hoàn thành Button, Card và danh sách.",
      peerContent: "Em nộp phần danh sách component, chưa kèm giải thích.",
    });
    await ensureGradedExercise(teacher, database.id, students, student, {
      title: "Bài tập ERD",
      description: "Vẽ ERD cho hệ thống lớp học.",
      score: 9,
      feedback: "ERD đầy đủ quan hệ class–member–exercise.",
      content: "ERD có Class, Member, Exercise, Submission.",
      peerContent: "ERD thiếu quan hệ Submission.",
    });

    await ensureNeedsGradingExercise(teacher, mobile.id, students, {
      title: "Bài tập Offline cache",
      description: "Mô tả chiến lược cache khi mất mạng.",
      content: "Dùng React Query + AsyncStorage snapshot.",
    });
    await ensureNeedsGradingExercise(teacher, uiux.id, [student], {
      title: "Bài tập Design tokens",
      description: "Liệt kê spacing/radius/typography dùng trong app.",
      content: "Tokens spacing lg/md, radius pill, typography body.",
    });

    for (const cls of classes) {
      const members = await refreshNames(people, cls.id);
      const blank = members.filter((member) => !String(member.displayName ?? "").trim());
      assert(blank.length === 0, `Lớp ${cls.name} còn thành viên chưa có displayName`);
    }

    const studentOverview = await api(CORE_BASE, "GET", "/me/overview", student.token);
    const teacherOverview = await api(CORE_BASE, "GET", "/me/overview", teacher.token);
    const studentWork = rows(studentOverview, "work");
    const teacherWork = rows(teacherOverview, "work");
    const futureExams = rows(studentOverview, "exams").filter((exam) => Date.parse(String(exam.startsAt)) > Date.now());
    const todaySessions = rows(studentOverview, "sessions").filter((session) => session.weekday === today);
    const studentMaterials = rows(await api(CORE_BASE, "GET", `/classes/${mobile.id}/materials`, student.token), "materials");
    const lockedPaid = studentMaterials.filter((item) => Number(item.priceVnd ?? 0) > 0 && Boolean(item.locked));

    assert(rows(studentOverview, "classes").length >= 3, "Học sinh chưa có đủ 3 lớp");
    assert(todaySessions.length >= 3, "Chưa có đủ buổi học hôm nay");
    assert(futureExams.length >= 3, "Chưa có đủ kỳ kiểm tra trong tương lai");
    assert(studentWork.filter((item) => item.status === "todo").length >= 3, "Học sinh chưa có đủ bài còn hạn");
    assert(studentWork.some((item) => item.status === "graded" && item.score === 8.5), "Học sinh chưa thấy điểm 8.5");
    assert(teacherWork.some((item) => item.status === "needs_grading"), "Giáo viên chưa thấy bài cần chấm");
    assert(lockedPaid.length >= 1, "Thiếu tài liệu trả phí còn khóa cho Maestro");

    const graded = studentWork.find((item) => item.status === "graded");
    console.log(JSON.stringify({
      ok: true,
      authDb: mongoDbName(process.env.AUTH_MONGO_URI),
      coreDb: mongoDbName(process.env.CORE_MONGO_URI ?? process.env.MONGO_URI),
      weekday: today,
      accounts: people.map((person) => ({ email: person.email, displayName: person.displayName, role: person.role })),
      classes: classes.map((cls) => ({ name: cls.name, code: cls.code })),
      studentTodo: studentWork.filter((item) => item.status === "todo").map((item) => item.title),
      studentSubmitted: studentWork.filter((item) => item.status === "submitted").map((item) => item.title),
      gradedTitle: graded?.title,
      gradedScore: graded?.score,
      teacherNeedsGrading: teacherWork.filter((item) => item.status === "needs_grading").map((item) => item.title),
      futureExams: futureExams.map((exam) => exam.title),
      todaySessionCount: todaySessions.length,
      paidMaterial: {
        id: paidMaterial.id,
        title: paidMaterial.title,
        priceVnd: paidMaterial.priceVnd,
        locked: paidMaterial.locked,
        className: mobile.name,
      },
    }));
  } finally {
    await disconnectMongo();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
