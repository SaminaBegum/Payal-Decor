require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Payal Decor API running on port ${PORT}`);
  });

  server.on("error", (error) => {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  });
};

startServer();
