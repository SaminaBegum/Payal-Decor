require("dotenv").config();
const request = require("supertest");
const app = require("../app");

async function runProductsApiTests() {
  console.log("--- Starting Product Master API Automated Tests ---");
  let testProductId = null;

  try {
    // 1. GET /api/products
    console.log("1. Testing GET /api/products...");
    const listRes = await request(app).get("/api/products");
    console.log("Products Status:", listRes.status);
    console.log("Initial Products Count:", listRes.body.data?.length);
    if (listRes.status !== 200 || !Array.isArray(listRes.body.data)) {
      throw new Error("Failed to fetch products list");
    }

    // 2. GET /api/products/stats
    console.log("\n2. Testing GET /api/products/stats...");
    const statsRes = await request(app).get("/api/products/stats");
    console.log("Stats Status:", statsRes.status);
    console.log("Total Products:", statsRes.body.data?.total);
    console.log("Active Products:", statsRes.body.data?.active);
    console.log("Categories Count:", statsRes.body.data?.categoriesCount);
    if (statsRes.status !== 200 || statsRes.body.data?.total === undefined) {
      throw new Error("Failed to fetch product stats");
    }

    // 3. GET /api/products/next-sku
    console.log("\n3. Testing GET /api/products/next-sku?category=Kitchen...");
    const skuRes = await request(app).get("/api/products/next-sku?category=Kitchen");
    console.log("Next SKU Status:", skuRes.status);
    console.log("Generated SKU:", skuRes.body.data?.sku);
    if (skuRes.status !== 200 || !skuRes.body.data?.sku) {
      throw new Error("Failed to generate next SKU");
    }

    // 4. POST /api/products (Create Product)
    console.log("\n4. Testing POST /api/products (Create)...");
    const testSku = `PD-TEST-${Date.now().toString().slice(-4)}`;
    const createRes = await request(app)
      .post("/api/products")
      .send({
        name: "Test Automated Coffee Table",
        code: testSku,
        sku: testSku,
        category: "Living & TV Units",
        description: "Solid oak wood coffee table with tinted glass top and metal legs.",
        unit: "NOS",
        price: 18500,
        costPrice: 11000,
        hsnCode: "9403",
        gstRate: 18,
        dimensions: "4ft x 2ft x 1.5ft",
        status: "Active"
      });
    console.log("Create Status:", createRes.status);
    console.log("Created Product ID:", createRes.body.data?.id);
    if (createRes.status !== 201 || !createRes.body.data?.id) {
      throw new Error("Failed to create product");
    }
    testProductId = createRes.body.data.id;

    // 5. GET /api/products/:id
    console.log(`\n5. Testing GET /api/products/${testProductId}...`);
    const getRes = await request(app).get(`/api/products/${testProductId}`);
    console.log("Get Status:", getRes.status);
    console.log("Product Name:", getRes.body.data?.name);
    console.log("Product Price:", getRes.body.data?.price);
    if (getRes.status !== 200 || getRes.body.data?.name !== "Test Automated Coffee Table") {
      throw new Error("Failed to retrieve created product");
    }

    // 6. PUT /api/products/:id (Update)
    console.log(`\n6. Testing PUT /api/products/${testProductId}...`);
    const updateRes = await request(app)
      .put(`/api/products/${testProductId}`)
      .send({
        name: "Test Automated Coffee Table (Updated Luxury Edition)",
        price: 21500,
        status: "Active"
      });
    console.log("Update Status:", updateRes.status);
    console.log("Updated Name:", updateRes.body.data?.name);
    console.log("Updated Price:", updateRes.body.data?.price);
    if (updateRes.status !== 200 || updateRes.body.data?.price !== 21500) {
      throw new Error("Failed to update product");
    }

    // 7. Search filter test
    console.log("\n7. Testing GET /api/products?search=Coffee...");
    const searchRes = await request(app).get("/api/products?search=Coffee");
    console.log("Search Status:", searchRes.status);
    console.log("Search matches found:", searchRes.body.data?.length);
    if (searchRes.status !== 200 || searchRes.body.data?.length === 0) {
      throw new Error("Failed product search filter");
    }

    // 8. DELETE /api/products/:id
    console.log(`\n8. Testing DELETE /api/products/${testProductId}...`);
    const deleteRes = await request(app).delete(`/api/products/${testProductId}`);
    console.log("Delete Status:", deleteRes.status);
    if (deleteRes.status !== 200 || !deleteRes.body.success) {
      throw new Error("Failed to delete test product");
    }
    testProductId = null;

    console.log("\n===========================================");
    console.log("ALL PRODUCT MASTER API TESTS PASSED 100%!");
    console.log("===========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    if (testProductId) {
      await request(app).delete(`/api/products/${testProductId}`).catch(() => {});
    }
    process.exit(1);
  }
}

runProductsApiTests();
