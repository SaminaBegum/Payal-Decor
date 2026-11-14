require("dotenv").config();

const pool = require("./config/db");

async function testDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS username,
        version() AS version
    `);

    console.log("Database connected successfully!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await pool.end();
  }
}

testDatabase();