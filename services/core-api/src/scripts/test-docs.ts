import { createApp } from "../app.js";
import type { Server } from "http";

async function testDocs() {
  const app = createApp();
  const server: Server = app.listen(4998, async () => {
    try {
      console.log("Testing updated Scalar Docs & Token endpoints on port 4998...");

      // 1. Test /docs/tokens/teacher
      const teacherRes = await fetch("http://localhost:4998/docs/tokens/teacher", { method: "POST" });
      if (teacherRes.status !== 200) throw new Error(`Expected 200 for teacher token, got ${teacherRes.status}`);
      const teacherData = await teacherRes.json();
      console.log("OK POST /docs/tokens/teacher returned token (length):", teacherData.token?.length);
      console.log("   Role:", teacherData.role, "| Email:", teacherData.email);

      // 2. Test /docs/tokens/student
      const studentRes = await fetch("http://localhost:4998/docs/tokens/student", { method: "POST" });
      if (studentRes.status !== 200) throw new Error(`Expected 200 for student token, got ${studentRes.status}`);
      const studentData = await studentRes.json();
      console.log("OK POST /docs/tokens/student returned token (length):", studentData.token?.length);
      console.log("   Role:", studentData.role, "| Email:", studentData.email);

      // 3. Test /openapi.json
      const openApiRes = await fetch("http://localhost:4998/openapi.json");
      if (openApiRes.status !== 200) throw new Error(`Expected 200 for /openapi.json, got ${openApiRes.status}`);
      const spec = await openApiRes.json();
      console.log("OK GET /openapi.json returned 200 OK");
      console.log("   Endpoints count:", Object.keys(spec.paths || {}).length);

      // 4. Test /docs
      const docsRes = await fetch("http://localhost:4998/docs");
      if (docsRes.status !== 200) throw new Error(`Expected 200 for /docs, got ${docsRes.status}`);
      console.log("OK GET /docs returned 200 OK");

      console.log("\nALL VERIFICATION CHECKS PASSED!");
    } catch (err) {
      console.error("Test failed:", err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

testDocs();
