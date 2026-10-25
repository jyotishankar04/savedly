import "dotenv/config";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { env } from "../config/env";
import { db } from "./index";
import { seedCore } from "./seed-core";

// Runs on every self-hosted start: migrations, then seed roles, flags and plans (idempotent).
async function bootstrap() {
  const migrationsFolder = resolve(env.MIGRATIONS_DIR);
  console.log(`[bootstrap] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  await seedCore();
  console.log("[bootstrap] database is ready");
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error("[bootstrap] failed:", error);
  process.exit(1);
});
