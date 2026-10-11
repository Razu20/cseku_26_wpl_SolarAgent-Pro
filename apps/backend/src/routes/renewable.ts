import { Router } from 'express';
import { asc, desc, eq, and, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { appliances, categories, companies, orders, packages, productCatalog, projectRequestAppliances, projectRequests, users, notifications } from '../db/schema.js';
import { calculateRenewableProject } from '../services/renewableCalculation.js';
import { fetchWeatherForLocation } from '../services/weather.js';
import { reserveStockForOrder, releaseStockForOrder } from './inventory.js';
import { canTransitionOrderStatus } from '../lib/orderLifecycle.js';
import type { AuthenticatedRequest } from './auth.js';

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

// Helper to format product
function formatProduct(p: any, companyMap?: Map<string, any>, categoryMap?: Map<string, any>) {
  const company = p.companyId ? companyMap?.get(p.companyId) : null;
  const category = p.categoryId ? categoryMap?.get(p.categoryId) : null;
  return {
    ...p,
    price: Number(p.regularPrice),
    regularPrice: Number(p.regularPrice),
    discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    discount_price: p.discountPrice ? Number(p.discountPrice) : null,
    capacity: p.capacity ? Number(p.capacity) : p.wattage || null,
    capacityUnit: p.capacityUnit || (p.wattage ? 'W' : ''),
    capacity_unit: p.capacityUnit || (p.wattage ? 'W' : ''),
    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],
    gallery_images: Array.isArray(p.galleryImages) ? p.galleryImages : [],
    company_name: company?.name || p.company || p.brand || '',
    company: company || (p.company ? { name: p.company } : null),
    category_name: category?.name || p.category || '',
    categoryObj: category || null,
  };
}

// 2. Products catalog with rich filtering, search, sorting
renewableRoutes.get('/products', async (req, res) => {
  const searchQuery = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
  const companyFilter = typeof req.query.company === 'string' ? req.query.company.trim() : typeof req.query.brand === 'string' ? req.query.brand.trim() : undefined;
  const availabilityFilter = typeof req.query.availability === 'string' ? req.query.availability.trim() : undefined;
  const featuredOnly = req.query.featured === 'true' || req.query.featured === '1';
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'default';

  try {
    const [allProducts, allCompanies, allCategories] = await Promise.all([
      db.select().from(productCatalog),
      db.select().from(companies),
      db.select().from(categories),
    ]);

    const companyMap = new Map(allCompanies.map((c) => [c.id, c]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    let filtered = allProducts;

    // Filter approved / preferred unless status filter is specified
    filtered = filtered.filter((p) => p.status === 'approved' || p.status === 'preferred');

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      const matchCat = allCategories.find((c) => c.slug === categoryFilter || c.id === categoryFilter || c.name.toLowerCase() === categoryFilter.toLowerCase());
      const catName = matchCat ? matchCat.name.toLowerCase() : categoryFilter.toLowerCase();
      filtered = filtered.filter((p) => {
        if (p.categoryId && matchCat && p.categoryId === matchCat.id) return true;
        const pCat = (p.category || '').toLowerCase();
        return pCat === catName || pCat.includes(catName) || catName.includes(pCat);
      });
    }

    // Company / Brand filter
    if (companyFilter && companyFilter !== 'all') {
      const matchComp = allCompanies.find((c) => c.id === companyFilter || c.name.toLowerCase() === companyFilter.toLowerCase());
      const compName = matchComp ? matchComp.name.toLowerCase() : companyFilter.toLowerCase();
      filtered = filtered.filter((p) => {
        if (p.companyId && matchComp && p.companyId === matchComp.id) return true;
        const brand = (p.brand || '').toLowerCase();
        const comp = (p.company || '').toLowerCase();
        return brand === compName || comp === compName || brand.includes(compName) || comp.includes(compName);
      });
    }

    // Availability filter
    if (availabilityFilter && availabilityFilter !== 'all') {
      filtered = filtered.filter((p) => p.availability === availabilityFilter);
    }

    // Featured filter
    if (featuredOnly) {
      filtered = filtered.filter((p) => p.featured === true);
    }

    // Search query filter
    if (searchQuery) {
      filtered = filtered.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const comp = (p.company || '').toLowerCase();
        const model = (p.model || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const specs = JSON.stringify(p.specifications || {}).toLowerCase();
        return (
          name.includes(searchQuery) ||
          brand.includes(searchQuery) ||
          comp.includes(searchQuery) ||
          model.includes(searchQuery) ||
          desc.includes(searchQuery) ||
          cat.includes(searchQuery) ||
          specs.includes(searchQuery)
        );
      });
    }

    // Price range filter
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      filtered = filtered.filter((p) => Number(p.regularPrice) >= minPrice);
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      filtered = filtered.filter((p) => Number(p.regularPrice) <= maxPrice);
    }

    // Sorting
    if (sort === 'price_asc') {
      filtered.sort((a, b) => Number(a.regularPrice) - Number(b.regularPrice));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => Number(b.regularPrice) - Number(a.regularPrice));
    } else if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sort === 'featured') {
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (sort === 'popular') {
      filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else {
      // Default: featured first, then name
      filtered.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const formatted = filtered.map((p) => formatProduct(p, companyMap, categoryMap));
    return res.json({ products: formatted, total: formatted.length });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// Single Product Details
renewableRoutes.get('/products/:id', async (req, res) => {
  try {
    const [allProducts, allCompanies, allCategories] = await Promise.all([
      db.select().from(productCatalog),
      db.select().from(companies),
      db.select().from(categories),
    ]);

    const product = allProducts.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'product_not_found' });

    const companyMap = new Map(allCompanies.map((c) => [c.id, c]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    const formatted = formatProduct(product, companyMap, categoryMap);

    // Also get related / alternative products from same category
    const related = allProducts
      .filter((p) => p.id !== product.id && (p.category === product.category || p.categoryId === product.categoryId))
      .slice(0, 4)
      .map((p) => formatProduct(p, companyMap, categoryMap));

    return res.json({ product: formatted, related });
  } catch (err) {
    console.error('Error fetching product details:', err);
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// Public Companies Catalog
renewableRoutes.get('/companies', async (_req, res) => {
  try {
    const [allCompanies, allProducts] = await Promise.all([
      db.select().from(companies).orderBy(asc(companies.name)),
      db.select().from(productCatalog),
    ]);

    const activeCompanies = allCompanies.filter((c) => c.status === 'active');
    const withCounts = activeCompanies.map((c) => ({
      ...c,
      productCount: allProducts.filter((p) => p.companyId === c.id || (p.company && p.company.toLowerCase() === c.name.toLowerCase())).length,
    }));

    return res.json({ companies: withCounts });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

renewableRoutes.get('/companies/:id', async (req, res) => {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, req.params.id));
    if (!company) return res.status(404).json({ error: 'company_not_found' });

    const companyProducts = await db.select().from(productCatalog).where(eq(productCatalog.companyId, company.id));
    return res.json({
      company,
      products: companyProducts.map((p) => ({ ...p, price: Number(p.regularPrice) })),
    });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// Public Categories Catalog
renewableRoutes.get('/categories', async (_req, res) => {
  try {
    const [allCategories, allProducts] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)),
      db.select().from(productCatalog),
    ]);

    const activeCategories = allCategories.filter((c) => c.status === 'active');
    const withCounts = activeCategories.map((c) => ({
      ...c,
      productCount: allProducts.filter((p) => p.categoryId === c.id || (p.category && p.category.toLowerCase().includes(c.name.toLowerCase()))).length,
    }));

    return res.json({ categories: withCounts });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

renewableRoutes.get('/categories/:id', async (req, res) => {
  try {
    const [cat] = await db.select().from(categories).where(or(eq(categories.id, req.params.id), eq(categories.slug, req.params.id)));
    if (!cat) return res.status(404).json({ error: 'category_not_found' });
    return res.json({ category: cat });
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

renewableRoutes.post('/requests', async (req: AuthenticatedRequest, res) => {
  const parsed = requestCreationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const requestUserId = parsed.data.userId || req.user?.id;
    const calculationInput = {
      type: parsed.data.type,
      location: parsed.data.location,
      configuration: {
        system: parsed.data.configuration.system,
        locationType: parsed.data.configuration.locationType,
        rooftopType: parsed.data.configuration.rooftopType,
        rooftopAreaSqFt: parsed.data.configuration.rooftopAreaSqFt,
        towerHeightM: parsed.data.configuration.towerHeightM,
        terrainType: parsed.data.configuration.terrainType,
      },
      appliances: parsed.data.appliances.map((appliance) => ({
        applianceId: appliance.applianceId,
        name: appliance.name,
        category: appliance.category,
        ratedPowerW: appliance.ratedPowerW,
        surgePowerW: appliance.surgePowerW,
        quantity: appliance.quantity,
        dailyHours: appliance.dailyHours,
      })),
      selectedPanelId: parsed.data.selectedPanelId,
      selectedInverterId: parsed.data.selectedInverterId,
      selectedBatteryId: parsed.data.selectedBatteryId,
      selectedTurbineId: parsed.data.selectedTurbineId,
    };

    // 1. Run full engineering calculation
    const estimate = await calculateRenewableProject(calculationInput);

    // 2. Save projectRequest
    const [request] = await db.insert(projectRequests).values({
      userId: requestUserId,
      type: parsed.data.type,
      status: 'submitted',
      configuration: {
        location: parsed.data.location,
        configuration: parsed.data.configuration,
      },
      estimate,
    }).returning();

    // 3. Save appliances selected
    const validAppliances = parsed.data.appliances.filter((a) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.applianceId));
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
    // Both payment methods require review before work begins. Keeping the order
    // in this state from creation avoids a second client request for COD orders.
    const initialStatus = 'awaiting_payment';

    const [order] = await db.insert(orders).values({
      orderNumber,
      userId: requestUserId,
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

    // 5. Automatically Reserve Hardware Stock in Inventory
    const itemsToReserve: Array<{ productId: string; quantity: number }> = [];
    const panelCount = (estimate.systemSizing as any)?.panelCount || 0;
    if (parsed.data.selectedPanelId && panelCount > 0) {
      itemsToReserve.push({ productId: parsed.data.selectedPanelId, quantity: panelCount });
    }
    if (parsed.data.selectedInverterId) {
      itemsToReserve.push({ productId: parsed.data.selectedInverterId, quantity: 1 });
    }
    const batteryCount = (estimate.systemSizing as any)?.batteryCount || (estimate.systemSizing as any)?.numberOfBatteries || 1;
    if (parsed.data.selectedBatteryId) {
      itemsToReserve.push({ productId: parsed.data.selectedBatteryId, quantity: batteryCount });
    }
    if (parsed.data.selectedTurbineId) {
      itemsToReserve.push({ productId: parsed.data.selectedTurbineId, quantity: 1 });
    }
    if (itemsToReserve.length > 0) {
      void reserveStockForOrder(order.id, itemsToReserve).catch((err) => console.warn('Stock reservation notice:', err.message));
    }

    // 6. Notifications
    try {
      await db.insert(notifications).values({
        role: 'admin',
        title: `New Order Placed: #${orderNumber}`,
        message: `${parsed.data.customerName} submitted a ${parsed.data.type.toUpperCase()} project order (BDT ${Number(estimate.pricing.finalTotal).toLocaleString()}) in ${parsed.data.location.district}.`,
        type: 'order',
        link: '/admin/orders',
      });

      if (requestUserId) {
        await db.insert(notifications).values({
          role: 'customer',
          userId: requestUserId,
          title: `Order Confirmed: #${orderNumber}`,
          message: `Your project request has been logged. Our engineering dispatch team will verify site details shortly.`,
          type: 'order',
          link: '/customer',
        });
      }
    } catch (notificationError) {
      console.error('Project notification creation failed after order submission:', notificationError);
    }

    return res.status(201).json({ request, order, estimate, message: 'Project request submitted successfully.' });
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

// 8. Public Order Tracking (no auth required)
renewableRoutes.get('/orders/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const [order] = await db.select().from(orders).where(
      or(
        eq(orders.orderNumber, orderNumber.trim()),
        eq(orders.id, orderNumber.trim())
      )
    );

    if (!order) {
      return res.status(404).json({ error: 'order_not_found', message: `No project order found matching reference ${orderNumber}` });
    }

    return res.json({
      orderNumber: order.orderNumber,
      projectType: order.projectType,
      status: order.status,
      installationStatus: order.installationStatus || 'pending',
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      scheduledDate: order.scheduledDate,
      scheduledSlot: order.scheduledSlot,
      division: order.division,
      district: order.district,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// 9. Cancel Order with Business Policy Enforcement & Stock Release
renewableRoutes.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, cancelledBy } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return res.status(404).json({ error: 'order_not_found' });

    // Cancellation policy check
    const nonCancellableStatuses = ['completed', 'installation_in_progress'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: 'order_cannot_be_cancelled',
        message: `Orders currently in "${order.status.toUpperCase()}" status cannot be cancelled as installation is active or commissioned. Please reach customer support.`,
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'order_already_cancelled' });
    }
    if (!canTransitionOrderStatus(order.status, 'cancelled')) {
      return res.status(409).json({ error: 'invalid_order_status_transition', from: order.status, to: 'cancelled' });
    }

    // 1. Update order
    const [cancelledOrder] = await db.update(orders).set({
      status: 'cancelled',
      installationStatus: 'cancelled',
      cancellationReason: reason || 'Customer requested cancellation',
      cancelledAt: new Date(),
      cancelledBy: cancelledBy || 'customer',
      updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    // 2. Release Reserved Inventory Stock
    await releaseStockForOrder(order.id);

    // 3. Notify Admin & Customer
    await db.insert(notifications).values({
      role: 'admin',
      title: `Order Cancelled: #${order.orderNumber}`,
      message: `Order #${order.orderNumber} was cancelled (${reason || 'Customer request'}). Reserved stock returned to inventory.`,
      type: 'order',
      link: '/admin/orders',
    });

    if (order.userId) {
      await db.insert(notifications).values({
        role: 'customer',
        userId: order.userId,
        title: `Order Cancelled: #${order.orderNumber}`,
        message: `Your cancellation request has been processed. Any eligible advance payments will be refunded per policy.`,
        type: 'order',
        link: '/customer',
      });
    }

    return res.json({
      success: true,
      message: 'Order successfully cancelled and inventory reservation released.',
      order: cancelledOrder,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// 10. Get Single Order Details with Installation Document & BOM
renewableRoutes.get('/orders/:id', async (req, res) => {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    return res.json({ order });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 11. Update order
renewableRoutes.patch('/orders/:id', async (req, res) => {
  try {
    const [updated] = await db.update(orders).set({ ...req.body, updatedAt: new Date() }).where(eq(orders.id, req.params.id)).returning();
    return updated ? res.json({ order: updated }) : res.status(404).json({ error: 'order_not_found' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// 12. Save Quotation / Project Proposal
renewableRoutes.post('/quotes/save', async (req, res) => {
  try {
    const { userId, type, location, configuration, estimate } = req.body;
    if (!type || !estimate) {
      return res.status(400).json({ error: 'missing_required_quote_data' });
    }

    const [savedRequest] = await db.insert(projectRequests).values({
      userId: userId || undefined,
      type: type,
      status: 'saved_quotation',
      configuration: { location, configuration },
      estimate,
    }).returning();

    return res.status(201).json({
      success: true,
      message: 'Project quotation successfully saved to your portfolio.',
      quoteId: savedRequest.id,
      savedRequest,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});