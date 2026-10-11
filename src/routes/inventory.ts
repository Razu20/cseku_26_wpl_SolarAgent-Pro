// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { inventoryItems, warehouses, stockMovements, productCatalog, orders } from '../db/schema';
import { requireAuth, requireRole } from './auth';

export const inventoryRoutes = new Router();
inventoryRoutes.use(['/warehouses', '/inventory'], requireAuth, requireRole(['admin']));

// ==========================================
// 1. WAREHOUSES MANAGEMENT
// ==========================================
inventoryRoutes.get('/warehouses', async (_req, res) => {
  try {
    const list = await db.select().from(warehouses).orderBy(desc(warehouses.createdAt));
    return res.json({ warehouses: list });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

inventoryRoutes.post('/warehouses', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      code: z.string().min(2),
      division: z.string().min(1),
      district: z.string().min(1),
      address: z.string().min(3),
      capacitySqft: z.number().optional().default(5000),
      managerName: z.string().optional(),
      managerPhone: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const [created] = await db.insert(warehouses).values({
      name: parsed.data.name,
      code: parsed.data.code,
      division: parsed.data.division,
      district: parsed.data.district,
      address: parsed.data.address,
      capacitySqft: parsed.data.capacitySqft,
      managerName: parsed.data.managerName,
      managerPhone: parsed.data.managerPhone,
    }).returning();
    return res.status(201).json({ warehouse: created });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

inventoryRoutes.patch('/warehouses/:id', async (req, res) => {
  try {
    const [updated] = await db.update(warehouses).set({
      ...req.body,
      updatedAt: new Date(),
    }).where(eq(warehouses.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: 'warehouse_not_found' });
    return res.json({ warehouse: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

inventoryRoutes.delete('/warehouses/:id', async (req, res) => {
  try {
    await db.update(warehouses).set({ status: 'inactive' }).where(eq(warehouses.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 2. INVENTORY ITEMS & VALUATION
// ==========================================
inventoryRoutes.get('/inventory', async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === 'true';
    const search = (req.query.search as string || '').toLowerCase().trim();

    const items = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.updatedAt));
    const allWarehouses = await db.select().from(warehouses);
    const whMap = new Map(allWarehouses.map((w) => [w.id, w.name]));

    let filtered = items.map((item) => ({
      ...item,
      warehouseName: (item.warehouseId && whMap.get(item.warehouseId)) || item.warehouse || 'Central Warehouse',
      isLowStock: item.quantity <= item.minThreshold,
      totalValueBdt: Number(item.unitCost || 0) * item.quantity,
    }));

    if (warehouseId && warehouseId !== 'all') {
      filtered = filtered.filter((i) => i.warehouseId === warehouseId);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    if (lowStock) {
      filtered = filtered.filter((i) => i.isLowStock);
    }
    if (search) {
      filtered = filtered.filter((i) =>
        i.name.toLowerCase().includes(search) ||
        i.sku.toLowerCase().includes(search) ||
        i.category.toLowerCase().includes(search)
      );
    }

    // High level summary metrics
    const totalInventoryValue = items.reduce((sum, i) => sum + (Number(i.unitCost || 0) * i.quantity), 0);
    const totalStockQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalReservedQuantity = items.reduce((sum, i) => sum + i.reservedQuantity, 0);
    const lowStockItemsCount = items.filter((i) => i.quantity <= i.minThreshold).length;

    return res.json({
      items: filtered,
      summary: {
        totalItemsCount: items.length,
        totalStockQuantity,
        totalReservedQuantity,
        totalAvailableQuantity: totalStockQuantity - totalReservedQuantity,
        lowStockItemsCount,
        totalInventoryValueBdt: Math.round(totalInventoryValue),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Update / adjust inventory item
inventoryRoutes.patch('/inventory/:id', async (req, res) => {
  try {
    const { quantity, damagedQuantity, minThreshold, unitCost, notes, actorName } = req.body;
    const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'inventory_item_not_found' });

    const newQty = quantity !== undefined ? Number(quantity) : existing.quantity;
    const diff = newQty - existing.quantity;

    const [updated] = await db.update(inventoryItems).set({
      quantity: newQty,
      availableQuantity: Math.max(0, newQty - existing.reservedQuantity),
      ...(damagedQuantity !== undefined ? { damagedQuantity: Number(damagedQuantity) } : {}),
      ...(minThreshold !== undefined ? { minThreshold: Number(minThreshold) } : {}),
      ...(unitCost !== undefined ? { unitCost: String(unitCost) } : {}),
      status: newQty > 0 ? 'available' : 'out_of_stock',
      updatedAt: new Date(),
    }).where(eq(inventoryItems.id, existing.id)).returning();

    // Record stock movement if quantity changed
    if (diff !== 0 && existing.productId) {
      await db.insert(stockMovements).values({
        inventoryItemId: existing.id,
        productId: existing.productId,
        warehouseId: existing.warehouseId || undefined,
        type: diff > 0 ? 'manual_addition' : 'manual_reduction',
        quantity: Math.abs(diff),
        previousStock: existing.quantity,
        newStock: newQty,
        referenceType: 'inventory_adjustment',
        notes: notes || 'Admin manual stock count adjustment',
        actorName: actorName || 'Admin',
      });

      // Synchronize product catalog stock count
      await db.update(productCatalog).set({
        stock: newQty,
        availability: newQty > 0 ? 'in_stock' : 'out_of_stock',
        updatedAt: new Date(),
      }).where(eq(productCatalog.id, existing.productId));
    }

    return res.json({ item: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 3. STOCK MOVEMENTS LOG
// ==========================================
inventoryRoutes.get('/inventory/movements', async (_req, res) => {
  try {
    const movements = await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(100);
    const prods = await db.select().from(productCatalog);
    const prodMap = new Map(prods.map((p) => [p.id, p.name]));

    const enriched = movements.map((m) => ({
      ...m,
      productName: prodMap.get(m.productId) || 'Renewable Hardware Item',
    }));

    return res.json({ movements: enriched });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 4. AUTOMATED STOCK RESERVATION & DEDUCTION HELPERS
// ==========================================
export async function reserveStockForOrder(orderId: string, productQuantities: Array<{ productId: string; quantity: number }>) {
  for (const item of productQuantities) {
    const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.productId, item.productId));
    if (inv) {
      const prevQty = inv.quantity;
      const newReserved = inv.reservedQuantity + item.quantity;
      const newAvailable = Math.max(0, inv.quantity - newReserved);

      await db.update(inventoryItems).set({
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        updatedAt: new Date(),
      }).where(eq(inventoryItems.id, inv.id));

      await db.insert(stockMovements).values({
        inventoryItemId: inv.id,
        productId: item.productId,
        warehouseId: inv.warehouseId || undefined,
        type: 'order_reservation',
        quantity: item.quantity,
        previousStock: prevQty,
        newStock: inv.quantity,
        referenceType: 'order',
        referenceId: orderId,
        notes: `Stock reserved for confirmed Order #${orderId}`,
        actorName: 'Order Engine',
      });
    }
  }
}

export async function releaseStockForOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;

  const movements = await db.select().from(stockMovements)
    .where(eq(stockMovements.referenceId, orderId));
  const reservationMovements = movements.filter((m) => m.type === 'order_reservation');

  for (const m of reservationMovements) {
    const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.productId, m.productId));
    if (inv) {
      const newReserved = Math.max(0, inv.reservedQuantity - m.quantity);
      const newAvailable = Math.max(0, inv.quantity - newReserved);

      await db.update(inventoryItems).set({
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        updatedAt: new Date(),
      }).where(eq(inventoryItems.id, inv.id));

      await db.insert(stockMovements).values({
        inventoryItemId: inv.id,
        productId: m.productId,
        warehouseId: inv.warehouseId || undefined,
        type: 'order_release',
        quantity: m.quantity,
        previousStock: inv.quantity,
        newStock: inv.quantity,
        referenceType: 'order_cancellation',
        referenceId: orderId,
        notes: `Reserved stock released due to order cancellation for Order #${order.orderNumber}`,
        actorName: 'Order Engine',
      });
    }
  }
}

export async function deductStockForInstallation(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;

  const movements = await db.select().from(stockMovements)
    .where(eq(stockMovements.referenceId, orderId));
  const reservationMovements = movements.filter((m) => m.type === 'order_reservation');

  for (const m of reservationMovements) {
    const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.productId, m.productId));
    if (inv) {
      const prevQty = inv.quantity;
      const newQty = Math.max(0, inv.quantity - m.quantity);
      const newReserved = Math.max(0, inv.reservedQuantity - m.quantity);
      const newAvailable = Math.max(0, newQty - newReserved);

      await db.update(inventoryItems).set({
        quantity: newQty,
        reservedQuantity: newReserved,
        availableQuantity: newAvailable,
        status: newQty > 0 ? 'available' : 'out_of_stock',
        updatedAt: new Date(),
      }).where(eq(inventoryItems.id, inv.id));

      await db.update(productCatalog).set({
        stock: newQty,
        availability: newQty > 0 ? 'in_stock' : 'out_of_stock',
        updatedAt: new Date(),
      }).where(eq(productCatalog.id, m.productId));

      await db.insert(stockMovements).values({
        inventoryItemId: inv.id,
        productId: m.productId,
        warehouseId: inv.warehouseId || undefined,
        type: 'installation_deducted',
        quantity: m.quantity,
        previousStock: prevQty,
        newStock: newQty,
        referenceType: 'installation_completion',
        referenceId: orderId,
        notes: `Physically installed and commissioned at customer site for Order #${order.orderNumber}`,
        actorName: 'Technician Dispatch',
      });
    }
  }
}




