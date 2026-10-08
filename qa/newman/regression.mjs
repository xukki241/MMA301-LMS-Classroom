import newman from "newman";
import { randomBytes } from "node:crypto";
import { redactedAccountSummary, resolveStagingAccounts } from "../lib/staging-credentials.mjs";

const authUrl = (process.env.AUTH_URL ?? "http://127.0.0.1:4001").replace(/\/$/, "");
const coreUrl = (process.env.CORE_URL ?? "http://127.0.0.1:4002").replace(/\/$/, "");
const accounts = resolveStagingAccounts();
const includeGrade = process.env.NEWMAN_GRADE !== "0";
const dueOffsetSec = Number(process.env.SMOKE_DUE_OFFSET_SEC ?? "90");

const registerItems = accounts.registerTemporaryUsers
  ? [
      request(
        "Register teacher",
        "POST",
        `${authUrl}/auth/register`,
        [
          "pm.test('register teacher 201', () => pm.response.to.have.status(201));",
        ],
        { email: accounts.teacherEmail, displayName: "QA Newman Teacher", password: accounts.teacherPassword, role: "teacher" },
      ),
      request(
        "Register student",
        "POST",
        `${authUrl}/auth/register`,
        [
          "pm.test('register student 201', () => pm.response.to.have.status(201));",
        ],
        { email: accounts.studentEmail, displayName: "QA Newman Student", password: accounts.studentPassword, role: "student" },
      ),
    ]
  : [];

const loginTeacherBody = { email: accounts.teacherEmail, password: accounts.teacherPassword };
const loginStudentBody = { email: accounts.studentEmail, password: accounts.studentPassword };

const exerciseDueScript = [
  `const due = new Date(Date.now() + ${dueOffsetSec * 1000}).toISOString();`,
  "pm.environment.set('exercise_due_at', due);",
];

const gradeWaitScript = includeGrade
  ? [
      "const due = new Date(pm.environment.get('exercise_due_at'));",
      "const waitMs = Math.max(0, due.getTime() - Date.now() + 2000);",
      "const start = Date.now();",
      "while (Date.now() - start < waitMs) { /* sync wait for due date */ }",
    ]
  : [];

const collection = {
  info: { name: "LMS release regression", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  item: [
    ...registerItems,
    request("Auth health", "GET", `${authUrl}/health`, ["pm.test('health is 200', () => pm.response.to.have.status(200));", "pm.test('health payload is healthy', () => pm.expect(pm.response.json().ok).to.equal(true));"]),
    request("Core health", "GET", `${coreUrl}/health`, ["pm.test('health is 200', () => pm.response.to.have.status(200));", "pm.test('health payload is healthy', () => pm.expect(pm.response.json().ok).to.equal(true));"]),
    request("Login teacher", "POST", `${authUrl}/auth/login`, ["pm.test('login is 200', () => pm.response.to.have.status(200));", "const body = pm.response.json(); pm.test('token returned', () => pm.expect(body.token).to.be.a('string').and.not.empty); pm.environment.set('teacher_token', body.token);"], loginTeacherBody),
    request("Login student", "POST", `${authUrl}/auth/login`, ["pm.test('login is 200', () => pm.response.to.have.status(200));", "const body = pm.response.json(); pm.test('token returned', () => pm.expect(body.token).to.be.a('string').and.not.empty); pm.environment.set('student_token', body.token);"], loginStudentBody),
    request("Teacher creates class", "POST", `${coreUrl}/classes`, ["pm.test('class created', () => pm.response.to.have.status(201));", "const body = pm.response.json(); pm.test('class envelope valid', () => pm.expect(body.class._id).to.match(/^[a-f0-9]{24}$/)); pm.expect(body.class.code).to.match(/^[A-Z0-9]{6}$/); pm.environment.set('class_id', body.class._id); pm.environment.set('class_code', body.class.code);"], { name: `Newman regression ${randomBytes(3).toString("hex")}` }, "{{teacher_token}}"),
    request("Student joins class", "POST", `${coreUrl}/classes/join`, ["pm.test('join succeeded', () => pm.response.to.have.status(200));", "pm.test('membership returned', () => pm.expect(pm.response.json().membership.roleInClass).to.equal('student'));"], { code: "{{class_code}}" }, "{{student_token}}"),
    request("Unauthenticated class is rejected", "GET", `${coreUrl}/classes/{{class_id}}`, ["pm.test('missing token is 401', () => pm.response.to.have.status(401));"]),
    request("Teacher creates post", "POST", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('post created', () => pm.response.to.have.status(201));", "pm.test('post envelope valid', () => pm.expect(pm.response.json().post._id).to.match(/^[a-f0-9]{24}$/));"], { content: "Newman release regression post" }, "{{teacher_token}}"),
    request("Student reads post feed", "GET", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('feed is 200', () => pm.response.to.have.status(200));", "pm.test('feed is an array', () => pm.expect(pm.response.json().posts).to.be.an('array').and.not.empty);"], undefined, "{{student_token}}"),
    request("Student cannot create post", "POST", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('student write is forbidden', () => pm.response.to.have.status(403));"], { content: "forbidden" }, "{{student_token}}"),
    request(
      "Teacher creates exercise",
      "POST",
      `${coreUrl}/classes/{{class_id}}/exercises`,
      [
        "pm.test('exercise created', () => pm.response.to.have.status(201));",
        "const body = pm.response.json();",
        "pm.test('exercise id valid', () => pm.expect(body.exercise._id).to.match(/^[a-f0-9]{24}$/));",
        "pm.environment.set('exercise_id', body.exercise._id);",
      ],
      { title: "Newman exercise", description: "Regression", dueAt: "{{exercise_due_at}}" },
      "{{teacher_token}}",
      exerciseDueScript,
    ),
    request(
      "Student submits exercise",
      "POST",
      `${coreUrl}/classes/{{class_id}}/exercises/{{exercise_id}}/submissions`,
      [
        "pm.test('submission created', () => pm.response.to.have.status(201));",
        "const body = pm.response.json();",
        "pm.test('submission id valid', () => pm.expect(body.submission._id).to.match(/^[a-f0-9]{24}$/));",
        "pm.environment.set('submission_id', body.submission._id);",
      ],
      { content: "Newman answer", url: "" },
      "{{student_token}}",
    ),
    ...(includeGrade
      ? [
          request(
            "Wait for exercise due date",
            "GET",
            `${coreUrl}/health`,
            ["pm.test('health still ok after wait', () => pm.response.to.have.status(200));"],
            undefined,
            undefined,
            gradeWaitScript,
          ),
          request(
            "Teacher grades submission",
            "PUT",
            `${coreUrl}/classes/{{class_id}}/exercises/{{exercise_id}}/submissions/{{submission_id}}/grade`,
            [
              "pm.test('grade saved', () => pm.response.to.have.status(200));",
              "pm.test('score valid', () => pm.expect(pm.response.json().grade.score).to.equal(8.5));",
            ],
            { score: 8.5, feedback: "Good" },
            "{{teacher_token}}",
          ),
          request(
            "Student reads graded submission",
            "GET",
            `${coreUrl}/classes/{{class_id}}/exercises/{{exercise_id}}/submissions/mine`,
            [
              "pm.test('mine is 200', () => pm.response.to.have.status(200));",
              "pm.test('grade visible', () => pm.expect(pm.response.json().grade.score).to.equal(8.5));",
            ],
            undefined,
            "{{student_token}}",
          ),
        ]
      : []),
  ],
};

function request(name, method, rawUrl, tests, body, token, prerequest = []) {
  const events = [];
  if (prerequest.length) {
    events.push({ listen: "prerequest", script: { type: "text/javascript", exec: prerequest } });
  }
  events.push({ listen: "test", script: { type: "text/javascript", exec: tests } });
  const item = { name, event: events, request: { method, header: [], url: rawUrl } };
  if (token) item.request.auth = { type: "bearer", bearer: [{ key: "token", value: token, type: "string" }] };
  if (body) {
    item.request.header.push({ key: "Content-Type", value: "application/json" });
    item.request.body = { mode: "raw", raw: JSON.stringify(body), options: { raw: { language: "json" } } };
  }
  return item;
}

console.log(JSON.stringify({
  authUrl,
  coreUrl,
  accounts: redactedAccountSummary(accounts),
  gradeFlow: includeGrade ? "enabled" : "skipped (NEWMAN_GRADE=0)",
}, null, 2));

const minAssertions = includeGrade ? 18 : 15;

newman.run({
  collection,
  environment: { name: "runtime", values: [] },
  reporters: ["cli", "junit"],
  reporter: { junit: { export: "test-reports/newman.xml" } },
  bail: true,
  timeoutScript: 180_000,
  timeoutRequest: 60_000,
}, (error, summary) => {
  if (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
    return;
  }
  const failures = summary.run.failures ?? [];
  const assertions = summary.run.stats.assertions;
  console.log(`Newman assertions: ${assertions.total}, failed: ${assertions.failed}`);
  if (assertions.total < minAssertions || failures.length > 0 || assertions.failed > 0) process.exitCode = 1;
});
