const express = require("express");
const cors = require("cors");
const corsOptions = require("./config/cors");

const app = express();

// Import routes
const authRoutes = require("./routes/authRoutes");
const crmRoutes = require("./routes/crmRoutes");
const customerRoutes = require("./routes/customerRoutes");

// CORS configuration
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payal Decor API is running",
  });
});

// Authentication routes
app.use(
  "/api/auth",
  (req, res, next) => {
    console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
    next();
  },
  authRoutes
);

// CRM routes
app.use("/api/crm", crmRoutes);

// Customer routes (for ERP cross-module linkage)
app.use("/api/customers", customerRoutes);

module.exports = app;
