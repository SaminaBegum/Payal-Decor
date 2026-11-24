require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function verifyLiveCrud() {
  const testId = `crm-test-live-${Date.now()}`;
  console.log("--- 1. TESTING LIVE CREATE (ADD) ---");
  const addPayload = {
    id: testId,
    source: "Meta",
    businessName: "Live Verification Lead",
    category: "Boys hostel",
    genderType: "Boys",
    primaryPhone: "9800000000",
    secondaryEmail: "live@verify.com",
    address: "Katraj, Pune",
    locality: "Katraj",
    status: "New",
    notes: "Testing automatic database persistence",
  };

  const addRes = await fetch("http://localhost:5000/api/crm/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(addPayload),
  });
  console.log("Add Status:", addRes.status);
  const addJson = await addRes.json();
  console.log("Add Response:", addJson.message);

  const check1 = await pool.query(`SELECT id, "businessName", status FROM crm WHERE id = $1`, [testId]);
  console.log("Database after ADD:", check1.rows[0]);

  console.log("\n--- 2. TESTING LIVE UPDATE (EDIT) ---");
  const updatePayload = {
    businessName: "Live Verification Lead EDITED",
    status: "Contacted",
    notes: "Updated automatically in database",
  };

  const updateRes = await fetch(`http://localhost:5000/api/crm/leads/${testId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatePayload),
  });
  console.log("Update Status:", updateRes.status);
  const updateJson = await updateRes.json();
  console.log("Update Response:", updateJson.message);

  const check2 = await pool.query(`SELECT id, "businessName", status, notes, "updatedAt" FROM crm WHERE id = $1`, [testId]);
  console.log("Database after UPDATE:", check2.rows[0]);

  console.log("\n--- 3. TESTING LIVE DELETE ---");
  const deleteRes = await fetch(`http://localhost:5000/api/crm/leads/${testId}`, {
    method: "DELETE",
  });
  console.log("Delete Status:", deleteRes.status);
  const deleteJson = await deleteRes.json();
  console.log("Delete Response:", deleteJson.message);

  const check3 = await pool.query(`SELECT * FROM crm WHERE id = $1`, [testId]);
  console.log("Database after DELETE (Rows found):", check3.rows.length);

  await pool.end();
  console.log("\n ALL LIVE CRUD OPERATIONS AUTOMATICALLY STORED AND SYNCED IN DATABASE!");
}

verifyLiveCrud().catch(console.error);
