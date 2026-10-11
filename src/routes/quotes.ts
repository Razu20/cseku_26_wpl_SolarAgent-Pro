// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';

export const quoteRoutes = new Router();

quoteRoutes.post('/:id/approve', (req, res) => {
  const schema = z.object({ approved: z.boolean(), approver: z.string() }).safeParse(req.body);
  if (!schema.success) {
    return res.status(400).json({ error: schema.error.flatten() });
  }

  res.json({
    quoteId: req.params.id,
    status: schema.data.approved ? 'approved' : 'pending',
    approver: schema.data.approver,
  });
});




