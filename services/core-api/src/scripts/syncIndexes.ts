import { connectMongo, disconnectMongo } from "../db/mongo.js";
import { syncCoreIndexes } from "../models/index.js";

async function main() {
  await connectMongo();
  await syncCoreIndexes();
  console.log("lms_core indexes synced");
  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
