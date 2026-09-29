import { Router } from 'express';
import { asc, desc, eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { appliances, orders, packages, productCatalog, projectRequestAppliances, projectRequests, users } from '../db/schema.js';
import { calculateRenewableProject } from '../services/renewableCalculation.js';
import { fetchWeatherForLocation } from '../services/weather.js';
import { sendOrderConfirmationEmail } from '../services/email.js';

export const renewableRoutes = Router();

const applianceSelection = z.object({
  applianceId: z.string().min(1),
  name: z.string().optional(),
  category: z.string().optional(),
  ratedPowerW: z.number().positive().optional(),
  surgePowerW: z.number().positive().optional(),
  quantity: z.number().int().min(1).max(100),
  dailyHours: z.number().min(0.1).max(24),
});

const estimateSchema = z.object({
  type: z.enum(['solar', 'wind', 'hybrid']),
  location: z.object({
    division: z.string().min(1),
    district: z.string().min(1),
    upazila: z.string().min(1),
    village: z.string().min(1),
  }),
  configuration: z.object({
    system: z.enum(['on-grid', 'off-grid', 'hybrid-grid']),
    locationType: z.enum(['urban', 'rural', 'city']).optional(),
    rooftopType: z.enum(['concrete', 'metal', 'tile', 'other']).optional(),
    rooftopAreaSqFt: z.number().positive().optional(),
    towerHeightM: z.number().positive().optional(),
    terrainType: z.enum(['open_coastal', 'plain', 'suburban', 'obstructed']).optional(),
  }),
  appliances: z.array(applianceSelection).min(1),
  selectedPanelId: z.string().uuid().optional(),
  selectedInverterId: z.string().uuid().optional(),
  selectedBatteryId: z.string().uuid().optional(),
  selectedTurbineId: z.string().uuid().optional(),
});

// 1. Appliances catalog
renewableRoutes.get('/appliances', async (_req, res) => {
  try {
    const list = await db.select().from(appliances).where(eq(appliances.active, true)).orderBy(asc(appliances.category), asc(appliances.name));
    return res.json({ appliances: list });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 2. Products catalog
renewableRoutes.get('/products', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  try {
    const query = category
      ? db.select().from(productCatalog).where(and(eq(productCatalog.category, category), eq(productCatalog.status, 'approved'))).orderBy(asc(productCatalog.name))
      : db.select().from(productCatalog).where(eq(productCatalog.status, 'approved')).orderBy(asc(productCatalog.name));
    const rows = await query;
    return res.json({ products: rows.map((row) => ({ ...row, price: Number(row.regularPrice) })) });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 3. Recommended Packages (Admin managed)
renewableRoutes.get('/packages', async (_req, res) => {
  try {
    const list = await db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.totalPrice));
    return res.json({ packages: list });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 4. Weather integration
renewableRoutes.get('/weather', async (req, res) => {
  const district = typeof req.query.district === 'string' ? req.query.district : 'Dhaka';
  const division = typeof req.query.division === 'string' ? req.query.division : undefined;
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;

  try {
    const weather = await fetchWeatherForLocation(district, division, lat, lng);
    return res.json({ weather });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// 5. Engineering Estimate Calculation
renewableRoutes.post('/estimate', async (req, res) => {
  const parsed = estimateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const estimate = await calculateRenewableProject(parsed.data);
    return res.json({ estimate });
  } catch (error) {
    console.error('Calculation error:', error);
    return res.status(500).json({ error: (error as Error).message || 'calculation_failed' });
  }
});

// 6. Project Request & Order Creation
const requestCreationSchema = estimateSchema.extend({
  userId: z.string().uuid().optional(),
  customerName: z.string().min(2),
  contactNumber: z.string().min(7),
  email: z.string().email().optional(),
  address: z.string().optional(),
  paymentMethod: z.enum(['sslcommerz', 'cod']).default('cod'),
});

renewableRoutes.post('/requests', async (req, res) => {
  const parsed = requestCreationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    // 1. Run full engineering calculation
    const estimate = await calculateRenewableProject({
      type: parsed.data.type,
      location: parsed.data.location,
      configuration: parsed.data.configuration,
      appliances: parsed.data.appliances,
      selectedPanelId: parsed.data.selectedPanelId,
      selectedInverterId: parsed.data.selectedInverterId,
      selectedBatteryId: parsed.data.selectedBatteryId,
      selectedTurbineId: parsed.data.selectedTurbineId,
    });

    // 2. Save projectRequest
    const [request] = await db.insert(projectRequests).values({
      userId: parsed.data.userId,
      type: parsed.data.type,
      status: 'submitted',
      configuration: {
        location: parsed.data.location,
        configuration: parsed.data.configuration,
      },
      estimate,
    }).returning();

    // 3. Save appliances selected
    const validAppliances = parsed.data.appliances.filter((a) => a.applianceId.includes('-'));
    if (validAppliances.length > 0) {
      await db.insert(projectRequestAppliances).values(
        validAppliances.map((s) => ({
          projectRequestId: request.id,
          applianceId: s.applianceId,
          quantity: s.quantity,
          dailyHours: String(s.dailyHours),
        }))
      ).catch(() => null);
    }

    // 4. Generate Order Record
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const initialStatus = parsed.data.paymentMethod === 'sslcommerz' ? 'awaiting_payment' : 'submitted';

    const [order] = await db.insert(orders).values({
      orderNumber,
      userId: parsed.data.userId,
      projectRequestId: request.id,
      projectType: parsed.data.type,
      status: initialStatus,
      customerName: parsed.data.customerName,
      contactNumber: parsed.data.contactNumber,
      email: parsed.data.email,
      division: parsed.data.location.division,
      district: parsed.data.location.district,
      upazila: parsed.data.location.upazila,
      village: parsed.data.location.village,
      address: parsed.data.address || `${parsed.data.location.village}, ${parsed.data.location.upazila}`,
      configuration: {
        location: parsed.data.location,
        configuration: parsed.data.configuration,
      },
      estimate,
      pricing: estimate.pricing,
      totalAmount: String(estimate.pricing.finalTotal),
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: 'pending',
    }).returning();

    // 5. Send order confirmation email if email is provided
    if (parsed.data.email) {
      void sendOrderConfirmationEmail({
        orderNumber,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.email,
        projectType: parsed.data.type,
        systemCapacityKwp: estimate.systemSizing.totalSystemCapacityKwp,
        totalAmount: estimate.pricing.finalTotal,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: 'pending',
        division: parsed.data.location.division,
        district: parsed.data.location.district,
        address: parsed.data.address,
      }).then(() => {
        db.update(orders).set({ emailSent: true }).where(eq(orders.id, order.id)).catch(() => null);
      }).catch(() => null);
    }

    return res.status(201).json({ request, order, estimate });
  } catch (error) {
    console.error('Request creation error:', error);
    return res.status(500).json({ error: (error as Error).message || 'request_creation_failed' });
  }
});

// 7. Get Customer Orders / Project Requests
renewableRoutes.get('/orders', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  try {
    const list = userId
      ? await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));
    return res.json({ orders: list });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 8. Get Single Order Details with Installation Document & BOM
renewableRoutes.get('/orders/:id', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    return res.json({ order });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 9. Update order
renewableRoutes.patch('/orders/:id', async (req, res) => {
  try {
    const [updated] = await db.update(orders).set({ ...req.body, updatedAt: new Date() }).where(eq(orders.id, req.params.id)).returning();
    return updated ? res.json({ order: updated }) : res.status(404).json({ error: 'order_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});