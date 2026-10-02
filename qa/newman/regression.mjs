import newman from "newman";

const authUrl = process.env.AUTH_URL ?? "http://127.0.0.1:4001";
const coreUrl = process.env.CORE_URL ?? "http://127.0.0.1:4002";
const collection = {
  info: { name: "LMS release regression", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  item: [
    request("Auth health", "GET", `${authUrl}/health`, ["pm.test('health is 200', () => pm.response.to.have.status(200));", "pm.test('health payload is healthy', () => pm.expect(pm.response.json().ok).to.equal(true));"]),
    request("Core health", "GET", `${coreUrl}/health`, ["pm.test('health is 200', () => pm.response.to.have.status(200));", "pm.test('health payload is healthy', () => pm.expect(pm.response.json().ok).to.equal(true));"]),
    request("Login teacher", "POST", `${authUrl}/auth/login`, ["pm.test('login is 200', () => pm.response.to.have.status(200));", "const body = pm.response.json(); pm.test('token returned', () => pm.expect(body.token).to.be.a('string').and.not.empty); pm.environment.set('teacher_token', body.token);"], { email: "teacher@lms.local", password: "Demo123!" }),
    request("Login student", "POST", `${authUrl}/auth/login`, ["pm.test('login is 200', () => pm.response.to.have.status(200));", "const body = pm.response.json(); pm.test('token returned', () => pm.expect(body.token).to.be.a('string').and.not.empty); pm.environment.set('student_token', body.token);"], { email: "student@lms.local", password: "Demo123!" }),
    request("Teacher creates class", "POST", `${coreUrl}/classes`, ["pm.test('class created', () => pm.response.to.have.status(201));", "const body = pm.response.json(); pm.test('class envelope valid', () => pm.expect(body.class._id).to.match(/^[a-f0-9]{24}$/)); pm.expect(body.class.code).to.match(/^[A-Z0-9]{6}$/); pm.environment.set('class_id', body.class._id); pm.environment.set('class_code', body.class.code);"], { name: "Newman release regression" }, "{{teacher_token}}"),
    request("Student joins class", "POST", `${coreUrl}/classes/join`, ["pm.test('join succeeded', () => pm.response.to.have.status(200));", "pm.test('membership returned', () => pm.expect(pm.response.json().membership.roleInClass).to.equal('student'));"], { code: "{{class_code}}" }, "{{student_token}}"),
    request("Unauthenticated class is rejected", "GET", `${coreUrl}/classes/{{class_id}}`, ["pm.test('missing token is 401', () => pm.response.to.have.status(401));"]),
    request("Teacher creates post", "POST", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('post created', () => pm.response.to.have.status(201));", "pm.test('post envelope valid', () => pm.expect(pm.response.json().post._id).to.match(/^[a-f0-9]{24}$/));"], { content: "Newman release regression post" }, "{{teacher_token}}"),
    request("Student reads post feed", "GET", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('feed is 200', () => pm.response.to.have.status(200));", "pm.test('feed is an array', () => pm.expect(pm.response.json().posts).to.be.an('array').and.not.empty);"], undefined, "{{student_token}}"),
    request("Student cannot create post", "POST", `${coreUrl}/classes/{{class_id}}/posts`, ["pm.test('student write is forbidden', () => pm.response.to.have.status(403));"], { content: "forbidden" }, "{{student_token}}"),
  ],
};

function request(name, method, rawUrl, tests, body, token) {
  const item = { name, event: [{ listen: "test", script: { type: "text/javascript", exec: tests } }], request: { method, header: [], url: rawUrl } };
  if (token) item.request.auth = { type: "bearer", bearer: [{ key: "token", value: token, type: "string" }] };
  if (body) {
    item.request.header.push({ key: "Content-Type", value: "application/json" });
    item.request.body = { mode: "raw", raw: JSON.stringify(body), options: { raw: { language: "json" } } };
  }
  return item;
}

newman.run({
  collection,
  environment: { name: "local", values: [] },
  reporters: ["cli", "junit"],
  reporter: { junit: { export: "test-reports/newman.xml" } },
  bail: true,
}, (error, summary) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  const failures = summary.run.failures ?? [];
  const assertions = summary.run.stats.assertions;
  console.log(`Newman assertions: ${assertions.total}, failed: ${assertions.failed}`);
  if (assertions.total < 10 || failures.length > 0 || assertions.failed > 0) process.exitCode = 1;
});
