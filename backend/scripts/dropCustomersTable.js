require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function dropCustomers() {
  try {
    console.log("Dropping table public.customers with CASCADE...");
    await pool.query("DROP TABLE IF EXISTS public.customers CASCADE;");
    console.log("Table public.customers dropped successfully!");

    // Verify it no longer exists
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'customers'
    `);

    if (res.rows.length === 0) {
      console.log("Verified: public.customers no longer exists in database.");
    } else {
      console.warn("Warning: public.customers still exists.");
    }
  } catch (err) {
    console.error("Error dropping customers table:", err.message);
  } finally {
    await pool.end();
  }
}

dropCustomers();
