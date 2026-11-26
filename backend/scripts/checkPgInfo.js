require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function checkPgVersionAndPort() {
  const res = await pool.query("SELECT version(), inet_server_port(), current_database(), current_user");
  console.log("PostgreSQL info connected by backend:");
  console.table(res.rows);
  await pool.end();
}

checkPgVersionAndPort();
