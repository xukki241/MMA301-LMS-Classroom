import { createApp } from "../app.js";
import type { Server } from "http";

async function testDocs() {
  const app = createApp();
  const server: Server = app.listen(4999, async () => {
    try {
      console.log("Testing Scalar Docs endpoints on temporary port 4999...");

      // 1. Test /openapi.json
      const openApiRes = await fetch("http://localhost:4999/openapi.json");
      if (openApiRes.status !== 200) {
        throw new Error(`Expected 200 for /openapi.json, got ${openApiRes.status}`);
      }
      const spec = await openApiRes.json();
      console.log("✅ GET /openapi.json returned 200 OK");
      console.log("   Title:", spec.info?.title);
      console.log("   Endpoints count:", Object.keys(spec.paths || {}).length);

      // 2. Test /docs
      const docsRes = await fetch("http://localhost:4999/docs");
      if (docsRes.status !== 200) {
        throw new Error(`Expected 200 for /docs, got ${docsRes.status}`);
      }
      const html = await docsRes.text();
      console.log("✅ GET /docs returned 200 OK");
      console.log("   HTML Content Length:", html.length);
      console.log("   Contains Scalar reference:", html.includes("scalar") || html.includes("Scalar"));

      console.log("\n🎉 ALL SCALAR DOCS TESTS PASSED!");
    } catch (err) {
      console.error("Test failed:", err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

testDocs();
