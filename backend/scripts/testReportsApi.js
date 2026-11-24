require("dotenv").config();
const request = require("supertest");
const app = require("../app");
const pool = require("../config/db");

async function runReportsTests() {
  console.log("--- Starting Business Reports API Automated Tests ---");
  try {
    // 1. GET /api/reports/modules
    console.log("1. Testing GET /api/reports/modules...");
    const modRes = await request(app).get("/api/reports/modules");
    console.log("Modules Status:", modRes.status);
    console.log("Modules Count:", modRes.body.modules?.length);
    if (modRes.status !== 200 || !Array.isArray(modRes.body.modules) || modRes.body.modules.length < 5) {
      throw new Error("Failed to fetch reports module list");
    }

    // 2. GET /api/reports (Executive Overview)
    console.log("\n2. Testing GET /api/reports (Executive Overview)...");
    const execRes = await request(app).get("/api/reports?module=all");
    console.log("Executive Report Status:", execRes.status);
    console.log("Executive KPIs:", execRes.body.data?.kpis?.map((k) => `${k.label}: ${k.value}`));
    if (execRes.status !== 200 || !execRes.body.data?.kpis) {
      throw new Error("Failed to fetch executive overview report");
    }

    // 3. GET /api/reports?module=purchase
    console.log("\n3. Testing GET /api/reports?module=purchase...");
    const purRes = await request(app).get("/api/reports?module=purchase");
    console.log("Purchase Report Status:", purRes.status);
    console.log("Purchase Records Count:", purRes.body.data?.records?.length);
    console.log("Purchase Top Vendor:", purRes.body.data?.vendorRanking?.[0]?.vendorCompany);
    if (purRes.status !== 200 || !Array.isArray(purRes.body.data?.records)) {
      throw new Error("Failed to fetch purchase report");
    }

    // 4. GET /api/reports?module=vendors
    console.log("\n4. Testing GET /api/reports?module=vendors...");
    const venRes = await request(app).get("/api/reports?module=vendors");
    console.log("Vendors Report Status:", venRes.status);
    console.log("Vendors Count:", venRes.body.data?.records?.length);
    if (venRes.status !== 200 || !Array.isArray(venRes.body.data?.records)) {
      throw new Error("Failed to fetch vendors report");
    }

    // 5. GET /api/reports?module=quotations
    console.log("\n5. Testing GET /api/reports?module=quotations...");
    const quoRes = await request(app).get("/api/reports?module=quotations");
    console.log("Quotations Report Status:", quoRes.status);
    console.log("Quotations Count:", quoRes.body.data?.records?.length);
    if (quoRes.status !== 200 || !Array.isArray(quoRes.body.data?.records)) {
      throw new Error("Failed to fetch quotations report");
    }

    // 6. GET /api/reports?module=estimations
    console.log("\n6. Testing GET /api/reports?module=estimations...");
    const estRes = await request(app).get("/api/reports?module=estimations");
    console.log("Estimations Report Status:", estRes.status);
    console.log("Estimations Count:", estRes.body.data?.records?.length);
    if (estRes.status !== 200) {
      throw new Error("Failed to fetch estimations report");
    }

    // 7. GET /api/reports?module=finance
    console.log("\n7. Testing GET /api/reports?module=finance...");
    const finRes = await request(app).get("/api/reports?module=finance");
    console.log("Finance Report Status:", finRes.status);
    console.log("Net GST:", finRes.body.data?.gstSummary?.netPayable);
    if (finRes.status !== 200) {
      throw new Error("Failed to fetch financial report");
    }

    // 8. Test time-range filter
    console.log("\n8. Testing Time Filter: GET /api/reports?module=purchase&timeRange=this_month...");
    const filterRes = await request(app).get("/api/reports?module=purchase&timeRange=this_month");
    console.log("Filtered Status:", filterRes.status);
    console.log("Filtered Records:", filterRes.body.data?.records?.length);
    if (filterRes.status !== 200) {
      throw new Error("Failed to filter by timeRange");
    }

    console.log("\n===========================================");
    console.log("ALL REPORTS API TESTS PASSED SUCCESSFULLY!");
    console.log("===========================================\n");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runReportsTests();
