import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

// PostgreSQL DATE type OID = 1082.
// By default, pg converts DATE to a JS Date object at local midnight,
// which then gets serialized by res.json() via toISOString() — shifting
// the date backward for any timezone ahead of UTC (e.g. India, UTC+5:30).
// Returning the raw string instead avoids that silent corruption.
types.setTypeParser(1082, (value: string) => value);

// Render (and most managed Postgres hosts) require SSL for connections.
// Local development doesn't use SSL, so this only applies when
// DATABASE_URL points at a remote host — detected here rather than
// hardcoded, so local dev is unaffected.
const isRemoteDb = process.env.DATABASE_URL?.includes("render.com") ?? false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});