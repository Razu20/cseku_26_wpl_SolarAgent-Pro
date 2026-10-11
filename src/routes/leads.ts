// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { createAuditEvent } from '../lib/audit';

export const leadRoutes = new Router();

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional(),
  source: z.string().default('web'),
  location: z.string().optional(),
  status: z.string().default('new'),
});

leadRoutes.get('/', async (_req, res) => {
  try { return res.json({ leads: await db.select().from(leads).orderBy(asc(leads.createdAt)) }); }
  catch { return res.status(503).json({ error: 'database_unavailable' }); }
});

leadRoutes.post('/', async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [lead] = await db.insert(leads).values(parsed.data).returning();
    const audit = createAuditEvent('system', 'lead_created', 'lead', lead.id, { lead });
    return res.status(201).json({ lead, audit });
  } catch { return res.status(503).json({ error: 'database_unavailable' }); }
});

leadRoutes.get('/:id', async (req, res) => {
  try { const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)); return lead ? res.json({ lead }) : res.status(404).json({ error: 'lead_not_found' }); }
  catch { return res.status(503).json({ error: 'database_unavailable' }); }
});

leadRoutes.patch('/:id', async (req, res) => {
  const parsed = leadSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try { const [lead] = await db.update(leads).set({ ...parsed.data, updatedAt: new Date() }).where(eq(leads.id, req.params.id)).returning(); return lead ? res.json({ lead }) : res.status(404).json({ error: 'lead_not_found' }); }
  catch { return res.status(503).json({ error: 'database_unavailable' }); }
});

leadRoutes.delete('/:id', async (req, res) => {
  try { const [lead] = await db.delete(leads).where(eq(leads.id, req.params.id)).returning(); return lead ? res.status(204).send() : res.status(404).json({ error: 'lead_not_found' }); }
  catch { return res.status(503).json({ error: 'database_unavailable' }); }
});




