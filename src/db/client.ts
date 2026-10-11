import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/solaragent';

export const hasDatabaseConfig = Boolean(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: process.env.VERCEL === '1' ? 1 : 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
});
export const db = drizzle(pool);

export async function closeDatabase() {
  await pool.end();
}
