// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';

export const siteRoutes = new Router();

const siteSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  utility: z.string().optional(),
});

siteRoutes.post('/', (req, res) => {
  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  res.status(201).json({
    id: `site-${Date.now()}`,
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});




