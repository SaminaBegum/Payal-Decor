require("dotenv").config();
const pool = require("../config/db");

async function initPurchaseTables() {
  console.log("--- Initializing Purchase Module Tables in PostgreSQL ---");

  try {
    // 1. Create public.purchase_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.purchase_orders (
        id TEXT PRIMARY KEY,
        po_no TEXT UNIQUE NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT NOT NULL,
        vendor_company TEXT NOT NULL,
        vendor_phone TEXT DEFAULT '',
        vendor_email TEXT DEFAULT '',
        vendor_gstin TEXT DEFAULT '',
        vendor_address TEXT DEFAULT '',
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_delivery_date DATE,
        delivery_address TEXT DEFAULT '',
        payment_terms TEXT DEFAULT '30 Days Credit',
        notes TEXT DEFAULT '',
        status TEXT DEFAULT 'Pending',
        subtotal NUMERIC(12, 2) DEFAULT 0,
        discount_amount NUMERIC(12, 2) DEFAULT 0,
        taxable_amount NUMERIC(12, 2) DEFAULT 0,
        cgst_amount NUMERIC(12, 2) DEFAULT 0,
        sgst_amount NUMERIC(12, 2) DEFAULT 0,
        igst_amount NUMERIC(12, 2) DEFAULT 0,
        transport_charges NUMERIC(12, 2) DEFAULT 0,
        round_off NUMERIC(12, 2) DEFAULT 0,
        grand_total NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.purchase_orders verified/created.");

    // 2. Create public.purchase_order_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.purchase_order_items (
        id TEXT PRIMARY KEY,
        purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
        item_description TEXT NOT NULL,
        material_id VARCHAR,
        category TEXT DEFAULT 'General',
        hsn_code TEXT DEFAULT '9403',
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
        unit TEXT DEFAULT 'Nos',
        unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_pct NUMERIC(5, 2) DEFAULT 0,
        gst_rate NUMERIC(5, 2) DEFAULT 18,
        taxable_value NUMERIC(12, 2) DEFAULT 0,
        gst_amount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.purchase_order_items verified/created.");

    // 3. Create helpful indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_no ON public.purchase_orders(po_no);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON public.purchase_orders(vendor_company);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_po_items_order_id ON public.purchase_order_items(purchase_order_id);
    `);
    console.log("Purchase order indexes verified/created.");

    // 4. Seed initial sample purchase order if table is empty
    const countRes = await pool.query(`SELECT COUNT(*) AS count FROM public.purchase_orders;`);
    const count = parseInt(countRes.rows[0].count, 10);
    console.log(`Current purchase orders count: ${count}`);

    if (count === 0) {
      console.log("Seeding sample purchase order...");
      const poId = "po_seed_001";
      await pool.query(`
        INSERT INTO public.purchase_orders (
          id, po_no, vendor_name, vendor_company, vendor_phone, vendor_email,
          vendor_gstin, vendor_address, order_date, expected_delivery_date,
          delivery_address, payment_terms, notes, status,
          subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount,
          igst_amount, transport_charges, round_off, grand_total
        ) VALUES (
          $1, 'PO-2026-27/001', 'Ramesh Patel', 'Shree Ganesh Timber & Plywood',
          '9876543210', 'sales@shreetimber.com', '27AAAAA0000A1Z5',
          'Plot 45, Timber Market, Pune 411038', '2026-11-15', '2026-11-20',
          'Payal Decor Central Works, Timber Market, Pune', '30 Days Credit',
          'Commercial Marine grade with ISI mark certification', 'Received',
          285000, 14250, 270750, 24367.5, 24367.5,
          0, 2500, 0, 321985
        );
      `, [poId]);

      await pool.query(`
        INSERT INTO public.purchase_order_items (
          id, purchase_order_id, item_description, category, hsn_code,
          quantity, unit, unit_rate, discount_pct, gst_rate,
          taxable_value, gst_amount, total_amount
        ) VALUES (
          'item_seed_001', $1, '18mm BWR Marine Plywood (8x4)', 'Plywood', '4412',
          100, 'Sheets', 2850, 5, 18,
          270750, 48735, 319485
        );
      `, [poId]);

      console.log("Seeded initial sample purchase order PO-2026-27/001 successfully.");
    }

    console.log("Purchase module tables setup complete!");
  } catch (err) {
    console.error("Error initializing purchase tables:", err);
  } finally {
    await pool.end();
  }
}

initPurchaseTables();
