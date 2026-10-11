// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import {
  createDevice,
  createInventoryItem,
  createNEMApplication,
  createUtility,
  createWorkOrder,
  deleteDevice,
  deleteInventoryItem,
  deleteNEMApplication,
  deleteUtility,
  deleteWorkOrder,
  getDevice,
  getInventoryItem,
  getNEMApplication,
  getUtility,
  getWorkOrder,
  listDevices,
  listInventoryItems,
  listNEMApplications,
  listUtilities,
  listWorkOrders,
  updateDevice,
  updateInventoryItem,
  updateNEMApplication,
  updateUtility,
  updateWorkOrder,
} from '../store';

export const domainRoutes = new Router();

const utilitySchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  region: z.string().min(1),
  status: z.enum(['configurable', 'active', 'inactive']).default('active'),
});

const inventorySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().int().min(0),
  status: z.enum(['available', 'reserved', 'picked', 'dispatched', 'installed', 'damaged', 'quarantine']).default('available'),
  warehouse: z.string().min(1),
});

const workOrderSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['scheduled', 'in_progress', 'blocked', 'completed']).default('scheduled'),
  technician: z.string().min(1),
  dueDate: z.string().optional(),
});

const nemSchema = z.object({
  siteId: z.string().min(1),
  utility: z.string().min(1),
  status: z.enum(['submitted', 'inspection_scheduled', 'approved', 'active', 'exception']).default('submitted'),
  applicationRef: z.string().min(1),
});

const deviceSchema = z.object({
  siteId: z.string().min(1),
  type: z.enum(['inverter', 'battery', 'meter', 'weather', 'gateway']),
  status: z.enum(['online', 'offline', 'warning']).default('offline'),
  lastSeenAt: z.string().optional(),
});

function parsePatch<T extends z.AnyZodObject>(schema: T, body: unknown) {
  return schema.partial().safeParse(body);
}

function getId(req: { params: { id?: string } }) {
  return req.params.id ?? '';
}

domainRoutes.get('/utilities', (_req, res) => res.json({ utilities: listUtilities() }));
domainRoutes.post('/utilities', (req, res) => {
  const parsed = utilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ utility: createUtility(parsed.data) });
});
domainRoutes.get('/utilities/:id', (req, res) => {
  const utility = getUtility(getId(req));
  return utility ? res.json({ utility }) : res.status(404).json({ error: 'utility_not_found' });
});
domainRoutes.patch('/utilities/:id', (req, res) => {
  const parsed = parsePatch(utilitySchema, req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const utility = updateUtility(getId(req), parsed.data);
  return utility ? res.json({ utility }) : res.status(404).json({ error: 'utility_not_found' });
});
domainRoutes.delete('/utilities/:id', (req, res) => {
  return deleteUtility(getId(req)) ? res.status(204).send() : res.status(404).json({ error: 'utility_not_found' });
});

domainRoutes.get('/inventory', (_req, res) => res.json({ items: listInventoryItems() }));
domainRoutes.post('/inventory', (req, res) => {
  const parsed = inventorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ item: createInventoryItem(parsed.data) });
});
domainRoutes.get('/inventory/:id', (req, res) => {
  const item = getInventoryItem(getId(req));
  return item ? res.json({ item }) : res.status(404).json({ error: 'inventory_item_not_found' });
});
domainRoutes.patch('/inventory/:id', (req, res) => {
  const parsed = parsePatch(inventorySchema, req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const item = updateInventoryItem(getId(req), parsed.data);
  return item ? res.json({ item }) : res.status(404).json({ error: 'inventory_item_not_found' });
});
domainRoutes.delete('/inventory/:id', (req, res) => {
  return deleteInventoryItem(getId(req)) ? res.status(204).send() : res.status(404).json({ error: 'inventory_item_not_found' });
});

domainRoutes.get('/work-orders', (_req, res) => res.json({ workOrders: listWorkOrders() }));
domainRoutes.post('/work-orders', (req, res) => {
  const parsed = workOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ workOrder: createWorkOrder(parsed.data) });
});
domainRoutes.get('/work-orders/:id', (req, res) => {
  const workOrder = getWorkOrder(getId(req));
  return workOrder ? res.json({ workOrder }) : res.status(404).json({ error: 'work_order_not_found' });
});
domainRoutes.patch('/work-orders/:id', (req, res) => {
  const parsed = parsePatch(workOrderSchema, req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workOrder = updateWorkOrder(getId(req), parsed.data);
  return workOrder ? res.json({ workOrder }) : res.status(404).json({ error: 'work_order_not_found' });
});
domainRoutes.delete('/work-orders/:id', (req, res) => {
  return deleteWorkOrder(getId(req)) ? res.status(204).send() : res.status(404).json({ error: 'work_order_not_found' });
});

domainRoutes.get('/nem-applications', (_req, res) => res.json({ applications: listNEMApplications() }));
domainRoutes.post('/nem-applications', (req, res) => {
  const parsed = nemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ application: createNEMApplication(parsed.data) });
});
domainRoutes.get('/nem-applications/:id', (req, res) => {
  const application = getNEMApplication(getId(req));
  return application ? res.json({ application }) : res.status(404).json({ error: 'nem_application_not_found' });
});
domainRoutes.patch('/nem-applications/:id', (req, res) => {
  const parsed = parsePatch(nemSchema, req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const application = updateNEMApplication(getId(req), parsed.data);
  return application ? res.json({ application }) : res.status(404).json({ error: 'nem_application_not_found' });
});
domainRoutes.delete('/nem-applications/:id', (req, res) => {
  return deleteNEMApplication(getId(req)) ? res.status(204).send() : res.status(404).json({ error: 'nem_application_not_found' });
});

domainRoutes.get('/devices', (_req, res) => res.json({ devices: listDevices() }));
domainRoutes.post('/devices', (req, res) => {
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ device: createDevice(parsed.data) });
});
domainRoutes.get('/devices/:id', (req, res) => {
  const device = getDevice(getId(req));
  return device ? res.json({ device }) : res.status(404).json({ error: 'device_not_found' });
});
domainRoutes.patch('/devices/:id', (req, res) => {
  const parsed = parsePatch(deviceSchema, req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const device = updateDevice(getId(req), parsed.data);
  return device ? res.json({ device }) : res.status(404).json({ error: 'device_not_found' });
});
domainRoutes.delete('/devices/:id', (req, res) => {
  return deleteDevice(getId(req)) ? res.status(204).send() : res.status(404).json({ error: 'device_not_found' });
});




