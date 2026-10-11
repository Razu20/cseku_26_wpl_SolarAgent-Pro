import 'dotenv/config';
import { pool } from './client.js';

async function migrateShop() {
  const client = await pool.connect();
  try {
    console.log('Running shop migrations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        logo text,
        description text,
        website text,
        country text,
        contact_information text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        slug text NOT NULL UNIQUE,
        description text,
        icon text,
        image text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS company text;
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS image text;
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS capacity numeric(10, 2);
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS capacity_unit text DEFAULT 'W';
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BDT';
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'piece';
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS discount_price numeric(12, 2);
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'in_stock';
      ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS project_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid REFERENCES project_requests(id) ON DELETE CASCADE,
        product_id uuid REFERENCES product_catalog(id) ON DELETE CASCADE,
        quantity integer NOT NULL DEFAULT 1,
        unit_price numeric(12, 2) NOT NULL,
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    console.log('Shop migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateShop();
