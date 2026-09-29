import { Router } from 'express';
import { z } from 'zod';

export const monitoringRoutes = Router();

monitoringRoutes.post('/telemetry', (req, res) => {
  const schema = z.object({
    deviceId: z.string(),
    metric: z.string(),
    value: z.number(),
    unit: z.string(),
    timestamp: z.string().optional(),
  }).safeParse(req.body);

  if (!schema.success) {
    return res.status(400).json({ error: schema.error.flatten() });
  }

  res.status(201).json({ accepted: true, ...schema.data });
});

monitoringRoutes.get('/:id/monitoring', (req, res) => {
  res.json({
    siteId: req.params.id,
    metrics: [{ metric: 'pv_power_kw', value: 3.2, unit: 'kW' }],
    alarms: [],
  });
});
