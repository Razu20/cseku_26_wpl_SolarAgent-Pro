import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/solaragent';

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool);

export async function closeDatabase() {
  await pool.end();
}