import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';

export const requirementStatusEnum = pgEnum('requirement_status', [
  'unknown',
  'inferred',
  'user_provided',
  'evidence_extracted',
  'survey_verified',
  'engineer_verified',
  'rejected',
]);

export const requirementSourceEnum = pgEnum('requirement_source', [
  'user',
  'bill_ocr',
  'photo_ai',
  'map',
  'survey',
  'sensor',
  'engineer',
  'admin',
]);

export const productStatusEnum = pgEnum('product_status', ['preferred', 'approved', 'conditional', 'blocked']);

export const userRoleEnum = pgEnum('user_role', ['admin', 'customer', 'technician', 'supplier']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('customer'),
  fullName: text('full_name'),
  contactNumber: text('contact_number'),
  division: text('division'),
  district: text('district'),
  upazila: text('upazila'),
  village: text('village'),
  isActive: boolean('is_active').notNull().default(true),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  source: text('source').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const requirementCases = pgTable('requirement_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  customerName: text('customer_name').notNull(),
  objective: text('objective').notNull().default('balanced'),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const requirementFacts = pgTable('requirement_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => requirementCases.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
  status: requirementStatusEnum('status').notNull(),
  source: requirementSourceEnum('source').notNull(),
  confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const evidenceAssets = pgTable('evidence_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => requirementCases.id),
  kind: text('kind').notNull(),
  uri: text('uri').notNull(),
  sha256: text('sha256').notNull(),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const siteLocations = pgTable('site_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteName: text('site_name').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  latitude: numeric('latitude', { precision: 10, scale: 6 }),
  longitude: numeric('longitude', { precision: 10, scale: 6 }),
  geom: text('geom'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const engineeringResults = pgTable('engineering_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: text('trace_id').notNull(),
  engine: text('engine').notNull(),
  formulaVersion: text('formula_version').notNull(),
  inputsHash: text('inputs_hash').notNull(),
  result: jsonb('result').notNull(),
  warnings: jsonb('warnings').default([]),
  assumptions: jsonb('assumptions').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logo: text('logo'),
  description: text('description'),
  website: text('website'),
  country: text('country'),
  contactInformation: text('contact_information'),
  status: text('status').notNull().default('active'),
  leadTimeDays: integer('lead_time_days').default(7),
  minOrderQuantity: integer('min_order_quantity').default(5),
  categoriesSupplied: jsonb('categories_supplied').default(['Solar Panel', 'Inverter']),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('4.90'),
  verified: boolean('verified').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  image: text('image'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const productCatalog = pgTable('product_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  brand: text('brand'),
  company: text('company'),
  companyId: uuid('company_id').references(() => companies.id),
  model: text('model'),
  category: text('category').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  wattage: integer('wattage'),
  capacity: numeric('capacity', { precision: 10, scale: 2 }),
  capacityUnit: text('capacity_unit').default('W'),
  dimensions: text('dimensions'),
  efficiency: numeric('efficiency', { precision: 5, scale: 2 }),
  warranty: text('warranty'),
  description: text('description'),
  image: text('image'),
  galleryImages: jsonb('gallery_images').default([]),
  stock: integer('stock').default(100),
  availability: text('availability').notNull().default('in_stock'),
  featured: boolean('featured').notNull().default(false),
  currency: text('currency').notNull().default('BDT'),
  unit: text('unit').notNull().default('piece'),
  specifications: jsonb('specifications').default({}),
  status: productStatusEnum('status').notNull().default('approved'),
  regularPrice: numeric('regular_price', { precision: 12, scale: 2 }).notNull(),
  discountPrice: numeric('discount_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const products = productCatalog;

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  marginPercent: numeric('margin_percent', { precision: 5, scale: 2 }).notNull(),
  validityDays: integer('validity_days').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull(),
  technician: text('technician').notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const packageScores = pgTable('package_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').notNull(),
  technicalFit: numeric('technical_fit', { precision: 4, scale: 3 }).notNull(),
  budgetFit: numeric('budget_fit', { precision: 4, scale: 3 }).notNull(),
  availabilityFit: numeric('availability_fit', { precision: 4, scale: 3 }).notNull(),
  warrantyFit: numeric('warranty_fit', { precision: 4, scale: 3 }).notNull(),
  serviceFit: numeric('service_fit', { precision: 4, scale: 3 }).notNull(),
  customerPreferenceFit: numeric('customer_preference_fit', { precision: 4, scale: 3 }).notNull(),
  objectiveFit: numeric('objective_fit', { precision: 4, scale: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const utilityStatusEnum = pgEnum('utility_status', ['configurable', 'active', 'inactive']);

export const utilities = pgTable('utilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  company: text('company').notNull(),
  region: text('region').notNull(),
  status: utilityStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => productCatalog.id),
  warehouseId: uuid('warehouse_id'),
  supplierId: uuid('supplier_id').references(() => companies.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  damagedQuantity: integer('damaged_quantity').notNull().default(0),
  minThreshold: integer('min_threshold').notNull().default(10),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).default('0'),
  status: text('status').notNull().default('available'),
  warehouse: text('warehouse').notNull().default('Central Warehouse Dhaka'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const workOrders = pgTable('work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('scheduled'),
  technician: text('technician').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const nemApplications = pgTable('nem_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull(),
  utility: text('utility').notNull(),
  status: text('status').notNull().default('submitted'),
  applicationRef: text('application_ref').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const deviceTypeEnum = pgEnum('device_type', ['inverter', 'battery', 'meter', 'weather', 'gateway']);

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull(),
  type: deviceTypeEnum('type').notNull(),
  status: text('status').notNull().default('offline'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const appliances = pgTable('appliances', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  ratedPowerW: integer('rated_power_w').notNull(),
  defaultHours: numeric('default_hours', { precision: 5, scale: 2 }).notNull().default('4'),
  surgePowerW: integer('surge_power_w'),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const projectRequestTypeEnum = pgEnum('project_request_type', ['solar', 'wind', 'hybrid']);

export const projectRequests = pgTable('project_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  type: projectRequestTypeEnum('type').notNull(),
  status: text('status').notNull().default('draft'),
  configuration: jsonb('configuration').notNull(),
  estimate: jsonb('estimate').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const projectRequestAppliances = pgTable('project_request_appliances', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectRequestId: uuid('project_request_id').notNull().references(() => projectRequests.id),
  applianceId: uuid('appliance_id').notNull().references(() => appliances.id),
  quantity: integer('quantity').notNull(),
  dailyHours: numeric('daily_hours', { precision: 5, scale: 2 }).notNull(),
});

export const projectProducts = pgTable('project_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projectRequests.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => productCatalog.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const technicianTypes = pgTable('technician_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const technicians = pgTable('technicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  contactNumber: text('contact_number').notNull(),
  email: text('email').notNull(),
  address: text('address'),
  division: text('division').default('Dhaka'),
  district: text('district').default('Dhaka'),
  upazila: text('upazila').default('Gulshan'),
  village: text('village').default('Gulshan-2'),
  technicianTypeId: uuid('technician_type_id').references(() => technicianTypes.id),
  skills: jsonb('skills').default([]),
  experienceYears: integer('experience_years').default(1),
  solarExperienceYears: integer('solar_experience_years').default(3),
  windExperienceYears: integer('wind_experience_years').default(1),
  hybridExperienceYears: integer('hybrid_experience_years').default(2),
  certifications: jsonb('certifications').default([]),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('4.85'),
  completedJobs: integer('completed_jobs').default(0),
  activeJobs: integer('active_jobs').default(0),
  availability: text('availability').notNull().default('available'),
  serviceArea: text('service_area').notNull().default('Dhaka'),
  paymentInfo: jsonb('payment_info').default({}),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  packageType: text('package_type').default('solar'),
  systemType: text('system_type').notNull().default('on-grid'),
  capacityKwp: numeric('capacity_kwp', { precision: 6, scale: 2 }).notNull(),
  panelProductId: uuid('panel_product_id').references(() => productCatalog.id),
  panelQuantity: integer('panel_quantity').notNull().default(0),
  turbineProductId: uuid('turbine_product_id').references(() => productCatalog.id),
  turbineQuantity: integer('turbine_quantity').default(0),
  inverterProductId: uuid('inverter_product_id').references(() => productCatalog.id),
  batteryProductId: uuid('battery_product_id').references(() => productCatalog.id),
  batteryQuantity: integer('battery_quantity').default(1),
  mountingProductId: uuid('mounting_product_id').references(() => productCatalog.id),
  componentBreakdown: jsonb('component_breakdown').default([]),
  installationPrice: numeric('installation_price', { precision: 12, scale: 2 }).notNull().default('0'),
  warranty: text('warranty').notNull().default('5 years system / 25 years panel performance'),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  expectedGenerationMonthlyKwh: numeric('expected_generation_monthly_kwh', { precision: 8, scale: 2 }).notNull(),
  suitableProfile: text('suitable_profile').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  userId: uuid('user_id').references(() => users.id),
  projectRequestId: uuid('project_request_id').references(() => projectRequests.id),
  projectType: text('project_type').notNull().default('solar'),
  status: text('status').notNull().default('submitted'),
  customerName: text('customer_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  email: text('email'),
  division: text('division').notNull(),
  district: text('district').notNull(),
  upazila: text('upazila').notNull(),
  village: text('village').notNull(),
  address: text('address'),
  configuration: jsonb('configuration').notNull(),
  estimate: jsonb('estimate').notNull(),
  pricing: jsonb('pricing').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('cod'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  paymentTransactionId: text('payment_transaction_id'),
  technicianId: uuid('technician_id').references(() => technicians.id),
  scheduledDate: text('scheduled_date'),
  scheduledSlot: text('scheduled_slot').default('full_day'),
  installationStatus: text('installation_status').default('pending'),
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: text('cancelled_by'),
  emailSent: boolean('email_sent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id),
  userId: uuid('user_id').references(() => users.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('BDT'),
  method: text('method').notNull(),
  transactionId: text('transaction_id').notNull().unique(),
  gatewayTransactionId: text('gateway_transaction_id'),
  valId: text('val_id'),
  status: text('status').notNull().default('pending'),
  rawResponse: jsonb('raw_response'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const technicianPayments = pgTable('technician_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull().references(() => technicians.id),
  orderId: uuid('order_id').references(() => orders.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentType: text('payment_type').notNull().default('fixed_commission'),
  status: text('status').notNull().default('pending'),
  method: text('method').notNull().default('bank_transfer'),
  reference: text('reference'),
  notes: text('notes'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const adminSettings = pgTable('admin_settings', {
  key: text('key').primaryKey(),
  category: text('category').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  orderId: uuid('order_id').references(() => orders.id),
  ticketNumber: text('ticket_number').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').notNull().default('general'),
  description: text('description').notNull(),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('open'),
  messages: jsonb('messages').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  division: text('division').notNull(),
  district: text('district').notNull(),
  address: text('address').notNull(),
  capacitySqft: integer('capacity_sqft').default(5000),
  managerName: text('manager_name'),
  managerPhone: text('manager_phone'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id),
  productId: uuid('product_id').notNull().references(() => productCatalog.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull().default(0),
  newStock: integer('new_stock').notNull().default(0),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  notes: text('notes'),
  actorName: text('actor_name').default('System'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const supplierPurchaseOrders = pgTable('supplier_purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  poNumber: text('po_number').notNull().unique(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  status: text('status').notNull().default('pending'),
  items: jsonb('items').notNull().default([]),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const technicianAssignments = pgTable('technician_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull().references(() => technicians.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledSlot: text('scheduled_slot').notNull().default('full_day'),
  status: text('status').notNull().default('assigned'),
  conflictChecked: boolean('conflict_checked').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  role: text('role'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  link: text('link'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

