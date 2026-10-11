import { Router } from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { companies, supplierPurchaseOrders, inventoryItems, stockMovements, productCatalog, warehouses, notifications } from '../db/schema.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js';

export const supplierRoutes = Router();
supplierRoutes.use('/admin', requireAuth, requireRole(['admin']));

// ==========================================
// 1. PUBLIC & ADMIN SUPPLIER NETWORK DIRECTORY
// ==========================================
supplierRoutes.get('/suppliers', async (req, res) => {
  try {
    const status = req.query.status as string;
    const category = req.query.category as string;
    const search = (req.query.search as string || '').toLowerCase().trim();

    const list = await db.select().from(companies).orderBy(desc(companies.createdAt));

    let filtered = list;
    if (status && status !== 'all') {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((s) => {
        const cats = (s.categoriesSupplied as string[]) || [];
        return cats.some((c) => c.toLowerCase().includes(category.toLowerCase()));
      });
    }
    if (search) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(search) ||
        (s.contactInformation && s.contactInformation.toLowerCase().includes(search)) ||
        (s.country && s.country.toLowerCase().includes(search))
      );
    }

    return res.json({ suppliers: filtered });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

supplierRoutes.get('/suppliers/:id', async (req, res) => {
  try {
    const [supplier] = await db.select().from(companies).where(eq(companies.id, req.params.id));
    if (!supplier) return res.status(404).json({ error: 'supplier_not_found' });

    // Fetch products manufactured or supplied by this company
    const prods = await db.select().from(productCatalog).where(eq(productCatalog.companyId, supplier.id));

    return res.json({ supplier, products: prods });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Admin approves or rejects a supplier
supplierRoutes.patch('/admin/suppliers/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'active' | 'pending' | 'rejected'
    const [updated] = await db.update(companies).set({
      status: String(status),
      updatedAt: new Date(),
    }).where(eq(companies.id, req.params.id)).returning();

    if (!updated) return res.status(404).json({ error: 'supplier_not_found' });

    // Notification
    await db.insert(notifications).values({
      role: 'supplier',
      title: `Supplier Status Updated`,
      message: `Your company status on SolarAgent Pro is now: ${status.toUpperCase()}.`,
      type: 'system',
      link: '/supplier',
    });

    return res.json({ supplier: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 2. PURCHASE ORDERS (SUPPLY CHAIN FULFILLMENT)
// ==========================================
supplierRoutes.get('/admin/purchase-orders', async (_req, res) => {
  try {
    const pos = await db.select().from(supplierPurchaseOrders).orderBy(desc(supplierPurchaseOrders.createdAt));
    const allCompanies = await db.select().from(companies);
    const compMap = new Map(allCompanies.map((c) => [c.id, c.name]));
    const allWh = await db.select().from(warehouses);
    const whMap = new Map(allWh.map((w) => [w.id, w.name]));

    const enriched = pos.map((po) => ({
      ...po,
      supplierName: compMap.get(po.companyId) || 'Partner Supplier',
      warehouseName: (po.warehouseId && whMap.get(po.warehouseId)) || 'Central Hub',
    }));

    return res.json({ purchaseOrders: enriched });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Admin creates Purchase Order to Supplier
supplierRoutes.post('/admin/purchase-orders', async (req, res) => {
  try {
    const schema = z.object({
      companyId: z.string().uuid(),
      warehouseId: z.string().uuid().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        productName: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
      })),
      notes: z.string().optional(),
      expectedDeliveryDate: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const totalAmount = parsed.data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const [created] = await db.insert(supplierPurchaseOrders).values({
      poNumber,
      companyId: parsed.data.companyId,
      warehouseId: parsed.data.warehouseId,
      status: 'pending',
      items: parsed.data.items,
      totalAmount: String(totalAmount),
      expectedDeliveryDate: parsed.data.expectedDeliveryDate ? new Date(parsed.data.expectedDeliveryDate) : undefined,
      notes: parsed.data.notes,
    }).returning();

    // Notify supplier and admin
    await db.insert(notifications).values({
      role: 'supplier',
      title: `New Purchase Order #${poNumber}`,
      message: `SolarAgent Pro operations team placed a restock PO for ${parsed.data.items.length} items (BDT ${totalAmount.toLocaleString()}).`,
      type: 'inventory',
      link: '/supplier',
    });

    return res.status(201).json({ purchaseOrder: created });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Update Purchase Order Status (e.g. 'shipped' -> 'delivered')
supplierRoutes.patch('/admin/purchase-orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'shipped' | 'delivered' | 'cancelled'
    const [existing] = await db.select().from(supplierPurchaseOrders).where(eq(supplierPurchaseOrders.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'purchase_order_not_found' });

    const [updated] = await db.update(supplierPurchaseOrders).set({
      status: String(status),
      updatedAt: new Date(),
    }).where(eq(supplierPurchaseOrders.id, existing.id)).returning();

    // If marked as DELIVERED: Add received quantities to Warehouse Inventory!
    if (status === 'delivered') {
      const items = (existing.items as Array<{ productId: string; quantity: number }>) || [];
      for (const item of items) {
        const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.productId, item.productId));
        if (inv) {
          const prevStock = inv.quantity;
          const newStock = inv.quantity + item.quantity;
          const newAvailable = inv.availableQuantity + item.quantity;

          await db.update(inventoryItems).set({
            quantity: newStock,
            availableQuantity: newAvailable,
            status: 'available',
            updatedAt: new Date(),
          }).where(eq(inventoryItems.id, inv.id));

          await db.update(productCatalog).set({
            stock: newStock,
            availability: 'in_stock',
            updatedAt: new Date(),
          }).where(eq(productCatalog.id, item.productId));

          await db.insert(stockMovements).values({
            inventoryItemId: inv.id,
            productId: item.productId,
            warehouseId: existing.warehouseId || undefined,
            type: 'supplier_receipt',
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'purchase_order',
            referenceId: existing.poNumber,
            notes: `Received restock from supplier under PO #${existing.poNumber}`,
            actorName: 'Warehouse Staff',
          });
        }
      }

      await db.insert(notifications).values({
        role: 'admin',
        title: `Goods Received: PO #${existing.poNumber}`,
        message: `Inventory successfully added to warehouse stock from supplier shipment.`,
        type: 'inventory',
        link: '/admin/inventory',
      });
    }

    return res.json({ purchaseOrder: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 3. LOGGED-IN SUPPLIER PORTAL
// ==========================================
supplierRoutes.get('/supplier/dashboard', requireAuth, requireRole(['supplier']), async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.user!.email;
    const allCompanies = await db.select().from(companies);
    let matchedCompany = allCompanies.find(
      (c) => c.contactInformation && c.contactInformation.includes(userEmail)
    ) || allCompanies[0];

    if (!matchedCompany) {
      return res.status(404).json({ error: 'supplier_profile_not_found' });
    }

    // Purchase orders for this supplier
    const pos = await db.select().from(supplierPurchaseOrders).where(eq(supplierPurchaseOrders.companyId, matchedCompany.id)).orderBy(desc(supplierPurchaseOrders.createdAt));
    const prods = await db.select().from(productCatalog).where(eq(productCatalog.companyId, matchedCompany.id));

    const totalOrders = pos.length;
    const deliveredOrders = pos.filter((p) => p.status === 'delivered').length;
    const pendingOrders = pos.filter((p) => p.status === 'pending' || p.status === 'approved').length;
    const totalOrderValue = pos.reduce((sum, p) => sum + Number(p.totalAmount), 0);

    return res.json({
      company: matchedCompany,
      stats: {
        totalOrders,
        deliveredOrders,
        pendingOrders,
        totalOrderValue,
        catalogProductsCount: prods.length,
        leadTimeDays: matchedCompany.leadTimeDays || 7,
        rating: Number(matchedCompany.rating || 4.85),
      },
      purchaseOrders: pos,
      products: prods,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});
