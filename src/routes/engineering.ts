// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';

export const engineeringRoutes = new Router();

const loadSchema = z.object({
  dailyConsumptionKwh: z.number().min(0),
  peakLoadKw: z.number().min(0),
  backupHours: z.number().min(0).default(6),
});

const solarSchema = z.object({
  monthlyBill: z.number().min(0),
  peakSunHours: z.number().min(1).max(8).default(5),
  roofAreaM2: z.number().min(10),
  systemLoss: z.number().min(0.1).max(0.35).default(0.2),
});

engineeringRoutes.post('/site-analysis', (req, res) => {
  const body = z.object({
    latitude: z.number(),
    longitude: z.number(),
    roofAreaM2: z.number().optional(),
  }).safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  res.json({
    suitability: 'good',
    irradiance: 5.3,
    shadingRisk: 'low',
    traceId: 'ENG-2026-000001',
    formulaVersion: '1.4.0',
  });
});

engineeringRoutes.post('/load', (req, res) => {
  const parsed = loadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const daily = parsed.data.dailyConsumptionKwh;
  const peakLoad = parsed.data.peakLoadKw;
  const recommendedBatteryKwh = (daily * parsed.data.backupHours) / 24;

  res.json({
    result: {
      dailyConsumptionKwh: daily,
      peakLoadKw: peakLoad,
      recommendedBatteryKwh,
    },
    traceId: 'ENG-2026-000002',
    formulaVersion: '1.4.0',
    inputsHash: 'sha256:load-v1',
    warnings: [],
    assumptions: ['battery sizing uses configured outage window'],
  });
});

engineeringRoutes.post('/solar-design', (req, res) => {
  const parsed = solarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const annualKwh = parsed.data.monthlyBill * 12 * 0.42;
  const systemKw = annualKwh / (365 * parsed.data.peakSunHours * (1 - parsed.data.systemLoss));
  const moduleCount = Math.ceil((systemKw * 1000) / 550);

  res.json({
    result: {
      annualEnergyKwh: Number(annualKwh.toFixed(2)),
      pvKwp: Number(systemKw.toFixed(2)),
      modules: moduleCount,
      expectedGeneration: Number((systemKw * parsed.data.peakSunHours * 30).toFixed(2)),
    },
    traceId: 'ENG-2026-000003',
    formulaVersion: '1.4.0',
    inputsHash: 'sha256:solar-v1',
    warnings: [],
    assumptions: ['default solar irradiance and performance ratio assumptions applied'],
  });
});

engineeringRoutes.post('/quote', (req, res) => {
  const body = z.object({
    systemCost: z.number().min(0),
    marginPercent: z.number().min(0).max(100),
    validityDays: z.number().min(1),
  }).safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  const quote = {
    subtotal: body.data.systemCost,
    margin: body.data.systemCost * (body.data.marginPercent / 100),
    total: body.data.systemCost + body.data.systemCost * (body.data.marginPercent / 100),
    validityDays: body.data.validityDays,
  };

  res.json({ quote, traceId: 'ENG-2026-000004' });
});




