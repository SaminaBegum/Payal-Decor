require("dotenv").config();
const pool = require("../config/db");

async function seedAllPurchaseOrders() {
  try {
    console.log("Checking and syncing all seed purchase orders to PostgreSQL...");

    // Check existing
    const existing = await pool.query(`SELECT po_no FROM public.purchase_orders;`);
    const existingNos = new Set(existing.rows.map((r) => r.po_no));
    console.log("Existing PO numbers in database:", Array.from(existingNos));

    // PO 2: Supreme Hardware & Fittings
    if (!existingNos.has("PO-2026-27/002")) {
      const po2Id = "po_seed_002";
      await pool.query(
        `
        INSERT INTO public.purchase_orders (
          id, po_no, vendor_name, vendor_company, vendor_phone, vendor_email,
          vendor_gstin, vendor_address, order_date, expected_delivery_date,
          delivery_address, payment_terms, notes, status,
          subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount,
          igst_amount, transport_charges, round_off, grand_total
        ) VALUES (
          $1, 'PO-2026-27/002', 'Kavya Yadav', 'Supreme Hardware & Fittings',
          '9112903532', 'yadavkavya@gmail.com', '27BBBPS1234B1Z2',
          'Shop 12, Industrial Area, Pune 411026', '2026-11-18', '2026-11-25',
          'Payal Decor Project Site, Hinjawadi Phase 2, Pune', '50% Advance, 50% on Delivery',
          'SS 304 Soft close hinges with mounting screws', 'Ordered',
          86400, 1920, 84480, 7603.2, 7603.2,
          0, 800, 0.6, 100487
        );
      `,
        [po2Id]
      );

      // Items for PO 2
      await pool.query(
        `
        INSERT INTO public.purchase_order_items (
          id, purchase_order_id, item_description, category, hsn_code,
          quantity, unit, unit_rate, discount_pct, gst_rate,
          taxable_value, gst_amount, total_amount
        ) VALUES 
        (
          'item_seed_002', $1, 'Soft-Close Hydraulic Hinges (0 Crank)', 'Hardware', '8302',
          150, 'Pairs', 320, 0, 18,
          48000, 8640, 56640
        ),
        (
          'item_seed_003', $1, '18" Telescopic Ball Bearing Slides (45kg)', 'Hardware', '8302',
          80, 'Sets', 480, 5, 18,
          36480, 6566.4, 43046.4
        );
      `,
        [po2Id]
      );

      console.log("Seeded PO-2026-27/002 with 2 items.");
    }

    // PO 3: Global Edge Bands & Polymers
    if (!existingNos.has("PO-2026-27/003")) {
      const po3Id = "po_seed_003";
      await pool.query(
        `
        INSERT INTO public.purchase_orders (
          id, po_no, vendor_name, vendor_company, vendor_phone, vendor_email,
          vendor_gstin, vendor_address, order_date, expected_delivery_date,
          delivery_address, payment_terms, notes, status,
          subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount,
          igst_amount, transport_charges, round_off, grand_total
        ) VALUES (
          $1, 'PO-2026-27/003', 'Vijay Patil', 'Global Edge Bands & Polymers',
          '9112134193', 'patilvijay@gmail.com', '27CDEPG5678C1Z8',
          'MIDC Kupwad, Sangli 416436', '2026-11-21', '2026-11-28',
          'Payal Decor Central Works, Timber Market, Pune', 'Immediate on Receipt',
          'High gloss 2mm edge band rolls (50m per roll)', 'Pending',
          21250, 425, 20825, 1874.25, 1874.25,
          0, 600, 0.25, 25174
        );
      `,
        [po3Id]
      );

      // Items for PO 3
      await pool.query(
        `
        INSERT INTO public.purchase_order_items (
          id, purchase_order_id, item_description, category, hsn_code,
          quantity, unit, unit_rate, discount_pct, gst_rate,
          taxable_value, gst_amount, total_amount
        ) VALUES (
          'item_seed_004', $1, '2mm PVC Edge Banding Tape (Walnut)', 'Edge Band', '3920',
          2500, 'RFT', 8.5, 2, 18,
          20825, 3748.5, 24573.5
        );
      `,
        [po3Id]
      );

      console.log("Seeded PO-2026-27/003 with 1 item.");
    }

    const finalCount = await pool.query(`SELECT COUNT(*) AS count FROM public.purchase_orders;`);
    console.log(`Current total purchase_orders in database: ${finalCount.rows[0].count}`);

    const finalItemsCount = await pool.query(`SELECT COUNT(*) AS count FROM public.purchase_order_items;`);
    console.log(`Current total purchase_order_items in database: ${finalItemsCount.rows[0].count}`);
  } catch (err) {
    console.error("Error seeding purchase orders:", err);
  } finally {
    await pool.end();
  }
}

seedAllPurchaseOrders();
