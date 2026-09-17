import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

// PostgreSQL DATE type OID = 1082.
// By default, pg converts DATE to a JS Date object at local midnight,
// which then gets serialized by res.json() via toISOString() — shifting
// the date backward for any timezone ahead of UTC (e.g. India, UTC+5:30).
// Returning the raw string instead avoids that silent corruption.
types.setTypeParser(1082, (value: string) => value);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });