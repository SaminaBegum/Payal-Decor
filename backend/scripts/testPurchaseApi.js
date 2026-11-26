require("dotenv").config();
const request = require("supertest");
const app = require("../app");

async function runPurchaseTests() {
  console.log("--- Starting Purchase Module API Automated Tests ---");
  let testPoId = null;

  try {
    // 1. GET /api/purchase
    console.log("1. Testing GET /api/purchase...");
    const listRes = await request(app).get("/api/purchase");
    console.log("Status:", listRes.status);
    console.log("Success:", listRes.body.success, "Total:", listRes.body.total);
    if (listRes.status !== 200 || !listRes.body.success) {
      throw new Error("Failed to get purchase orders");
    }

    // 2. GET /api/purchase/stats
    console.log("\n2. Testing GET /api/purchase/stats...");
    const statsRes = await request(app).get("/api/purchase/stats");
    console.log("Stats:", statsRes.body.data);
    if (statsRes.status !== 200 || !statsRes.body.success) {
      throw new Error("Failed to get purchase stats");
    }

    // 3. GET /api/purchase/next-number
    console.log("\n3. Testing GET /api/purchase/next-number...");
    const nextNumRes = await request(app).get("/api/purchase/next-number");
    console.log("Next PO Number:", nextNumRes.body.poNo);
    if (nextNumRes.status !== 200 || !nextNumRes.body.poNo) {
      throw new Error("Failed to get next PO number");
    }

    // 4. POST /api/purchase (Create PO)
    console.log("\n4. Testing POST /api/purchase (Create)...");
    const createRes = await request(app)
      .post("/api/purchase")
      .send({
        vendorCompany: "Apex Plywood & Timber Works",
        vendorName: "Sunil Joshi",
        vendorPhone: "9876543211",
        vendorEmail: "sunil@apexply.com",
        vendorGstin: "27AABCA1234A1Z1",
        vendorAddress: "Gala 5, Lakdi Pul, Pune 411030",
        orderDate: "2026-11-23",
        expectedDeliveryDate: "2026-11-30",
        deliveryAddress: "Payal Decor Central Works, Timber Market, Pune",
        paymentTerms: "30 Days Credit",
        notes: "IS:710 Marine Grade BWP Plywood",
        status: "Pending",
        transportCharges: 1500,
        items: [
          {
            description: "18mm BWP Marine Plywood",
            category: "Plywood",
            hsnCode: "4412",
            quantity: 50,
            unit: "Sheets",
            rate: 2900,
            discountPct: 5,
            gstRate: 18
          },
          {
            description: "2mm PVC Edge Band (Oak)",
            category: "Edge Band",
            hsnCode: "3920",
            quantity: 1000,
            unit: "RFT",
            rate: 8,
            discountPct: 0,
            gstRate: 18
          }
        ]
      });

    console.log("Created PO status:", createRes.status);
    console.log("Created PO Number:", createRes.body.data?.po_no);
    console.log("Created PO Grand Total:", createRes.body.data?.grand_total);
    console.log("Items count:", createRes.body.data?.items?.length);

    if (createRes.status !== 201 || !createRes.body.data?.id) {
      throw new Error("Failed to create purchase order");
    }
    testPoId = createRes.body.data.id;

    // 5. GET /api/purchase/:id
    console.log(`\n5. Testing GET /api/purchase/${testPoId}...`);
    const getRes = await request(app).get(`/api/purchase/${testPoId}`);
    console.log("Fetched PO Company:", getRes.body.data?.vendor_company);
    console.log("Fetched PO items:", getRes.body.data?.items?.length);
    if (getRes.status !== 200 || getRes.body.data?.items?.length !== 2) {
      throw new Error("Failed to fetch created PO with items");
    }

    // 6. PUT /api/purchase/:id (Update)
    console.log(`\n6. Testing PUT /api/purchase/${testPoId}...`);
    const updateRes = await request(app)
      .put(`/api/purchase/${testPoId}`)
      .send({
        vendorCompany: "Apex Plywood & Timber Works Pvt Ltd",
        vendorName: "Sunil Joshi",
        vendorPhone: "9876543211",
        vendorEmail: "sunil@apexply.com",
        vendorGstin: "27AABCA1234A1Z1",
        status: "Approved",
        transportCharges: 1200,
        items: [
          {
            description: "18mm BWP Marine Plywood (Updated)",
            category: "Plywood",
            hsnCode: "4412",
            quantity: 60,
            unit: "Sheets",
            rate: 2850,
            discountPct: 5,
            gstRate: 18
          }
        ]
      });
    console.log("Updated PO Status:", updateRes.status);
    console.log("Updated Company:", updateRes.body.data?.vendor_company);
    console.log("Updated Items:", updateRes.body.data?.items?.length);
    if (updateRes.status !== 200 || updateRes.body.data?.vendor_company !== "Apex Plywood & Timber Works Pvt Ltd") {
      throw new Error("Failed to update purchase order");
    }

    // 7. PATCH /api/purchase/:id/status
    console.log(`\n7. Testing PATCH /api/purchase/${testPoId}/status...`);
    const patchRes = await request(app)
      .patch(`/api/purchase/${testPoId}/status`)
      .send({ status: "Ordered" });
    console.log("Patched status:", patchRes.body.data?.status);
    if (patchRes.status !== 200 || patchRes.body.data?.status !== "Ordered") {
      throw new Error("Failed to patch status");
    }

    // 8. Search query test
    console.log("\n8. Testing GET /api/purchase?search=Apex...");
    const searchRes = await request(app).get("/api/purchase?search=Apex");
    console.log("Search matches found:", searchRes.body.data?.length);
    if (searchRes.status !== 200 || searchRes.body.data?.length === 0) {
      throw new Error("Search filter failed");
    }

    // 9. DELETE /api/purchase/:id
    console.log(`\n9. Testing DELETE /api/purchase/${testPoId}...`);
    const deleteRes = await request(app).delete(`/api/purchase/${testPoId}`);
    console.log("Delete status:", deleteRes.status);
    if (deleteRes.status !== 200 || !deleteRes.body.success) {
      throw new Error("Failed to delete purchase order");
    }

    console.log("\n===========================================");
    console.log("ALL PURCHASE API TESTS PASSED SUCCESSFULLY!");
    console.log("===========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    if (testPoId) {
      await request(app).delete(`/api/purchase/${testPoId}`).catch(() => {});
    }
    process.exit(1);
  }
}

runPurchaseTests();
