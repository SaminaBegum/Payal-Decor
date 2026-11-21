require("dotenv").config();
const pool = require("../config/db");

async function initVendorTables() {
  try {
    console.log("Checking and initializing Vendor tables...");

    // 1. Ensure public."Vendor" table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."Vendor" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        category TEXT,
        city TEXT,
        status TEXT DEFAULT 'Active',
        gstin TEXT,
        address TEXT,
        state TEXT,
        pincode TEXT,
        "contactPerson" TEXT,
        notes TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Also check constraints / columns
    const columnsRes = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'Vendor'
      ORDER BY ordinal_position;
    `);
    console.log("Vendor table columns:", columnsRes.rows.map(c => `${c.column_name} (${c.is_nullable})`));

    // 2. Ensure public.vendor_categories table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.vendor_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed default vendor categories if empty
    const defaultCategories = [
      "Plywood",
      "Laminates",
      "Hardware",
      "Edge Band",
      "Glass",
      "Fabric",
      "Other"
    ];

    for (const cat of defaultCategories) {
      await pool.query(
        `INSERT INTO public.vendor_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [cat]
      );
    }

    const catRes = await pool.query(`SELECT id, name FROM public.vendor_categories ORDER BY id;`);
    console.log("Vendor categories:", catRes.rows);

    console.log("Vendor tables initialized successfully.");
  } catch (err) {
    console.error("Error initializing vendor tables:", err);
  } finally {
    await pool.end();
  }
}

initVendorTables();
