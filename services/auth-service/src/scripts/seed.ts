import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { connectMongo, disconnectMongo } from "../db/mongo.js";
import { User } from "../models/User.js";

async function seed() {
  await connectMongo();

  const passwordHash = await bcrypt.hash(env.SEED_PASSWORD, 12);
  const accounts = [
    {
      email: env.SEED_TEACHER_EMAIL,
      displayName: "Demo Teacher",
      role: "teacher" as const,
    },
    {
      email: env.SEED_STUDENT_EMAIL,
      displayName: "Demo Student",
      role: "student" as const,
    },
  ];

  for (const account of accounts) {
    await User.findOneAndUpdate(
      { email: account.email },
      { ...account, passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`seeded ${account.role}: ${account.email}`);
  }

  await disconnectMongo();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
