import { db, hasDatabaseConfig } from '../../../src/db/client';
import { sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (!hasDatabaseConfig) return Response.json({ ok: false, service: 'solaragent', database: 'unavailable', error: 'database_not_configured' }, { status: 503, headers });
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, service: 'solaragent', database: 'connected' }, { headers });
  } catch {
    return Response.json({ ok: false, service: 'solaragent', database: 'unavailable' }, { status: 503, headers });
  }
}
