import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

export async function initializeDatabase() {
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set. Skipping automatic table creation.");
    return;
  }

  const sql = postgres(databaseUrl);

  try {
    console.log("Checking and creating tables if they don't exist...");

    // 1. Warehouses
    await sql`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 2. Categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 3. Subcategories
    await sql`
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id),
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 4. Products
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        unit_price NUMERIC(15, 2) DEFAULT 0,
        category_id INTEGER REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES subcategories(id),
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 5. Entities
    await sql`
      CREATE TABLE IF NOT EXISTS entities (
        rut TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'client', 'supplier', 'both'
        address TEXT,
        phone TEXT,
        email TEXT,
        comuna TEXT,
        ciudad TEXT,
        is_partner BOOLEAN DEFAULT FALSE,
        default_discount NUMERIC(5, 2) DEFAULT 0,
        person_type TEXT,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 6. Documents
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        doc_number TEXT NOT NULL,
        doc_type TEXT NOT NULL, -- 'factura', 'boleta', 'guia', 'nota_credito'
        category TEXT NOT NULL, -- 'purchase', 'sale', 'transfer'
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        entity_rut TEXT REFERENCES entities(rut),
        global_discount NUMERIC(5, 2) DEFAULT 0,
        payment_method TEXT, -- 'efectivo', 'transferencia', 'credito'
        total_net NUMERIC(15, 2) DEFAULT 0,
        total_vat NUMERIC(15, 2) DEFAULT 0,
        total_amount NUMERIC(15, 2) DEFAULT 0,
        from_warehouse_id INTEGER REFERENCES warehouses(id),
        to_warehouse_id INTEGER REFERENCES warehouses(id),
        status TEXT DEFAULT 'active', -- 'active', 'paid', 'cancelled'
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 7. Document Lines
    await sql`
      CREATE TABLE IF NOT EXISTS document_lines (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        quantity NUMERIC(15, 3) NOT NULL,
        price NUMERIC(15, 2) NOT NULL,
        discount NUMERIC(5, 2) DEFAULT 0,
        total NUMERIC(15, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 8. Stock
    await sql`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        product_id TEXT REFERENCES products(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        location TEXT DEFAULT 'General',
        quantity NUMERIC(15, 3) DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 9. Payments
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount NUMERIC(15, 2) NOT NULL,
        method TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Optional: Create a default warehouse if none exist
    const warehouses = await sql`SELECT id FROM warehouses LIMIT 1`;
    if (warehouses.length === 0) {
      await sql`INSERT INTO warehouses (name) VALUES ('Bodega Central')`;
      console.log("Default warehouse created.");
    }

    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    await sql.end();
  }
}
