
const express = require("express");
const cors = require("cors");

const app = express();

// Import authentication routes
const authRoutes = require("./routes/authRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payal Decor API is running",
  });
});

// Authentication routes
app.use("/api/auth", (req, res, next) => {
  console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
  next();
}, authRoutes);
app.use("/api/operations", operationsRoutes);
app.use("/api/employees", employeeRoutes);

module.exports = app;
