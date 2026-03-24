import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

// Use DATABASE_PATH env var for persistent storage (e.g. Railway volumes)
const dbPath = process.env.DATABASE_PATH || "./data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    display_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    sport TEXT NOT NULL,
    bet_type TEXT NOT NULL,
    description TEXT NOT NULL,
    legs TEXT,
    odds TEXT NOT NULL,
    stake REAL NOT NULL,
    result TEXT NOT NULL DEFAULT 'pending',
    payout REAL,
    profit REAL,
    sportsbook TEXT DEFAULT 'DraftKings',
    notes TEXT
  );
`);

// Migration: add user_id column if it doesn't exist (for existing databases)
try {
  sqlite.exec(`ALTER TABLE bets ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;`);
} catch {
  // Column already exists, ignore
}
