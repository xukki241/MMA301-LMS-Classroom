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

const configured = process.env.MAESTRO_BIN;
const candidates = [
  configured,
  `${process.env.LOCALAPPDATA || ""}\\maestro-cli\\maestro\\bin\\maestro.bat`,
  "maestro",
].filter(Boolean);
const executable = candidates[0];
const args = process.argv.includes("--exercise")
  ? ["test", "qa/maestro/exercise-module.yaml"]
  : ["test", "qa/maestro/auth-and-class.yaml"];

const child = spawn(executable, args, {
  stdio: "inherit",
  shell: executable.endsWith(".bat"),
  env: { ...process.env, MAESTRO_EMAIL: email, MAESTRO_PASSWORD: password },
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(`Unable to start Maestro. Set MAESTRO_BIN or install the CLI: ${error.message}`);
  process.exit(1);
});
