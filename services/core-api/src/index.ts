import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectMongo } from "./db/mongo.js";
import { syncCoreIndexes } from "./models/index.js";

async function main() {
  await connectMongo();
  await syncCoreIndexes();
  const app = createApp();
  app.listen(env.PORT, "0.0.0.0", () => {
    const sepayLive = Boolean(env.SEPAY_MERCHANT_ID && env.SEPAY_SECRET_KEY && env.SEPAY_CHECKOUT_URL);
    console.log(
      `core-api on ${env.PORT} · PUBLIC_CORE_URL=${env.PUBLIC_CORE_URL} · SePay=${sepayLive ? "LIVE" : "demo"}`
    );
  });
}

main().catch((err) => {
  console.error("core-api failed to start", err);
  process.exit(1);
});
