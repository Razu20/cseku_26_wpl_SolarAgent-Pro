import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
// Explicitly preserve certificate and hostname validation for hosted PostgreSQL.
const connectionUrl = databaseUrl ? new URL(databaseUrl) : undefined;
if (connectionUrl && ['require', 'prefer', 'verify-ca'].includes(connectionUrl.searchParams.get('sslmode') || '')) {
  connectionUrl.searchParams.set('sslmode', 'verify-full');
}
const globalDatabase = globalThis as typeof globalThis & { solarPool?: Pool };

export const hasDatabaseConfig = Boolean(process.env.DATABASE_URL);

export const pool = globalDatabase.solarPool ?? new Pool({
  connectionString: connectionUrl?.toString(),
  max: process.env.VERCEL === '1' ? 1 : 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
  query_timeout: 20_000,
});
pool.on('error', (error) => console.error('PostgreSQL idle connection error:', (error as { code?: string }).code || 'connection_error'));
if (process.env.NODE_ENV !== 'production') globalDatabase.solarPool = pool;
export const db = drizzle(pool);

export async function closeDatabase() {
  await pool.end();
}
