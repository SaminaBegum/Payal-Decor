require("dotenv").config({ path: __dirname + "/../.env" });
const crypto = require("crypto");
const pool = require("../config/db");

async function initEstimationTables() {
  console.log("Connecting to PostgreSQL to initialize Estimation & BOQ tables...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Materials Master Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.materials_master (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        "defaultWastagePct" NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        "hsnCode" VARCHAR(50) DEFAULT '9403',
        "gstRate" NUMERIC(5, 2) DEFAULT 18.00,
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.materials_master verified/created.");

    // 2. Estimations Header Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.estimations (
        id VARCHAR(100) PRIMARY KEY,
        "estimationNumber" VARCHAR(100) UNIQUE NOT NULL,
        "customerId" VARCHAR(100),
        "leadEnquiryId" VARCHAR(100),
        "siteMeasurementId" VARCHAR(100),
        "customerName" VARCHAR(255),
        "projectName" VARCHAR(255),
        "estimationDate" DATE DEFAULT CURRENT_DATE,
        "validUntil" DATE,
        "totalPrimeCost" NUMERIC(14, 2) DEFAULT 0.00,
        "pricingMethod" VARCHAR(50) DEFAULT 'markup',
        "markupPercent" NUMERIC(5, 2) DEFAULT 25.00,
        "marginPercent" NUMERIC(5, 2) DEFAULT 20.00,
        "totalSellingPrice" NUMERIC(14, 2) DEFAULT 0.00,
        "taxRate" NUMERIC(5, 2) DEFAULT 18.00,
        "taxAmount" NUMERIC(14, 2) DEFAULT 0.00,
        "grandTotal" NUMERIC(14, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'Draft',
        notes TEXT,
        "placeOfSupply" VARCHAR(100) DEFAULT '27-Maharashtra',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.estimations verified/created.");

    // 3. Estimation Assembly Items Table (Workstations, Storages, Partitions, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.estimation_items (
        id VARCHAR(100) PRIMARY KEY,
        "estimationId" VARCHAR(100) NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
        "itemCode" VARCHAR(100),
        "itemName" VARCHAR(255) NOT NULL,
        description TEXT,
        "lengthMm" NUMERIC(10, 2) DEFAULT 0.00,
        "widthMm" NUMERIC(10, 2) DEFAULT 0.00,
        "heightMm" NUMERIC(10, 2) DEFAULT 0.00,
        unit VARCHAR(50) DEFAULT 'Nos',
        quantity NUMERIC(10, 2) DEFAULT 1.00,
        "unitSqft" NUMERIC(10, 2) DEFAULT 0.00,
        "totalSqft" NUMERIC(10, 2) DEFAULT 0.00,
        "wastagePercent" NUMERIC(5, 2) DEFAULT 8.00,
        "procurementSqft" NUMERIC(10, 2) DEFAULT 0.00,
        "edgeBandRft" NUMERIC(10, 2) DEFAULT 0.00,
        "sheetsRequired" INTEGER DEFAULT 1,
        "edges" JSONB DEFAULT '{"e1": true, "e2": true, "e3": true, "e4": false}',
        "materialCost" NUMERIC(12, 2) DEFAULT 0.00,
        "hardwareCost" NUMERIC(12, 2) DEFAULT 0.00,
        "labourCost" NUMERIC(12, 2) DEFAULT 0.00,
        "otherCost" NUMERIC(12, 2) DEFAULT 0.00,
        "unitPrimeCost" NUMERIC(12, 2) DEFAULT 0.00,
        "totalPrimeCost" NUMERIC(12, 2) DEFAULT 0.00,
        "unitSellingPrice" NUMERIC(12, 2) DEFAULT 0.00,
        "totalSellingPrice" NUMERIC(14, 2) DEFAULT 0.00,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.estimation_items verified/created.");

    // 4. Estimation BOQ Lines Table (Exploded Material, Hardware, Labour, Transport)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.estimation_boq_lines (
        id VARCHAR(100) PRIMARY KEY,
        "estimationId" VARCHAR(100) NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
        "estimationItemId" VARCHAR(100) REFERENCES public.estimation_items(id) ON DELETE CASCADE,
        "materialId" VARCHAR(100) REFERENCES public.materials_master(id) ON DELETE SET NULL,
        "lineCategory" VARCHAR(100) NOT NULL, -- 'Sheet Material', 'Edge Band', 'Hardware', 'Electrical', 'Labour', 'Transport'
        description VARCHAR(255) NOT NULL,
        "baseQty" NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
        "wastagePercent" NUMERIC(5, 2) DEFAULT 0.00,
        "procurementQty" NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
        unit VARCHAR(50) NOT NULL,
        "unitCost" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        "totalCost" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table public.estimation_boq_lines verified/created.");

    // 5. Seed standard materials for Payal Decor if empty
    const countRes = await client.query("SELECT COUNT(*) FROM public.materials_master");
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log("Seeding standard materials for Payal Decor...");
      const seedMaterials = [
        ["MAT-PLB-25", "25mm Pre-Lam Particle Board", "Sheet Material", "Sq.Ft", 65.00, 10.00, "9403"],
        ["MAT-PLB-18", "18mm Pre-Lam Particle Board", "Sheet Material", "Sq.Ft", 52.00, 10.00, "9403"],
        ["MAT-PLB-09", "9mm Pre-Lam Board (Backing)", "Sheet Material", "Sq.Ft", 36.00, 10.00, "9403"],
        ["MAT-MDF-18", "18mm Exterior Grade MDF", "Sheet Material", "Sq.Ft", 58.00, 8.00, "9403"],
        ["MAT-PLY-18", "18mm Marine BWP Plywood", "Sheet Material", "Sq.Ft", 95.00, 8.00, "4412"],
        ["MAT-EB-2MM", "2mm PVC Edge Banding Tape", "Edge Band", "RFT", 9.50, 5.00, "3920"],
        ["MAT-EB-08MM", "0.8mm PVC Edge Banding Tape", "Edge Band", "RFT", 4.80, 5.00, "3920"],
        ["MAT-LEG-LOOP", "MS Loop Legs 50x50 Powder Coated", "Metal Frame", "Pair", 1450.00, 0.00, "9403"],
        ["MAT-PART-TILE", "30mm Fabric Pin-up Tile (1200x350)", "Partition", "Nos", 850.00, 0.00, "9403"],
        ["MAT-PART-GLASS", "Glass Partition Panel (1200x350)", "Partition", "Nos", 1100.00, 0.00, "9403"],
        ["MAT-HW-HINGE", "Soft Close Concealed Hinges", "Hardware", "Pair", 180.00, 0.00, "8302"],
        ["MAT-HW-DRAWER", "Telescopic Drawer Slide 18 inch", "Hardware", "Set", 320.00, 0.00, "8302"],
        ["MAT-HW-CAM", "Knockdown Cam & Minifix Pins Set", "Hardware", "Set", 25.00, 0.00, "8302"],
        ["MAT-HW-HANDLE", "Aluminium D-Handle 128mm", "Hardware", "Nos", 85.00, 0.00, "8302"],
        ["MAT-ELEC-GROMMET", "60mm Wire Cutout Grommet", "Electrical", "Nos", 45.00, 0.00, "3926"],
        ["MAT-ELEC-RACEWAY", "Dual Raceway Cable Tray (Metal)", "Electrical", "Nos", 450.00, 0.00, "9403"],
        ["MAT-LAB-SIZING", "Factory Cutting & Sizing Labour", "Labour", "Sq.Ft", 12.00, 0.00, "9988"],
        ["MAT-LAB-EDGE", "Edge Banding Application Labour", "Labour", "RFT", 4.00, 0.00, "9988"],
        ["MAT-LAB-CNC", "CNC Drilling & Boring Labour", "Labour", "Component", 35.00, 0.00, "9988"],
        ["MAT-LAB-ASSEMBLY", "Factory Assembly Labour", "Labour", "Seat", 250.00, 0.00, "9988"],
        ["MAT-LAB-INSTALL", "Site Installation & Fitting (Pune)", "Labour", "Seat", 300.00, 0.00, "9988"],
        ["MAT-TRANS-LOCAL", "Local Transport & Mathadi Handling", "Transport", "Trip", 1200.00, 0.00, "9965"]
      ];

      for (const item of seedMaterials) {
        const id = `mat-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
        await client.query(`
          INSERT INTO public.materials_master (
            id, code, name, category, unit, rate, "defaultWastagePct", "hsnCode"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (code) DO NOTHING;
        `, [id, item[0], item[1], item[2], item[3], item[4], item[5], item[6]]);
      }
      console.log(`Seeded ${seedMaterials.length} materials into public.materials_master.`);
    }

    await client.query("COMMIT");
    console.log("All Estimation & BOQ tables successfully initialized!");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to initialize Estimation tables:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

initEstimationTables();
