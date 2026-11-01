import { spawn } from "node:child_process";

const email = process.env.MAESTRO_EMAIL?.trim();
const password = process.env.MAESTRO_PASSWORD;

if (!email || !password) {
  console.error(
    "Maestro auth flows require MAESTRO_EMAIL and MAESTRO_PASSWORD in the shell (staging QA accounts or freshly registered test users). " +
      "Do not commit credentials. For API-only temp registration use SMOKE_REGISTER_TEMP=1 with npm run test:staging.",
  );
  process.exit(1);
}

const paymentMode = (process.env.MAESTRO_PAYMENT || "demo").trim().toLowerCase();
if (paymentMode !== "demo" && paymentMode !== "live") {
  console.error('MAESTRO_PAYMENT must be "demo" (default) or "live".');
  process.exit(1);
}

const configured = process.env.MAESTRO_BIN;
const candidates = [
  configured,
  `${process.env.LOCALAPPDATA || ""}\\maestro-cli\\maestro\\bin\\maestro.bat`,
  "maestro",
].filter(Boolean);
const executable = candidates[0];

const flow = process.argv.includes("--payment")
  ? "qa/maestro/payment-unlock.yaml"
  : process.argv.includes("--exercise")
    ? "qa/maestro/exercise-module.yaml"
    : "qa/maestro/auth-and-class.yaml";

const env = {
  ...process.env,
  MAESTRO_EMAIL: email,
  MAESTRO_PASSWORD: password,
  MAESTRO_PAYMENT: paymentMode,
  MAESTRO_CLASS_NAME: process.env.MAESTRO_CLASS_NAME?.trim() || "Lập trình di động",
  MAESTRO_PAID_MATERIAL:
    process.env.MAESTRO_PAID_MATERIAL?.trim() || "Bài giảng Premium · React Native",
};

if (flow.endsWith("payment-unlock.yaml")) {
  console.log(
    paymentMode === "live"
      ? "Maestro payment flow: LIVE assert-only (bank/SePay UI; no real transfer)."
      : "Maestro payment flow: demo (confirm-demo). Set MAESTRO_PAYMENT=live for LIVE UI assert-only.",
  );
}

const child = spawn(executable, ["test", flow], {
  stdio: "inherit",
  shell: executable.endsWith(".bat"),
  env,
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(`Unable to start Maestro. Set MAESTRO_BIN or install the CLI: ${error.message}`);
  process.exit(1);
});
