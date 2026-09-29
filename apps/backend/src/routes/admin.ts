import { Router } from 'express';
import { z } from 'zod';
import { asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  adminSettings,
  appliances,
  orders,
  packages,
  productCatalog,
  projectRequests,
  technicianPayments,
  technicians,
  technicianTypes,
  users,
  utilities,
} from '../db/schema.js';
import { hashPassword } from '../lib/password.js';

export const adminRoutes = Router();

// ==========================================
// 1. USER MANAGEMENT (Section 27)
// ==========================================
adminRoutes.get('/admin/users', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    let filtered = allUsers;

    if (role && role !== 'all') {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.contactNumber && u.contactNumber.includes(q)) ||
          (u.district && u.district.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit).map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      contactNumber: u.contactNumber,
      division: u.division,
      district: u.district,
      upazila: u.upazila,
      village: u.village,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return res.json({ users: paginated, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.get('/admin/users/:id', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
    const userRequests = await db.select().from(projectRequests).where(eq(projectRequests.userId, user.id)).orderBy(desc(projectRequests.createdAt));

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        contactNumber: user.contactNumber,
        division: user.division,
        district: user.district,
        upazila: user.upazila,
        village: user.village,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      orders: userOrders,
      requests: userRequests,
    });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.patch('/admin/users/:id', async (req, res) => {
  const { isActive, fullName, contactNumber, role } = req.body;
  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(fullName ? { fullName: String(fullName) } : {}),
        ...(contactNumber ? { contactNumber: String(contactNumber) } : {}),
        ...(role && (role === 'admin' || role === 'customer') ? { role } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning();

    return updated ? res.json({ user: updated }) : res.status(404).json({ error: 'user_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).default('password123'),
  fullName: z.string().min(2),
  role: z.enum(['customer', 'admin']).default('customer'),
  contactNumber: z.string().min(7),
  division: z.string().default('Dhaka'),
  district: z.string().default('Dhaka'),
  upazila: z.string().default('Mirpur'),
  village: z.string().default('Dhaka'),
});

adminRoutes.post('/admin/users', async (req, res) => {
  const parsed = adminCreateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const existing = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase()));
    if (existing.length > 0) return res.status(409).json({ error: 'email_already_exists' });

    const passwordHash = await hashPassword(parsed.data.password);
    const [created] = await db.insert(users).values({
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      contactNumber: parsed.data.contactNumber,
      division: parsed.data.division,
      district: parsed.data.district,
      upazila: parsed.data.upazila,
      village: parsed.data.village,
      isActive: true,
    }).returning();

    return res.status(201).json({ user: created });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/users/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(users).where(eq(users.id, req.params.id)).returning();
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'user_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 2. ORDER MONITORING (Section 28)
// ==========================================
adminRoutes.get('/admin/orders', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const projectType = typeof req.query.projectType === 'string' ? req.query.projectType : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  try {
    let orderList = await db.select().from(orders).orderBy(desc(orders.createdAt));

    if (status && status !== 'all') {
      orderList = orderList.filter((o) => o.status === status);
    }
    if (projectType && projectType !== 'all') {
      orderList = orderList.filter((o) => o.projectType === projectType);
    }
    if (search) {
      orderList = orderList.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search) ||
          o.district.toLowerCase().includes(search) ||
          o.contactNumber.includes(search)
      );
    }

    // Attach technician details if assigned
    const allTechs = await db.select().from(technicians);
    const techMap = new Map(allTechs.map((t) => [t.id, t]));

    const populated = orderList.map((o) => ({
      ...o,
      technician: o.technicianId ? techMap.get(o.technicianId) || null : null,
    }));

    return res.json({ orders: populated });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.get('/admin/orders/:id', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    if (!order) return res.status(404).json({ error: 'order_not_found' });

    let technician = null;
    if (order.technicianId) {
      const [tech] = await db.select().from(technicians).where(eq(technicians.id, order.technicianId));
      technician = tech || null;
    }

    return res.json({ order: { ...order, technician } });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.patch('/admin/orders/:id', async (req, res) => {
  const { status, technicianId, scheduledDate, paymentStatus, notes } = req.body;
  try {
    const [updated] = await db
      .update(orders)
      .set({
        ...(status ? { status } : {}),
        ...(technicianId !== undefined ? { technicianId: technicianId || null } : {}),
        ...(scheduledDate !== undefined ? { scheduledDate } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    return updated ? res.json({ order: updated }) : res.status(404).json({ error: 'order_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

const adminCreateOrderSchema = z.object({
  customerName: z.string().min(2),
  contactNumber: z.string().min(7),
  email: z.string().email().optional(),
  division: z.string().min(2),
  district: z.string().min(2),
  upazila: z.string().min(2),
  village: z.string().min(2),
  address: z.string().optional(),
  projectType: z.enum(['solar', 'wind', 'hybrid']).default('solar'),
  systemType: z.enum(['on-grid', 'off-grid', 'hybrid-grid']).default('on-grid'),
  capacityKwp: z.number().positive().default(3.0),
  totalAmount: z.number().positive(),
  paymentMethod: z.enum(['cod', 'sslcommerz', 'bank_transfer']).default('cod'),
  paymentStatus: z.enum(['pending', 'paid', 'verified', 'failed']).default('pending'),
  status: z.enum(['submitted', 'confirmed', 'site_survey_scheduled', 'in_progress', 'completed', 'cancelled']).default('submitted'),
  technicianId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

adminRoutes.post('/admin/orders', async (req, res) => {
  const parsed = adminCreateOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  try {
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      customerName: parsed.data.customerName,
      contactNumber: parsed.data.contactNumber,
      email: parsed.data.email || 'customer@example.com',
      division: parsed.data.division,
      district: parsed.data.district,
      upazila: parsed.data.upazila,
      village: parsed.data.village,
      address: parsed.data.address || `${parsed.data.village}, ${parsed.data.upazila}, ${parsed.data.district}`,
      projectType: parsed.data.projectType,
      status: parsed.data.status,
      totalAmount: String(parsed.data.totalAmount),
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: parsed.data.paymentStatus,
      technicianId: parsed.data.technicianId || null,
      notes: parsed.data.notes,
      configuration: {
        system: parsed.data.systemType,
        capacityKwp: parsed.data.capacityKwp,
        source: 'admin_manual_order',
      },
      estimate: {
        generation: {
          dailyKwh: Math.round(parsed.data.capacityKwp * 4.2 * 0.8),
          monthlyKwh: Math.round(parsed.data.capacityKwp * 4.2 * 30 * 0.8),
          annualKwh: Math.round(parsed.data.capacityKwp * 4.2 * 365 * 0.8),
        },
      },
      pricing: {
        finalTotal: parsed.data.totalAmount,
        currency: 'BDT',
      },
    }).returning();

    return res.status(201).json({ order: newOrder });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/orders/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(orders).where(eq(orders.id, req.params.id)).returning();
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'order_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 3. TECHNICIAN MANAGEMENT (Section 29)
// ==========================================
const technicianSchema = z.object({
  name: z.string().min(2),
  contactNumber: z.string().min(7),
  email: z.string().email(),
  address: z.string().optional(),
  technicianTypeId: z.string().uuid().optional(),
  skills: z.array(z.string()).default([]),
  experienceYears: z.number().int().nonnegative().default(1),
  availability: z.enum(['available', 'busy', 'on_leave']).default('available'),
  serviceArea: z.string().min(2).default('Dhaka'),
  paymentInfo: z.record(z.any()).optional(),
  active: z.boolean().default(true),
});

adminRoutes.get('/admin/technicians', async (_req, res) => {
  try {
    const list = await db.select().from(technicians).orderBy(asc(technicians.name));
    const types = await db.select().from(technicianTypes);
    const typeMap = new Map(types.map((t) => [t.id, t]));

    const populated = list.map((tech) => ({
      ...tech,
      technicianType: tech.technicianTypeId ? typeMap.get(tech.technicianTypeId) || null : null,
    }));

    return res.json({ technicians: populated });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/technicians', async (req, res) => {
  const parsed = technicianSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [tech] = await db.insert(technicians).values(parsed.data).returning();
    return res.status(201).json({ technician: tech });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/technicians/:id', async (req, res) => {
  const parsed = technicianSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [tech] = await db.update(technicians).set({ ...parsed.data, updatedAt: new Date() }).where(eq(technicians.id, req.params.id)).returning();
    return tech ? res.json({ technician: tech }) : res.status(404).json({ error: 'technician_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/technicians/:id', async (req, res) => {
  try {
    // Soft deactivate
    const [tech] = await db.update(technicians).set({ active: false, updatedAt: new Date() }).where(eq(technicians.id, req.params.id)).returning();
    return tech ? res.json({ technician: tech }) : res.status(404).json({ error: 'technician_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.get('/admin/technicians/:id/orders', async (req, res) => {
  try {
    const assignedOrders = await db.select().from(orders).where(eq(orders.technicianId, req.params.id)).orderBy(desc(orders.createdAt));
    return res.json({ orders: assignedOrders });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// ==========================================
// 4. TECHNICIAN TYPES CRUD (Section 29)
// ==========================================
const typeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

adminRoutes.get('/admin/technician-types', async (_req, res) => {
  try {
    const types = await db.select().from(technicianTypes).orderBy(asc(technicianTypes.name));
    return res.json({ technicianTypes: types });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/technician-types', async (req, res) => {
  const parsed = typeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [created] = await db.insert(technicianTypes).values(parsed.data).returning();
    return res.status(201).json({ technicianType: created });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/technician-types/:id', async (req, res) => {
  const parsed = typeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [updated] = await db.update(technicianTypes).set({ ...parsed.data, updatedAt: new Date() }).where(eq(technicianTypes.id, req.params.id)).returning();
    return updated ? res.json({ technicianType: updated }) : res.status(404).json({ error: 'technician_type_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/technician-types/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(technicianTypes).where(eq(technicianTypes.id, req.params.id)).returning();
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'technician_type_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 5. TECHNICIAN PAYMENT MANAGEMENT (Section 30)
// ==========================================
const techPaymentSchema = z.object({
  technicianId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  amount: z.number().positive(),
  paymentType: z.enum(['milestone', 'hourly', 'fixed_commission', 'completion']).default('fixed_commission'),
  status: z.enum(['pending', 'approved', 'paid']).default('pending'),
  method: z.enum(['bank_transfer', 'bKash', 'cash']).default('bank_transfer'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

adminRoutes.get('/admin/technician-payments', async (_req, res) => {
  try {
    const paymentsList = await db.select().from(technicianPayments).orderBy(desc(technicianPayments.createdAt));
    const allTechs = await db.select().from(technicians);
    const techMap = new Map(allTechs.map((t) => [t.id, t]));

    const populated = paymentsList.map((p) => ({
      ...p,
      amount: Number(p.amount),
      technician: techMap.get(p.technicianId) || null,
    }));

    return res.json({ payments: populated });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/technician-payments', async (req, res) => {
  const parsed = techPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [p] = await db.insert(technicianPayments).values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      paidAt: parsed.data.status === 'paid' ? new Date() : null,
    }).returning();
    return res.status(201).json({ payment: { ...p, amount: Number(p.amount) } });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/technician-payments/:id', async (req, res) => {
  const parsed = techPaymentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { amount, ...rest } = parsed.data;
  try {
    const [updated] = await db.update(technicianPayments).set({
      ...rest,
      ...(amount !== undefined ? { amount: String(amount) } : {}),
      ...(parsed.data.status === 'paid' ? { paidAt: new Date() } : {}),
      updatedAt: new Date(),
    }).where(eq(technicianPayments.id, req.params.id)).returning();

    return updated ? res.json({ payment: { ...updated, amount: Number(updated.amount) } }) : res.status(404).json({ error: 'payment_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/technician-payments/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(technicianPayments).where(eq(technicianPayments.id, req.params.id)).returning();
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'payment_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 6. APPLIANCE CATALOG CRUD (Section 31)
// ==========================================
const adminApplianceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  ratedPowerW: z.number().int().positive(),
  defaultHours: z.number().min(0).max(24).default(4),
  surgePowerW: z.number().int().positive().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

adminRoutes.get('/admin/appliances', async (_req, res) => {
  try {
    const list = await db.select().from(appliances).orderBy(asc(appliances.category), asc(appliances.name));
    return res.json({ appliances: list });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/appliances', async (req, res) => {
  const parsed = adminApplianceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [created] = await db.insert(appliances).values({
      ...parsed.data,
      defaultHours: String(parsed.data.defaultHours),
    }).returning();
    return res.status(201).json({ appliance: created });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/appliances/:id', async (req, res) => {
  const parsed = adminApplianceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { defaultHours, ...rest } = parsed.data;
  try {
    const [updated] = await db.update(appliances).set({
      ...rest,
      ...(defaultHours !== undefined ? { defaultHours: String(defaultHours) } : {}),
      updatedAt: new Date(),
    }).where(eq(appliances.id, req.params.id)).returning();

    return updated ? res.json({ appliance: updated }) : res.status(404).json({ error: 'appliance_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/appliances/:id', async (req, res) => {
  try {
    const [deactivated] = await db.update(appliances).set({ active: false, updatedAt: new Date() }).where(eq(appliances.id, req.params.id)).returning();
    return deactivated ? res.json({ appliance: deactivated }) : res.status(404).json({ error: 'appliance_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 7. PRODUCT CATALOG MANAGEMENT (Section 32, 33)
// ==========================================
const adminProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().min(1),
  wattage: z.number().int().nonnegative().optional(),
  dimensions: z.string().optional(),
  efficiency: z.number().optional(),
  warranty: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().int().nonnegative().default(100),
  specifications: z.record(z.any()).default({}),
  status: z.enum(['preferred', 'approved', 'conditional', 'blocked']).default('approved'),
  price: z.number().nonnegative(),
});

adminRoutes.get('/admin/products', async (_req, res) => {
  try {
    const rows = await db.select().from(productCatalog).orderBy(asc(productCatalog.category), asc(productCatalog.name));
    return res.json({ products: rows.map((row) => ({ ...row, price: Number(row.regularPrice) })) });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/products', async (req, res) => {
  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [product] = await db.insert(productCatalog).values({
      sku: parsed.data.sku,
      name: parsed.data.name,
      brand: parsed.data.brand,
      model: parsed.data.model,
      category: parsed.data.category,
      wattage: parsed.data.wattage,
      dimensions: parsed.data.dimensions,
      efficiency: parsed.data.efficiency !== undefined ? String(parsed.data.efficiency) : undefined,
      warranty: parsed.data.warranty,
      description: parsed.data.description,
      stock: parsed.data.stock,
      specifications: parsed.data.specifications,
      status: parsed.data.status,
      regularPrice: String(parsed.data.price),
    }).returning();
    return res.status(201).json({ product: { ...product, price: Number(product.regularPrice) } });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/products/:id', async (req, res) => {
  const parsed = adminProductSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { price, efficiency, ...rest } = parsed.data;
  try {
    const [product] = await db.update(productCatalog).set({
      ...rest,
      ...(price !== undefined ? { regularPrice: String(price) } : {}),
      ...(efficiency !== undefined ? { efficiency: String(efficiency) } : {}),
      updatedAt: new Date(),
    }).where(eq(productCatalog.id, req.params.id)).returning();

    return product ? res.json({ product: { ...product, price: Number(product.regularPrice) } }) : res.status(404).json({ error: 'product_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/products/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(productCatalog).where(eq(productCatalog.id, req.params.id)).returning();
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'product_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 8. PACKAGE MANAGEMENT (Section 17)
// ==========================================
const adminPackageSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  systemType: z.enum(['on-grid', 'off-grid', 'hybrid-grid']).default('on-grid'),
  capacityKwp: z.number().positive(),
  panelProductId: z.string().uuid().optional(),
  panelQuantity: z.number().int().positive(),
  inverterProductId: z.string().uuid().optional(),
  batteryProductId: z.string().uuid().optional(),
  mountingProductId: z.string().uuid().optional(),
  installationPrice: z.number().nonnegative().default(0),
  warranty: z.string().default('5 yr system / 25 yr panel'),
  totalPrice: z.number().positive(),
  expectedGenerationMonthlyKwh: z.number().positive(),
  suitableProfile: z.string().min(5),
  active: z.boolean().default(true),
});

adminRoutes.get('/admin/packages', async (_req, res) => {
  try {
    const list = await db.select().from(packages).orderBy(asc(packages.totalPrice));
    return res.json({ packages: list });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.post('/admin/packages', async (req, res) => {
  const parsed = adminPackageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [pkg] = await db.insert(packages).values({
      ...parsed.data,
      capacityKwp: String(parsed.data.capacityKwp),
      installationPrice: String(parsed.data.installationPrice),
      totalPrice: String(parsed.data.totalPrice),
      expectedGenerationMonthlyKwh: String(parsed.data.expectedGenerationMonthlyKwh),
    }).returning();
    return res.status(201).json({ package: pkg });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.patch('/admin/packages/:id', async (req, res) => {
  const parsed = adminPackageSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { capacityKwp, installationPrice, totalPrice, expectedGenerationMonthlyKwh, ...rest } = parsed.data;
  try {
    const [pkg] = await db.update(packages).set({
      ...rest,
      ...(capacityKwp !== undefined ? { capacityKwp: String(capacityKwp) } : {}),
      ...(installationPrice !== undefined ? { installationPrice: String(installationPrice) } : {}),
      ...(totalPrice !== undefined ? { totalPrice: String(totalPrice) } : {}),
      ...(expectedGenerationMonthlyKwh !== undefined ? { expectedGenerationMonthlyKwh: String(expectedGenerationMonthlyKwh) } : {}),
      updatedAt: new Date(),
    }).where(eq(packages.id, req.params.id)).returning();

    return pkg ? res.json({ package: pkg }) : res.status(404).json({ error: 'package_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

adminRoutes.delete('/admin/packages/:id', async (req, res) => {
  try {
    const [deactivated] = await db.update(packages).set({ active: false, updatedAt: new Date() }).where(eq(packages.id, req.params.id)).returning();
    return deactivated ? res.json({ package: deactivated }) : res.status(404).json({ error: 'package_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// 9. ADMIN CONTROL PANEL / SETTINGS (Section 34)
// ==========================================
adminRoutes.get('/admin/settings', async (_req, res) => {
  try {
    const settings = await db.select().from(adminSettings);
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.data;
      return acc;
    }, {} as Record<string, any>);

    return res.json({ settings: settingsMap });
  } catch (error) {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

adminRoutes.patch('/admin/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { data, category } = req.body;

  if (!data) return res.status(400).json({ error: 'data_required' });

  try {
    const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    let result;

    if (existing) {
      [result] = await db.update(adminSettings).set({
        data,
        updatedAt: new Date(),
      }).where(eq(adminSettings.key, key)).returning();
    } else {
      [result] = await db.insert(adminSettings).values({
        key,
        category: category || 'general',
        data,
      }).returning();
    }

    return res.json({ setting: result });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
