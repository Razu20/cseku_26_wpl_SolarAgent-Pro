import { Router } from 'express';
import { desc, eq, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { verifyToken } from './auth.js';

export const notificationRoutes = Router();

notificationRoutes.get('/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
    const payload = verifyToken(token);

    const allNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);

    let filtered = allNotifs;
    if (payload) {
      filtered = allNotifs.filter(
        (n) => (n.userId && n.userId === payload.id) || (n.role && n.role === payload.role) || !n.role
      );
    }

    const unreadCount = filtered.filter((n) => !n.isRead).length;

    return res.json({ notifications: filtered, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

notificationRoutes.patch('/notifications/:id/read', async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

notificationRoutes.post('/notifications/mark-all-read', async (_req, res) => {
  try {
    await db.update(notifications).set({ isRead: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});
