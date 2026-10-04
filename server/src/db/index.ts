import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// pg's default drops a connection after 10 idle seconds, and a new one costs a
// full TCP + TLS + auth handshake (over a second to a remote database), which
// the next request then pays. Keep them for five minutes instead.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

export const db = drizzle({ client: pool });

// Lets a service function accept either the top-level `db` or an in-flight
// transaction client, so callers composing multiple writes atomically (e.g.
// admin/plans assigning a plan while also logging the audit entry) can pass
// their own `tx` through instead of each service opening its own nested
// transaction.
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
