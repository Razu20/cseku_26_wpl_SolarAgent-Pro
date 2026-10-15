import { requireAuth, requireRole } from './routes/auth';
import { Router } from './lib/router';
import { authRoutes } from './routes/auth'; import { leadRoutes } from './routes/leads'; import { siteRoutes } from './routes/sites'; import { recommendationRoutes } from './routes/recommendations'; import { engineeringRoutes } from './routes/engineering'; import { quoteRoutes } from './routes/quotes'; import { projectRoutes } from './routes/projects'; import { monitoringRoutes } from './routes/monitoring'; import { ticketRoutes } from './routes/tickets'; import { auditRoutes } from './routes/audit'; import { domainRoutes } from './routes/domains'; import { surveyRoutes } from './routes/surveys'; import { procurementRoutes } from './routes/procurement'; import { adminRoutes } from './routes/admin'; import { renewableRoutes } from './routes/renewable'; import { paymentRoutes } from './routes/payment'; import { chatRoutes } from './routes/chat'; import { inventoryRoutes } from './routes/inventory'; import { supplierRoutes } from './routes/suppliers'; import { technicianRoutes } from './routes/technicians'; import { notificationRoutes } from './routes/notifications';
export const apiRouter=new Router();
// Default-deny legacy operations. Customer-owned resources enforce ownership in
// their own handlers; public access is restricted to explicit catalog workflows.
apiRouter.use('/', (req, res, next) => {
  const path = req.pathname || '/';
  const publicCatalog = req.method === 'GET' && /^\/(products|appliances|companies|categories|packages|weather|suppliers)(\/[^/]+)?$/.test(path);
  const publicEstimate = req.method === 'POST' && /^\/(renewable\/)?estimate$/.test(path);
  const delegated = /^\/(auth|admin|payments|notifications|orders|technician)(\/|$)/.test(path)
    || /^\/(renewable\/)?(requests|quotes\/save|orders)(\/|$)/.test(path)
    || /^\/renewable\/(products|appliances|companies|categories|packages|weather)(\/[^/]+)?$/.test(path)
    || path === '/chat' || path === '/chat/ticket';
  if (publicCatalog || publicEstimate || delegated) return next();
  return requireAuth(req, res, () => requireRole(['admin'])(req, res, next));
});
apiRouter.use('/auth',authRoutes); apiRouter.use('/',adminRoutes); apiRouter.use('/',inventoryRoutes); apiRouter.use('/',supplierRoutes); apiRouter.use('/',technicianRoutes); apiRouter.use('/',notificationRoutes); apiRouter.use('/leads',leadRoutes); apiRouter.use('/sites',siteRoutes); apiRouter.use('/recommendations',recommendationRoutes); apiRouter.use('/engineering',engineeringRoutes); apiRouter.use('/quotes',quoteRoutes); apiRouter.use('/projects',projectRoutes); apiRouter.use('/sites',monitoringRoutes); apiRouter.use('/tickets',ticketRoutes); apiRouter.use('/audit',auditRoutes); apiRouter.use('/',domainRoutes); apiRouter.use('/surveys',surveyRoutes); apiRouter.use('/',renewableRoutes); apiRouter.use('/renewable',renewableRoutes); apiRouter.use('/',procurementRoutes); apiRouter.use('/payments',paymentRoutes); apiRouter.use('/chat',chatRoutes);

