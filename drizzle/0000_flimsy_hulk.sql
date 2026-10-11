CREATE TYPE "public"."device_type" AS ENUM('inverter', 'battery', 'meter', 'weather', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('preferred', 'approved', 'conditional', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."project_request_type" AS ENUM('solar', 'wind', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."requirement_source" AS ENUM('user', 'bill_ocr', 'photo_ai', 'map', 'survey', 'sensor', 'engineer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('unknown', 'inferred', 'user_provided', 'evidence_extracted', 'survey_verified', 'engineer_verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'customer', 'technician', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."utility_status" AS ENUM('configurable', 'active', 'inactive');--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"rated_power_w" integer NOT NULL,
	"default_hours" numeric(5, 2) DEFAULT '4' NOT NULL,
	"surge_power_w" integer,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"image" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"description" text,
	"website" text,
	"country" text,
	"contact_information" text,
	"status" text DEFAULT 'active' NOT NULL,
	"lead_time_days" integer DEFAULT 7,
	"min_order_quantity" integer DEFAULT 5,
	"categories_supplied" jsonb DEFAULT '["Solar Panel","Inverter"]'::jsonb,
	"rating" numeric(3, 2) DEFAULT '4.90',
	"verified" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"type" "device_type" NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "engineering_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" text NOT NULL,
	"engine" text NOT NULL,
	"formula_version" text NOT NULL,
	"inputs_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"assumptions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evidence_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"kind" text NOT NULL,
	"uri" text NOT NULL,
	"sha256" text NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"warehouse_id" uuid,
	"supplier_id" uuid,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"damaged_quantity" integer DEFAULT 0 NOT NULL,
	"min_threshold" integer DEFAULT 10 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'available' NOT NULL,
	"warehouse" text DEFAULT 'Central Warehouse Dhaka' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nem_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"utility" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"application_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"role" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"project_request_id" uuid,
	"project_type" text DEFAULT 'solar' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"customer_name" text NOT NULL,
	"contact_number" text NOT NULL,
	"email" text,
	"division" text NOT NULL,
	"district" text NOT NULL,
	"upazila" text NOT NULL,
	"village" text NOT NULL,
	"address" text,
	"configuration" jsonb NOT NULL,
	"estimate" jsonb NOT NULL,
	"pricing" jsonb NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"payment_method" text DEFAULT 'cod' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_transaction_id" text,
	"technician_id" uuid,
	"scheduled_date" text,
	"scheduled_slot" text DEFAULT 'full_day',
	"installation_status" text DEFAULT 'pending',
	"notes" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "package_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"technical_fit" numeric(4, 3) NOT NULL,
	"budget_fit" numeric(4, 3) NOT NULL,
	"availability_fit" numeric(4, 3) NOT NULL,
	"warranty_fit" numeric(4, 3) NOT NULL,
	"service_fit" numeric(4, 3) NOT NULL,
	"customer_preference_fit" numeric(4, 3) NOT NULL,
	"objective_fit" numeric(4, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"package_type" text DEFAULT 'solar',
	"system_type" text DEFAULT 'on-grid' NOT NULL,
	"capacity_kwp" numeric(6, 2) NOT NULL,
	"panel_product_id" uuid,
	"panel_quantity" integer DEFAULT 0 NOT NULL,
	"turbine_product_id" uuid,
	"turbine_quantity" integer DEFAULT 0,
	"inverter_product_id" uuid,
	"battery_product_id" uuid,
	"battery_quantity" integer DEFAULT 1,
	"mounting_product_id" uuid,
	"component_breakdown" jsonb DEFAULT '[]'::jsonb,
	"installation_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"warranty" text DEFAULT '5 years system / 25 years panel performance' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"expected_generation_monthly_kwh" numeric(8, 2) NOT NULL,
	"suitable_profile" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"method" text NOT NULL,
	"transaction_id" text NOT NULL,
	"gateway_transaction_id" text,
	"val_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_response" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "product_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"company" text,
	"company_id" uuid,
	"model" text,
	"category" text NOT NULL,
	"category_id" uuid,
	"wattage" integer,
	"capacity" numeric(10, 2),
	"capacity_unit" text DEFAULT 'W',
	"dimensions" text,
	"efficiency" numeric(5, 2),
	"warranty" text,
	"description" text,
	"image" text,
	"gallery_images" jsonb DEFAULT '[]'::jsonb,
	"stock" integer DEFAULT 100,
	"availability" text DEFAULT 'in_stock' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"unit" text DEFAULT 'piece' NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"status" "product_status" DEFAULT 'approved' NOT NULL,
	"regular_price" numeric(12, 2) NOT NULL,
	"discount_price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"product_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_request_appliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_request_id" uuid NOT NULL,
	"appliance_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"daily_hours" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "project_request_type" NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"configuration" jsonb NOT NULL,
	"estimate" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"margin_percent" numeric(5, 2) NOT NULL,
	"validity_days" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "requirement_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"customer_name" text NOT NULL,
	"objective" text DEFAULT 'balanced' NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "requirement_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"status" "requirement_status" NOT NULL,
	"source" "requirement_source" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"geom" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid,
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer DEFAULT 0 NOT NULL,
	"new_stock" integer DEFAULT 0 NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"notes" text,
	"actor_name" text DEFAULT 'System',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"company_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "supplier_purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"order_id" uuid,
	"ticket_number" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"technician" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technician_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"scheduled_date" text NOT NULL,
	"scheduled_slot" text DEFAULT 'full_day' NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"conflict_checked" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technician_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" uuid NOT NULL,
	"order_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"payment_type" text DEFAULT 'fixed_commission' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text DEFAULT 'bank_transfer' NOT NULL,
	"reference" text,
	"notes" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technician_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "technician_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"contact_number" text NOT NULL,
	"email" text NOT NULL,
	"address" text,
	"division" text DEFAULT 'Dhaka',
	"district" text DEFAULT 'Dhaka',
	"upazila" text DEFAULT 'Gulshan',
	"village" text DEFAULT 'Gulshan-2',
	"technician_type_id" uuid,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"experience_years" integer DEFAULT 1,
	"solar_experience_years" integer DEFAULT 3,
	"wind_experience_years" integer DEFAULT 1,
	"hybrid_experience_years" integer DEFAULT 2,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"rating" numeric(3, 2) DEFAULT '4.85',
	"completed_jobs" integer DEFAULT 0,
	"active_jobs" integer DEFAULT 0,
	"availability" text DEFAULT 'available' NOT NULL,
	"service_area" text DEFAULT 'Dhaka' NOT NULL,
	"payment_info" jsonb DEFAULT '{}'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"full_name" text,
	"contact_number" text,
	"division" text,
	"district" text,
	"upazila" text,
	"village" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "utilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"region" text NOT NULL,
	"status" "utility_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"division" text NOT NULL,
	"district" text NOT NULL,
	"address" text NOT NULL,
	"capacity_sqft" integer DEFAULT 5000,
	"manager_name" text,
	"manager_phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"technician" text NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "evidence_assets" ADD CONSTRAINT "evidence_assets_case_id_requirement_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."requirement_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_product_catalog_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_companies_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_project_request_id_project_requests_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_panel_product_id_product_catalog_id_fk" FOREIGN KEY ("panel_product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_turbine_product_id_product_catalog_id_fk" FOREIGN KEY ("turbine_product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_inverter_product_id_product_catalog_id_fk" FOREIGN KEY ("inverter_product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_battery_product_id_product_catalog_id_fk" FOREIGN KEY ("battery_product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_mounting_product_id_product_catalog_id_fk" FOREIGN KEY ("mounting_product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_catalog" ADD CONSTRAINT "product_catalog_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_catalog" ADD CONSTRAINT "product_catalog_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_products" ADD CONSTRAINT "project_products_project_id_project_requests_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_products" ADD CONSTRAINT "project_products_product_id_product_catalog_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_appliances" ADD CONSTRAINT "project_request_appliances_project_request_id_project_requests_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_appliances" ADD CONSTRAINT "project_request_appliances_appliance_id_appliances_id_fk" FOREIGN KEY ("appliance_id") REFERENCES "public"."appliances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_facts" ADD CONSTRAINT "requirement_facts_case_id_requirement_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."requirement_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_product_catalog_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_purchase_orders" ADD CONSTRAINT "supplier_purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_purchase_orders" ADD CONSTRAINT "supplier_purchase_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_payments" ADD CONSTRAINT "technician_payments_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_payments" ADD CONSTRAINT "technician_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_technician_type_id_technician_types_id_fk" FOREIGN KEY ("technician_type_id") REFERENCES "public"."technician_types"("id") ON DELETE no action ON UPDATE no action;