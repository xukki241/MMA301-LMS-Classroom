import { spawn } from "node:child_process";

const configured = process.env.MAESTRO_BIN;
const candidates = [
  configured,
  `${process.env.LOCALAPPDATA || ""}\\maestro-cli\\maestro\\bin\\maestro.bat`,
  "maestro",
].filter(Boolean);
const executable = candidates[0].includes("\\") ? candidates[0] : candidates[0];
const child = spawn(executable, ["test", "qa/maestro"], { stdio: "inherit", shell: executable.endsWith(".bat") });
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(`Unable to start Maestro. Set MAESTRO_BIN or install the CLI: ${error.message}`);
  process.exit(1);
});
