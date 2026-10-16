import path from "path";
import fs from "fs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

export type DB = NodePgDatabase<typeof schema>;

export let db: DB;

const migrationsFolder = path.resolve(process.cwd(), "migrations");

/**
 * Connects to Postgres and applies any pending migrations.
 * - DATABASE_URL set (e.g. Neon): uses a normal Postgres connection.
 * - Not set, outside production: uses PGlite, an embedded Postgres stored in ./.data,
 *   so the app runs locally with zero setup.
 */
export async function initDb(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 5 });
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres connection string (e.g. from Neon) to the environment.",
    );
  }

  const dataDir = process.env.PGLITE_DIR || path.resolve(process.cwd(), ".data/pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dataDir);
  const pgliteDb = drizzle(client, { schema });
  await migrate(pgliteDb, { migrationsFolder });
  // Both drivers expose the same query builder; the cast keeps one type across the app.
  db = pgliteDb as unknown as DB;
}
