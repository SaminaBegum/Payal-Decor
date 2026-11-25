require("dotenv").config();
const pool = require("../config/db");

async function initProductsTable() {
  const client = await pool.connect();
  try {
    console.log("Initializing products table in PostgreSQL...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        unit VARCHAR(50) NOT NULL DEFAULT 'NOS',
        price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        cost_price NUMERIC(12, 2) DEFAULT 0.00,
        hsn_code VARCHAR(20) DEFAULT '9403',
        gst_rate NUMERIC(5, 2) DEFAULT 18.00,
        dimensions VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
      CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
    `);

    console.log("Table 'public.products' ready.");

    const countRes = await client.query("SELECT COUNT(*) AS total FROM public.products;");
    const count = parseInt(countRes.rows[0].total, 10);

    if (count === 0) {
      console.log("Seeding default Payal Decor furniture products...");
      const seedProducts = [
        {
          id: "prd_kt001",
          name: "L-Shaped Modular Acrylic Kitchen",
          code: "PD-KT-001",
          sku: "PD-KT-001",
          category: "Modular Kitchen",
          description: "High-gloss anti-scratch acrylic shutters with Marine BWP plywood carcass, soft-close tandem boxes, and quartz countertop provision.",
          unit: "NOS",
          price: 185000,
          cost_price: 125000,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "10ft x 8ft x 7ft",
          status: "Active"
        },
        {
          id: "prd_wd001",
          name: "3-Door Sliding Wardrobe with Lacquered Glass",
          code: "PD-WD-001",
          sku: "PD-WD-001",
          category: "Wardrobe",
          description: "Full-height wardrobe with heavy-duty aluminum track, bronze lacquered glass accents, sensor LED strip profiles, and inner vanity drawers.",
          unit: "NOS",
          price: 95000,
          cost_price: 62000,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "8ft x 7ft x 2ft",
          status: "Active"
        },
        {
          id: "prd_lv001",
          name: "Floating TV Entertainment Console 7ft",
          code: "PD-LV-001",
          sku: "PD-LV-001",
          category: "Living & TV Units",
          description: "Wall-hung low-height console with fluted charcoal laminate, gold hairline inlay, wire-management conduits, and hydraulic push shutters.",
          unit: "NOS",
          price: 38500,
          cost_price: 24000,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "7ft x 15in x 18in",
          status: "Active"
        },
        {
          id: "prd_of001",
          name: "Executive Veneer Desk with Modesty Panel",
          code: "PD-OF-001",
          sku: "PD-OF-001",
          category: "Office & Desks",
          description: "Natural teak veneer finish with PU polish, chamfered edge profile, attached lockable 3-drawer pedestal, and built-in power grommet.",
          unit: "NOS",
          price: 48000,
          cost_price: 31000,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "6ft x 3ft x 2.5ft",
          status: "Active"
        },
        {
          id: "prd_vn001",
          name: "Wall-Mounted Master Bathroom Vanity",
          code: "PD-VN-001",
          sku: "PD-VN-001",
          category: "Vanities",
          description: "Moisture-resistant HDHMR board with polyurethane stone finish, medicine cabinet mirror with touch sensor defogger, and brass handles.",
          unit: "NOS",
          price: 24000,
          cost_price: 15500,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "36in x 20in x 24in",
          status: "Active"
        },
        {
          id: "prd_pn001",
          name: "Acoustic Fluted Charcoal Wall Paneling",
          code: "PD-PN-001",
          sku: "PD-PN-001",
          category: "Partitions & Paneling",
          description: "Decorative tongue-and-groove fluted panels with sound absorption backing, fire-retardant grade, seamless interlocking system.",
          unit: "SQFT",
          price: 450,
          cost_price: 290,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "Custom Cut-to-Size",
          status: "Active"
        },
        {
          id: "prd_of002",
          name: "4-Seater Linear Office Workstation Cluster",
          code: "PD-OF-002",
          sku: "PD-OF-002",
          category: "Office & Desks",
          description: "Powder-coated 50x50 MS frame, 25mm pre-lam desktop with 2mm PVC edge banding, fabric magnetic screen divider, and wire raceways.",
          unit: "SET",
          price: 65000,
          cost_price: 44000,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "8ft x 4ft x 4ft",
          status: "Active"
        },
        {
          id: "prd_kt002",
          name: "Crockery Display Unit with Profile Glass Shutters",
          code: "PD-KT-002",
          sku: "PD-KT-002",
          category: "Modular Kitchen",
          description: "Slim black aluminum frame shutters with 4mm fluted toughened glass, integrated warm-white vertical LED lighting, and wine rack.",
          unit: "NOS",
          price: 52000,
          cost_price: 34500,
          hsn_code: "9403",
          gst_rate: 18,
          dimensions: "4ft x 1.5ft x 7ft",
          status: "Active"
        }
      ];

      for (const p of seedProducts) {
        await client.query(`
          INSERT INTO public.products (
            id, name, code, sku, category, description, unit, price, cost_price,
            hsn_code, gst_rate, dimensions, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (code) DO NOTHING;
        `, [
          p.id, p.name, p.code, p.sku, p.category, p.description, p.unit, p.price,
          p.cost_price, p.hsn_code, p.gst_rate, p.dimensions, p.status
        ]);
      }
      console.log(`Seeded ${seedProducts.length} default products.`);
    } else {
      console.log(`Products table already contains ${count} records. No seed needed.`);
    }

    console.log("Product database initialization finished successfully.");
  } catch (err) {
    console.error("Failed to initialize products table: %s", err.message, err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initProductsTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initProductsTable;
