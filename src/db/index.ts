import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse one connection pool across dev hot reloads.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
// prepare: false so the app also works through a transaction-mode pooler (Neon, Supabase).
const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export * from "./schema";
