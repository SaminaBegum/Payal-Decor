const express = require("express");
const cors = require("cors");
const corsOptions = require("./config/cors");

const app = express();

// Import routes
const authRoutes = require("./routes/authRoutes");
const crmRoutes = require("./routes/crmRoutes");
const estimationRoutes = require("./routes/estimationRoutes");
const bomRoutes = require("./routes/bomRoutes");
const leadRoutes = require("./routes/leadRoutes");
const measurementRoutes = require("./routes/measurementRoutes");
const estimateDocRoutes = require("./routes/estimateDocRoutes");
const quotationRoutes = require("./routes/quotationRoutes");

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

// Estimation & BOQ routes
app.use("/api/estimation", estimationRoutes);
app.use("/api/estimations", estimationRoutes);

// Quotation routes
app.use("/api/quotations", quotationRoutes);
app.use("/quotations", quotationRoutes);

// BOM & Material Requirement routes
app.use("/api/bom", bomRoutes);

// Lead Enquiries routes
app.use("/api/lead-enquiries", leadRoutes);

// Site Measurements routes
app.use("/api/site-measurements", measurementRoutes);

// Estimate Documents (PDF format print builder)
app.use("/api/estimate-docs", estimateDocRoutes);
app.use("/estimate-docs", estimateDocRoutes);

module.exports = app;
