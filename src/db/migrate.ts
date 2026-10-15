import 'dotenv/config';
import { pool } from './client';
import { readFile } from 'node:fs/promises';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(72819421)");
    const { rows: [state] } = await client.query("SELECT to_regclass('public.users') AS users");
    if (!state.users) {
      const initial = await readFile(new URL('../../drizzle/0000_flimsy_hulk.sql', import.meta.url), 'utf8');
      await client.query(initial);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamp with time zone NOT NULL,
        used_at timestamp with time zone
      );
      CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens(user_id);
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES product_catalog(id);
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warehouse_id uuid;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES companies(id);
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reserved_quantity integer NOT NULL DEFAULT 0;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS available_quantity integer NOT NULL DEFAULT 0;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS damaged_quantity integer NOT NULL DEFAULT 0;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_threshold integer NOT NULL DEFAULT 10;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost numeric(12, 2) DEFAULT '0';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_slot text DEFAULT 'full_day';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS installation_status text DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by text;

      CREATE TABLE IF NOT EXISTS warehouses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        division text NOT NULL,
        district text NOT NULL,
        address text NOT NULL,
        capacity_sqft integer DEFAULT 5000,
        manager_name text,
        manager_phone text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_item_id uuid REFERENCES inventory_items(id),
        product_id uuid NOT NULL REFERENCES product_catalog(id),
        warehouse_id uuid REFERENCES warehouses(id),
        type text NOT NULL,
        quantity integer NOT NULL,
        previous_stock integer NOT NULL DEFAULT 0,
        new_stock integer NOT NULL DEFAULT 0,
        reference_type text,
        reference_id text,
        notes text,
        actor_name text DEFAULT 'System',
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS supplier_purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number text NOT NULL UNIQUE,
        company_id uuid NOT NULL REFERENCES companies(id),
        warehouse_id uuid REFERENCES warehouses(id),
        status text NOT NULL DEFAULT 'pending',
        items jsonb NOT NULL DEFAULT '[]'::jsonb,
        total_amount numeric(12, 2) NOT NULL DEFAULT 0,
        expected_delivery_date timestamp with time zone,
        notes text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS technician_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        technician_id uuid NOT NULL REFERENCES technicians(id),
        order_id uuid NOT NULL REFERENCES orders(id),
        scheduled_date text NOT NULL,
        scheduled_slot text NOT NULL DEFAULT 'full_day',
        status text NOT NULL DEFAULT 'assigned',
        conflict_checked boolean DEFAULT true,
        notes text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id),
        role text,
        title text NOT NULL,
        message text NOT NULL,
        type text NOT NULL DEFAULT 'info',
        link text,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    // Initialize availability only when adding the missing legacy columns.
    await client.query(`UPDATE inventory_items SET available_quantity = GREATEST(0, quantity - reserved_quantity - damaged_quantity) WHERE available_quantity <> GREATEST(0, quantity - reserved_quantity - damaged_quantity)`);
    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await migrate();
