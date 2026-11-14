
require("dotenv").config();

const pool = require("./config/db");

async function checkDatabase() {
  try {
    // Check which database is currently connected
    const database = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        current_user AS database_user;
    `);

    console.log("\n--- DATABASE INFORMATION ---");
    console.table(database.rows);

    // List all existing tables in the public schema
    const tables = await pool.query(`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("\n--- EXISTING DATABASE TABLES ---");

    if (tables.rows.length === 0) {
      console.log("No tables found in the public schema.");
    } else {
      console.table(tables.rows);
    }

    // List columns for all existing tables
    const columns = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    console.log("\n--- EXISTING TABLE COLUMNS ---");
    console.table(columns.rows);

  } catch (error) {
    console.error("Database inspection failed:", error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
