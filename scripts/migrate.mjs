// Applies pending migrations from ./drizzle. Runs before `next build` on Vercel (see "vercel-build"
// in package.json), so a production deploy only goes live once its schema is in place; if a
// migration fails, the build fails and the previous deployment keeps serving.
//
// Only production builds migrate. Preview builds skip, so a branch can't change the production schema.
// Run locally with MIGRATE=1 to force it.
//
// Migrations write better over a direct connection than through a transaction-mode pooler, so this uses
// DATABASE_URL_UNPOOLED when set, and otherwise drops Neon's "-pooler" host suffix from DATABASE_URL.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const env = process.env.VERCEL_ENV;
if (env && env !== "production" && !process.env.MIGRATE) {
  console.log(`[migrate] skipped for VERCEL_ENV=${env}`);
  process.exit(0);
}
if (!env && !process.env.MIGRATE) {
  console.log("[migrate] skipped outside Vercel; set MIGRATE=1 to run");
  process.exit(0);
}

const pooled = process.env.DATABASE_URL;
const url = process.env.DATABASE_URL_UNPOOLED ?? pooled?.replace(/-pooler(?=\.)/, "");
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const started = Date.now();
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log(`[migrate] database is up to date (${Date.now() - started} ms)`);
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
