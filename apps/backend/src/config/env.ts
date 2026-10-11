export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || '',
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
  SSLCOMMERZ_IS_SANDBOX: process.env.SSLCOMMERZ_IS_SANDBOX !== 'false',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/solaragent',
};
