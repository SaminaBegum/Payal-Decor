require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function count() {
  const r = await pool.query("SELECT COUNT(*) FROM crm");
  console.log("COUNT IN DB NOW:", r.rows[0].count);
  const latest = await pool.query(`SELECT id, "businessName", "createdAt" FROM crm ORDER BY "createdAt" DESC LIMIT 3`);
  console.table(latest.rows);
  await pool.end();
}

count();
