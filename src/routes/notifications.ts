import { Router } from '../lib/router';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db/client';
import { notifications } from '../db/schema';
import { requireAuth } from './auth';

export const notificationRoutes = new Router();
notificationRoutes.use('/notifications', requireAuth);
const audience = (user: { id: string; role: string }) => or(
  eq(notifications.userId, user.id),
  and(isNull(notifications.userId), eq(notifications.role, user.role)),
  and(isNull(notifications.userId), isNull(notifications.role)),
);
notificationRoutes.get('/notifications', async (req, res) => {
  const list = await db.select().from(notifications).where(audience(req.user)).orderBy(desc(notifications.createdAt)).limit(50);
  return res.json({ notifications: list, unreadCount: list.filter((n) => !n.isRead).length });
});
notificationRoutes.patch('/notifications/:id/read', async (req, res) => {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, req.params.id), audience(req.user)));
  return res.json({ success: true });
});
notificationRoutes.post('/notifications/mark-all-read', async (req, res) => {
  await db.update(notifications).set({ isRead: true }).where(audience(req.user));
  return res.json({ success: true });
});
