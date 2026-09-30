import "dotenv/config";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import { seedCore } from "./seed-core";

// Runs before the server on every start of the self-hosted container
// (docker/server-entrypoint.sh): applies pending migrations, then makes sure
// roles, feature flags and plans exist. Both steps are idempotent, so an
// upgrade is just "pull the new image and start it".
async function bootstrap() {
  const migrationsFolder = resolve(process.env.MIGRATIONS_DIR ?? "./drizzle");
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
