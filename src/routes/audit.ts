import { and, asc, eq } from 'drizzle-orm';
import { Router } from '../lib/router';
import { db } from '../db/client';
import { auditLog } from '../db/schema';
export const auditRoutes = new Router();
auditRoutes.get('/:entity/:id', async (req, res) => {
  const history = await db.select().from(auditLog).where(and(eq(auditLog.entityType, req.params.entity), eq(auditLog.entityId, req.params.id))).orderBy(asc(auditLog.createdAt));
  return res.json({ entity: req.params.entity, id: req.params.id, history: history.map((event) => ({ ...event, timestamp: event.createdAt })) });
});
