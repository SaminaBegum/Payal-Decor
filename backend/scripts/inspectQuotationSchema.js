require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function checkQuotationsSchema() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%quot%'
      ORDER BY table_name
    `);
    console.log("Quotation tables found:", tables.rows.map(r => r.table_name));

    for (const row of tables.rows) {
      const tName = row.table_name;
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tName]);
      console.log(`\nColumns for ${tName}:`);
      console.log(cols.rows);

      try {
        const count = await pool.query(`SELECT count(*) FROM "${tName}"`);
        console.log(`Row count for ${tName}:`, count.rows[0].count);
        const sample = await pool.query(`SELECT * FROM "${tName}" LIMIT 2`);
        console.log(`Sample rows for ${tName}:`, sample.rows);
      } catch (e) {
        console.log(`Could not query rows for ${tName}:`, e.message);
      }
    }
  } catch (err) {
    console.error("Error checking quotation schema:", err.message);
  } finally {
    await pool.end();
  }
}

checkQuotationsSchema();
