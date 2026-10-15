import 'dotenv/config';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { is, Table } from 'drizzle-orm';
import * as schema from './schema';
import { pool } from './client';

try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    "select table_name, column_name from information_schema.columns where table_schema = 'public'",
  );
  const missing: string[] = [];
  for (const table of Object.values(schema)) {
    if (!is(table, Table)) continue;
    const config = getTableConfig(table as any);
    for (const column of config.columns) {
      if (!rows.some((row) => row.table_name === config.name && row.column_name === column.name)) missing.push(`${config.name}.${column.name}`);
    }
  }
  console.log(JSON.stringify({ connected: true, missingColumns: missing }, null, 2));
  if (missing.length) process.exitCode = 1;
} catch (error) {
  console.error('Database check failed:', (error as { code?: string }).code || 'configuration_or_connection_error');
  process.exitCode = 1;
} finally {
  await pool.end();
}
