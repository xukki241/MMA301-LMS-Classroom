import { randomBytes } from "node:crypto";

/**
 * Resolve QA accounts for staging/local smoke. Never log passwords or tokens from here.
 * Pre-provisioned accounts come only from SMOKE_* env vars. SMOKE_REGISTER_TEMP=1
 * creates disposable users and does not read a stored password.
 */
function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required unless SMOKE_REGISTER_TEMP=1`);
  }
  return value;
}

export function resolveStagingAccounts() {
  const registerTemporaryUsers = process.env.SMOKE_REGISTER_TEMP === "1";
  const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;

  if (registerTemporaryUsers) {
    const generatedPassword = `Qa-${randomBytes(18).toString("base64url")}!`;
    return {
      registerTemporaryUsers,
      suffix,
      teacherEmail: `qa.teacher.${suffix}@example.test`,
      teacherPassword: generatedPassword,
      studentEmail: `qa.student.${suffix}@example.test`,
      studentPassword: generatedPassword,
    };
  }

  return {
    registerTemporaryUsers,
    suffix,
    teacherEmail: requiredEnv("SMOKE_TEACHER_EMAIL"),
    teacherPassword: requiredEnv("SMOKE_TEACHER_PASSWORD"),
    studentEmail: requiredEnv("SMOKE_STUDENT_EMAIL"),
    studentPassword: requiredEnv("SMOKE_STUDENT_PASSWORD"),
  };
}

export function redactedAccountSummary(accounts) {
  return accounts.registerTemporaryUsers
    ? "temporary QA accounts registered; identifiers redacted"
    : "pre-provisioned QA accounts";
}
