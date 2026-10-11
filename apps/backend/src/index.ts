import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth.js';
import { leadRoutes } from './routes/leads.js';
import { siteRoutes } from './routes/sites.js';
import { recommendationRoutes } from './routes/recommendations.js';
import { engineeringRoutes } from './routes/engineering.js';
import { quoteRoutes } from './routes/quotes.js';
import { projectRoutes } from './routes/projects.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { ticketRoutes } from './routes/tickets.js';
import { auditRoutes } from './routes/audit.js';
import { domainRoutes } from './routes/domains.js';
import { surveyRoutes } from './routes/surveys.js';
import { procurementRoutes } from './routes/procurement.js';
import { adminRoutes } from './routes/admin.js';
import { renewableRoutes } from './routes/renewable.js';
import { paymentRoutes } from './routes/payment.js';
import { chatRoutes } from './routes/chat.js';
import { inventoryRoutes } from './routes/inventory.js';
import { supplierRoutes } from './routes/suppliers.js';
import { technicianRoutes } from './routes/technicians.js';
import { notificationRoutes } from './routes/notifications.js';
import { db } from './db/client.js';
import { sql } from 'drizzle-orm';

export const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.get('/health', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ ok: true, service: 'solaragent-backend', database: 'connected' });
  } catch (error) {
    console.error('Health check database failure:', error);
    res.status(503).json({ ok: false, service: 'solaragent-backend', database: 'unavailable' });
  }
});
app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ ok: true, service: 'solaragent-backend', database: 'connected' });
  } catch (error) {
    console.error('Health check database failure:', error);
    res.status(503).json({ ok: false, service: 'solaragent-backend', database: 'unavailable' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', inventoryRoutes);
app.use('/api/v1', supplierRoutes);
app.use('/api/v1', technicianRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/sites', siteRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/engineering', engineeringRoutes);
app.use('/api/v1/quotes', quoteRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/sites', monitoringRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1', domainRoutes);
app.use('/api/v1/surveys', surveyRoutes);
app.use('/api/v1', renewableRoutes);
app.use('/api/v1/renewable', renewableRoutes);
app.use('/api/v1', procurementRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/chat', chatRoutes);

// Compatibility aliases for /api without /v1
app.use('/api', renewableRoutes);
app.use('/api', adminRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', supplierRoutes);
app.use('/api', technicianRoutes);
app.use('/api', notificationRoutes);
app.use('/api/renewable', renewableRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'route_not_found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});

if (process.env.VERCEL !== '1') {
  const server = app.listen(port, () => {
    console.log(`SolarAgent Pro backend listening on http://localhost:${port}`);
  });

  function shutdown(signal: string) {
    console.log(`${signal} received; shutting down`);
    server.close(() => process.exit(0));
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;
