require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const pool = require("../config/db");

async function deleteNewCrmRecords() {
  const client = await pool.connect();
  try {
    console.log("Starting deletion of newly added CRM records...");
    await client.query("BEGIN");

    // Count before deletion
    const totalBefore = await client.query('SELECT count(*)::int AS count FROM public.crm;');
    console.log(`Total CRM records before: ${totalBefore.rows[0].count}`);

    // Delete all records except the authentic 84 (crm-001..crm-065 and meta-001..meta-019)
    const deleteRes = await client.query(`
      DELETE FROM public.crm 
      WHERE id NOT LIKE 'meta-%' AND id NOT LIKE 'crm-0%'
      RETURNING id;
    `);
    console.log(`Deleted ${deleteRes.rowCount} newly added records.`);

    // Verify remaining count
    const remainingRes = await client.query('SELECT count(*)::int AS count FROM public.crm;');
    const remainingCount = remainingRes.rows[0].count;
    console.log(`Remaining CRM records: ${remainingCount}`);

    if (remainingCount !== 84) {
      throw new Error(`Expected exactly 84 records, but found ${remainingCount}. Aborting transaction.`);
    }

    // Verify ID ranges of the 84 remaining
    const metaCheck = await client.query(`SELECT count(*)::int AS count FROM public.crm WHERE id LIKE 'meta-%';`);
    const crmCheck = await client.query(`SELECT count(*)::int AS count FROM public.crm WHERE id LIKE 'crm-0%';`);
    console.log(`Verified remaining records breakdown: meta-* = ${metaCheck.rows[0].count}, crm-0* = ${crmCheck.rows[0].count}`);

    await client.query("COMMIT");
    console.log("SUCCESS: Transaction committed successfully. Database now has exactly 84 CRM leads.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR: Failed to clean CRM records, rolled back transaction:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteNewCrmRecords();
