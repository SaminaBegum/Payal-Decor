require("dotenv").config();
const request = require("supertest");
const app = require("../app");

async function runVendorTests() {
  console.log("--- Starting Vendor API Automated Tests ---");
  let testVendorId = null;

  try {
    // 1. GET /api/vendors
    console.log("1. Testing GET /api/vendors...");
    const listRes = await request(app).get("/api/vendors");
    console.log("Status:", listRes.status);
    console.log("Success:", listRes.body.success, "Total:", listRes.body.total);
    if (listRes.status !== 200 || !listRes.body.success) {
      throw new Error("Failed to get vendors");
    }

    // 2. GET /api/vendors/stats
    console.log("\n2. Testing GET /api/vendors/stats...");
    const statsRes = await request(app).get("/api/vendors/stats");
    console.log("Stats:", statsRes.body.data);
    if (statsRes.status !== 200 || !statsRes.body.success) {
      throw new Error("Failed to get vendor stats");
    }

    // 3. GET /api/vendors/categories
    console.log("\n3. Testing GET /api/vendors/categories...");
    const catRes = await request(app).get("/api/vendors/categories");
    console.log("Categories:", catRes.body.data);
    if (catRes.status !== 200 || !Array.isArray(catRes.body.data)) {
      throw new Error("Failed to get categories");
    }

    // 4. POST /api/vendors (Create Vendor)
    console.log("\n4. Testing POST /api/vendors (Create)...");
    const createRes = await request(app)
      .post("/api/vendors")
      .send({
        name: "Test Vendor Ramesh",
        company: "Ramesh Plywood & Hardware",
        phone: "9876543210",
        email: "ramesh@plywood.com",
        category: "Plywood",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411038",
        status: "Active",
        gstin: "27AAAAA0000A1Z5",
        address: "Shop 12, Timber Market, Pune",
        contactPerson: "Ramesh Sharma",
        notes: "Preferred supplier for commercial marine ply"
      });
    console.log("Created vendor status:", createRes.status);
    console.log("Created vendor data:", createRes.body.data);
    if (createRes.status !== 201 || !createRes.body.data || !createRes.body.data.id) {
      throw new Error("Failed to create vendor");
    }
    testVendorId = createRes.body.data.id;

    // 5. GET /api/vendors/:id
    console.log(`\n5. Testing GET /api/vendors/${testVendorId}...`);
    const getRes = await request(app).get(`/api/vendors/${testVendorId}`);
    console.log("Fetched vendor name:", getRes.body.data.name);
    if (getRes.status !== 200 || getRes.body.data.name !== "Test Vendor Ramesh") {
      throw new Error("Failed to fetch created vendor by ID");
    }

    // 6. PUT /api/vendors/:id
    console.log(`\n6. Testing PUT /api/vendors/${testVendorId}...`);
    const updateRes = await request(app)
      .put(`/api/vendors/${testVendorId}`)
      .send({
        name: "Test Vendor Ramesh Updated",
        company: "Ramesh Plywood & Hardware Pvt Ltd",
        phone: "9876543210",
        email: "ramesh.updated@plywood.com",
        category: "Plywood",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411038",
        status: "Active",
        gstin: "27AAAAA0000A1Z5",
        address: "Shop 12, Timber Market, Pune",
        contactPerson: "Ramesh Sharma",
        notes: "Updated delivery terms 7 days"
      });
    console.log("Updated vendor company:", updateRes.body.data.company);
    if (updateRes.status !== 200 || updateRes.body.data.company !== "Ramesh Plywood & Hardware Pvt Ltd") {
      throw new Error("Failed to update vendor");
    }

    // 7. Search & Filter
    console.log("\n7. Testing GET /api/vendors with query search=Ramesh...");
    const searchRes = await request(app).get("/api/vendors?search=Ramesh");
    console.log("Search result count:", searchRes.body.data.length);
    if (searchRes.status !== 200 || searchRes.body.data.length === 0) {
      throw new Error("Search filter failed");
    }

    // 8. Bulk Import
    console.log("\n8. Testing POST /api/vendors/bulk-import...");
    const bulkRes = await request(app)
      .post("/api/vendors/bulk-import")
      .send({
        vendors: [
          {
            name: "Bulk Supplier 1",
            company: "Supreme Laminates",
            phone: "9988776655",
            email: "contact@supreme.com",
            category: "Laminates",
            city: "Mumbai",
            status: "Active"
          },
          {
            name: "Bulk Supplier 2",
            company: "Global Edge Bands",
            phone: "9988776644",
            email: "info@globaledge.com",
            category: "Edge Band",
            city: "Thane",
            status: "Active"
          }
        ]
      });
    console.log("Bulk import result:", bulkRes.body.data);
    if (bulkRes.status !== 200 || bulkRes.body.data.insertedCount !== 2) {
      throw new Error("Bulk import failed");
    }

    // Clean up bulk items
    const bulkIds = bulkRes.body.data.vendors.map(v => v.id);
    for (const bId of bulkIds) {
      await request(app).delete(`/api/vendors/${bId}`);
    }
    console.log("Cleaned up bulk import test items.");

    // 9. DELETE /api/vendors/:id
    console.log(`\n9. Testing DELETE /api/vendors/${testVendorId}...`);
    const deleteRes = await request(app).delete(`/api/vendors/${testVendorId}`);
    console.log("Delete status:", deleteRes.status);
    if (deleteRes.status !== 200 || !deleteRes.body.success) {
      throw new Error("Failed to delete vendor");
    }

    console.log("\n=========================================");
    console.log("ALL VENDOR API TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    if (testVendorId) {
      await request(app).delete(`/api/vendors/${testVendorId}`).catch(() => {});
    }
    process.exit(1);
  }
}

runVendorTests();
