import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectMongo } from "./db/mongo.js";

async function main() {
  await connectMongo();
  const app = createApp();
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`auth-service on ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("auth-service failed to start", err);
  process.exit(1);
});
