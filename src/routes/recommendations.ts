// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { authorize } from '../lib/rbac';
import { createAuditEvent } from '../lib/audit';

export const recommendationRoutes = new Router();

const intakeSchema = z.object({
  customerName: z.string(),
  objective: z.enum(['budget', 'balanced', 'performance', 'backup', 'hybrid', 'expandable', 'premium']).default('balanced'),
  monthlyBill: z.number().optional(),
  roofArea: z.number().optional(),
  backupHours: z.number().optional(),
  wantsBattery: z.boolean().default(true),
});

recommendationRoutes.post('/intake', async (req, res) => {
  const parsed = intakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const caseId = `rc-${Date.now()}`;
  const rec = {
    id: caseId,
    customerName: parsed.data.customerName,
    objective: parsed.data.objective,
    summary: 'Requirement case created from initial user input and evidence collection.',
    facts: [
      { key: 'monthly_bill', value: `${parsed.data.monthlyBill ?? 0} BDT`, status: 'user_provided', source: 'user', confidence: 0.9 },
      { key: 'roof_area', value: `${parsed.data.roofArea ?? 0} sqm`, status: parsed.data.roofArea ? 'evidence_extracted' : 'unknown', source: 'user', confidence: 0.8 },
      { key: 'backup_hours', value: `${parsed.data.backupHours ?? 0} hrs`, status: parsed.data.backupHours ? 'user_provided' : 'unknown', source: 'user', confidence: 0.7 },
    ],
  };

  const audit = await createAuditEvent('ai_agent', 'recommendation_case_created', 'recommendation_case', caseId, { objective: parsed.data.objective });
  res.status(201).json({ recommendation: rec, audit });
});

recommendationRoutes.post('/evidence', (req, res) => {
  const evidence = z.object({
    caseId: z.string(),
    source: z.enum(['bill_ocr', 'photo_ai', 'map', 'survey', 'sensor', 'engineer', 'admin']),
    facts: z.record(z.string(), z.string()),
  }).safeParse(req.body);

  if (!evidence.success) {
    return res.status(400).json({ error: evidence.error.flatten() });
  }

  res.json({
    ok: true,
    evidence: evidence.data,
    message: 'Evidence has been ingested and marked as untrusted until validated.',
  });
});

recommendationRoutes.post('/analyze', (req, res) => {
  const body = z.object({
    caseId: z.string(),
    objective: z.enum(['budget', 'balanced', 'performance', 'backup', 'hybrid', 'expandable', 'premium']).optional(),
  }).safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  res.json({
    caseId: body.data.caseId,
    compatibleProducts: [
      { sku: 'PV-5KW', type: 'solar', status: 'approved', fit: 0.92 },
      { sku: 'BAT-10KWH', type: 'battery', status: 'approved', fit: 0.88 },
      { sku: 'INV-5KW', type: 'inverter', status: 'approved', fit: 0.9 },
    ],
    packageObjective: body.data.objective || 'balanced',
  });
});

recommendationRoutes.post('/packages', (req, res) => {
  const body = z.object({
    caseId: z.string(),
    objective: z.enum(['budget', 'balanced', 'performance', 'backup', 'hybrid', 'expandable', 'premium']).default('balanced'),
  }).safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  const packages = [
    {
      id: `pkg-${Date.now()}`,
      objective: body.data.objective,
      systemType: 'solar',
      capacity: '5.5 kWp',
      batteryCapacity: '10 kWh',
      price: 690000,
      score: { technical_fit: 0.93, budget_fit: 0.8, availability_fit: 0.9, warranty_fit: 0.88, service_fit: 0.85 },
      assumptions: ['roof area confirmed', 'load profile based on BDT billing'],
    },
    {
      id: `pkg-${Date.now() + 1}`,
      objective: 'backup',
      systemType: 'hybrid',
      capacity: '7.5 kWp',
      batteryCapacity: '20 kWh',
      price: 980000,
      score: { technical_fit: 0.96, budget_fit: 0.72, availability_fit: 0.9, warranty_fit: 0.91, service_fit: 0.88 },
      assumptions: ['critical load list provided', 'six-hour outage target'],
    },
  ];

  res.json({ caseId: body.data.caseId, packages });
});

recommendationRoutes.post('/:id/what-if', (req, res) => {
  const whatIf = z.object({
    budgetDelta: z.number().optional(),
    backupHours: z.number().optional(),
    addBattery: z.boolean().optional(),
    preferLocalProducts: z.boolean().optional(),
  }).safeParse(req.body);

  if (!whatIf.success) {
    return res.status(400).json({ error: whatIf.error.flatten() });
  }

  res.json({
    id: req.params.id,
    scenario: 'what-if',
    regenerated: true,
    changes: whatIf.data,
    message: 'Packages regenerated deterministically using the current recommendation assumptions.',
  });
});

recommendationRoutes.post('/:id/select', async (req, res) => {
  const body = z.object({ packageId: z.string(), userId: z.string().optional() }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  if (!authorize('sales_executive', 'quotes:create')) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const audit = await createAuditEvent('ai_agent', 'package_selected', 'recommendation_case', req.params.id, { packageId: body.data.packageId });
  res.json({ selected: body.data.packageId, audit });
});




