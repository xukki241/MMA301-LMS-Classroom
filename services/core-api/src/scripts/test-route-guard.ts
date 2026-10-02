process.env.NODE_ENV = "production";

import assert from "node:assert/strict";
import type { Server } from "node:http";

async function run() {
  const { createApp } = await import("../app.js");
  const { env } = await import("../config/env.js");
  console.log("Current env.NODE_ENV is:", env.NODE_ENV);

  const app = createApp();
  const server: Server = app.listen(4996, async () => {
    try {
      console.log("Testing Dev Token Route Guard in production mode (port 4996)...");

      const tRes = await fetch("http://localhost:4996/docs/tokens/teacher", { method: "POST" });
      assert.equal(tRes.status, 403, `Expected status 403, got ${tRes.status}`);
      const tData = (await tRes.json()) as { error: string; code: string };
      assert.equal(tData.code, "FORBIDDEN_IN_PRODUCTION");
      assert.equal(tData.error, "Dev token generation is disabled in production");
      console.log("PASS POST /docs/tokens/teacher returns 403 FORBIDDEN_IN_PRODUCTION in production mode");

      const sRes = await fetch("http://localhost:4996/docs/tokens/student", { method: "POST" });
      assert.equal(sRes.status, 403, `Expected status 403, got ${sRes.status}`);
      const sData = (await sRes.json()) as { error: string; code: string };
      assert.equal(sData.code, "FORBIDDEN_IN_PRODUCTION");
      assert.equal(sData.error, "Dev token generation is disabled in production");
      console.log("PASS POST /docs/tokens/student returns 403 FORBIDDEN_IN_PRODUCTION in production mode");

      console.log("All route guard production checks passed!");
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    } finally {
      server.close();
      process.exit(process.exitCode || 0);
    }
  });
}

run();
