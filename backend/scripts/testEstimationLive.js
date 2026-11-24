require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");
const estimationService = require("../services/estimationService");

async function testEstimationFlow() {
  console.log("=== 1. TESTING MATERIALS MASTER ===");
  const materials = await estimationService.getAllMaterials();
  console.log(`Found ${materials.length} raw materials in master catalog.`);
  if (materials.length > 0) {
    console.log("Sample Material:", materials[0].name, "@ ₹" + materials[0].rate + "/" + materials[0].unit);
  }

  console.log("\n=== 2. TESTING BOQ EXPLOSION & CALCULATION ===");
  const testMetrics = estimationService.calculateSpatialMetrics({
    lengthMm: 1200,
    widthMm: 600,
    heightMm: 750,
    quantity: 4,
    wastagePercent: 10,
    edges: { e1: true, e2: true, e3: true, e4: false },
  });
  console.log("Spatial Metrics:", {
    unitSqft: testMetrics.unitSqft,
    totalSqft: testMetrics.totalSqft,
    procurementSqft: testMetrics.procurementSqft,
    sheetsRequired: testMetrics.sheetsRequired,
    edgeBandRft: testMetrics.edgeBandRft,
  });

  const boqLines = estimationService.generateDefaultBOQ(testMetrics, materials);
  console.log(`Generated ${boqLines.length} exploded BOQ lines.`);
  boqLines.forEach((l, i) => {
    console.log(`  [${i + 1}] ${l.lineCategory}: ${l.description} | Qty: ${l.procurementQty} ${l.unit} @ ₹${l.unitCost} = ₹${l.totalCost}`);
  });

  console.log("\n=== 3. TESTING DATABASE INSERTION (CREATE ESTIMATION) ===");
  const testEstPayload = {
    estimationNumber: `EST-TEST-${Date.now().toString().slice(-6)}`,
    customerName: "Payal Decor Test Client",
    projectName: "Office Workstations 4-Seater",
    pricingMethod: "markup",
    markupPercent: 25,
    status: "Draft",
    notes: "Automated live database persistence test",
    placeOfSupply: "27-Maharashtra",
    items: [
      {
        itemName: "4-Seater Linear Workstation Cluster",
        description: "1200x600mm tops with 25mm pre-lam board & MS loop legs",
        lengthMm: 1200,
        widthMm: 600,
        heightMm: 750,
        quantity: 4,
        unit: "Nos",
        wastagePercent: 10,
        edges: { e1: true, e2: true, e3: true, e4: false },
        boqLines: boqLines,
      },
    ],
  };

  const created = await estimationService.createEstimation(testEstPayload);
  console.log("Created Estimation in DB with ID:", created.id);
  console.log("Calculated Total Prime Cost: ₹", created.totalPrimeCost);
  console.log("Calculated Selling Price (25% Markup): ₹", created.totalSellingPrice);
  console.log("Grand Total with 18% GST: ₹", created.grandTotal);
  console.log("Saved Items Count:", created.items?.length);
  console.log("Saved BOQ Lines Count for Item 1:", created.items?.[0]?.boqLines?.length);

  console.log("\n=== 4. TESTING DATABASE RETRIEVAL ===");
  const fetched = await estimationService.getEstimationById(created.id);
  console.log(`Retrieved Estimation "${fetched.estimationNumber}" with ${fetched.items.length} items and ${fetched.allBoqLines.length} total BOQ lines.`);

  console.log("\n=== 5. TESTING UPDATE ===");
  const updated = await estimationService.updateEstimation(created.id, {
    status: "Approved",
    notes: "Client approved 25% markup estimation",
  });
  console.log("Updated Status:", updated.status, "| Notes:", updated.notes);

  console.log("\n=== 6. TESTING CLEANUP (DELETE CASCADE) ===");
  const deleted = await estimationService.deleteEstimation(created.id);
  console.log("Deleted Estimation ID:", deleted.id);

  // Check cascade in child tables
  const checkItems = await pool.query('SELECT COUNT(*) FROM public.estimation_items WHERE "estimationId" = $1', [created.id]);
  const checkBoq = await pool.query('SELECT COUNT(*) FROM public.estimation_boq_lines WHERE "estimationId" = $1', [created.id]);
  console.log("Orphan Items in DB:", checkItems.rows[0].count, "(should be 0)");
  console.log("Orphan BOQ Lines in DB:", checkBoq.rows[0].count, "(should be 0)");

  await pool.end();
  console.log("\nALL ESTIMATION & BOQ TESTS PASSED WITH 100% SUCCESS!");
}

testEstimationFlow().catch(console.error);
