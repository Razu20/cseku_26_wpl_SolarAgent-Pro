import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './apps/backend/src/db/schema.ts',
  out: './apps/backend/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/solaragent',
  },
} satisfies Config;
