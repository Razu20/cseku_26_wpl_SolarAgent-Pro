export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || '',
  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || '',
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
  SSLCOMMERZ_IS_SANDBOX: process.env.SSLCOMMERZ_IS_SANDBOX !== 'false',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000',
  PUBLIC_API_URL: process.env.PUBLIC_API_URL || 'http://localhost:3000',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => {
      const trimmed = origin.trim().replace(/\/+$/, '');
      try {
        return trimmed ? new URL(trimmed).origin : '';
      } catch {
        return trimmed;
      }
    })
    .filter(Boolean),
  DATABASE_URL: process.env.DATABASE_URL || '',
};

