require("dotenv").config();
const pool = require("../config/db");

async function check() {
  try {
    const rows = await pool.query(`SELECT * FROM public."Vendor" LIMIT 10;`);
    console.log("Existing vendor rows count:", rows.rows.length);
    console.log("Sample rows:", rows.rows);

    // Also check Prisma schema if any
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

check();
