const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", () => {
  console.log("PostgreSQL connection established");
});

pool.on("error", (error) => {
  console.error("PostgreSQL error:", error);
});

module.exports = pool;