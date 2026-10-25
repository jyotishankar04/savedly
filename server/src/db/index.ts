import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";

// pg's default drops a connection after 10 idle seconds, and a new one costs a
// full TCP + TLS + auth handshake (over a second to a remote database), which
// the next request then pays. Keep them for five minutes instead.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

export const db = drizzle({ client: pool });

// Lets a service take either `db` or a transaction, so callers can compose several writes atomically.
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
