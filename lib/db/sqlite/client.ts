/**
 * SQLite client — the single place a better-sqlite3 connection is opened.
 *
 * The connection (and its drizzle wrapper) is cached on `globalThis` so that
 * Next.js dev-server HMR, which re-evaluates modules on every edit, does not
 * reopen the database file over and over.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "../schema";

type DrizzleDb = BetterSQLite3Database<typeof schema>;

interface CompassDbCache {
  sqlite: Database.Database;
  db: DrizzleDb;
}

const globalForDb = globalThis as typeof globalThis & {
  __compassDb?: CompassDbCache;
};

function openDb(): CompassDbCache {
  const path = process.env.DATABASE_PATH || "./data/compass.db";

  const dir = dirname(path);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

const cache: CompassDbCache = globalForDb.__compassDb ?? openDb();
if (!globalForDb.__compassDb) {
  globalForDb.__compassDb = cache;
}

/** The drizzle ORM instance, typed with the Compass schema. */
export const db: DrizzleDb = cache.db;

/** The raw better-sqlite3 connection (for pragmas, migrations, raw SQL). */
export const sqlite: Database.Database = cache.sqlite;
