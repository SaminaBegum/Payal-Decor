require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function run() {
  try {
    console.log("=== CHECKING ALL ESTIMATION RELATED TABLES ===");

    // 1. Check all tables with estimation in name
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log("All tables in public schema:");
    tablesRes.rows.forEach(r => console.log(" - " + r.table_name));

    // 2. Query public.estimations (plural)
    try {
      const pluralRes = await pool.query(`SELECT id, "estimationNumber", "customerName", "projectName", "createdAt" FROM public.estimations`);
      console.log("\n=== public.estimations (plural) Count:", pluralRes.rows.length);
      console.log(pluralRes.rows);
    } catch (e) {
      console.log("public.estimations query error:", e.message);
    }

    // 3. Query public."Estimation" (singular with quotes)
    try {
      const singularRes = await pool.query(`SELECT * FROM public."Estimation"`);
      console.log('\n=== public."Estimation" (singular capitalized) Count:', singularRes.rows.length);
      console.log(JSON.stringify(singularRes.rows, null, 2));
    } catch (e) {
      console.log('public."Estimation" query error:', e.message);
    }

    // 5. Query public.estimate_documents
    try {
      const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'estimate_documents' ORDER BY ordinal_position`);
      console.log('\n=== public.estimate_documents columns ===', cols.rows);
      const docs = await pool.query(`SELECT * FROM public.estimate_documents LIMIT 5`);
      console.log('\n=== public.estimate_documents rows ===', docs.rows);
    } catch (e) {
      console.log('public.estimate_documents query error:', e.message);
    }

  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await pool.end();
  }
}

run();
