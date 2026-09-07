import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectMongo } from "./db/mongo.js";
import { syncCoreIndexes } from "./models/index.js";

async function main() {
  await connectMongo();
  await syncCoreIndexes();
  const app = createApp();
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`core-api on ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("core-api failed to start", err);
  process.exit(1);
});
