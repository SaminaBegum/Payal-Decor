const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const corsOptions = require("./config/cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const crmRoutes = require("./routes/crmRoutes");
const estimationRoutes = require("./routes/estimationRoutes");
const bomRoutes = require("./routes/bomRoutes");
const productionRoutes = require("./routes/productionRoutes");
const leadRoutes = require("./routes/leadRoutes");
const measurementRoutes = require("./routes/measurementRoutes");
const estimateDocRoutes = require("./routes/estimateDocRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const workOrderRoutes = require("./routes/workOrderRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const installationRoutes = require("./routes/installationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting for authentication routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 15 minutes.",
  },
});

// Import authentication routes
const operationsRoutes = require("./routes/operationsRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
// General rate limiter for all API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use("/api", apiLimiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payal Decor API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes with rate limiter
app.use(
  "/api/auth",
  authLimiter,
  (req, res, next) => {
    if (process.env.NODE_ENV !== "test") {
      console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
    }
    next();
  },
  authRoutes
);

app.use("/api/operations", operationsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);

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

// Production routes
app.use("/api/production", productionRoutes);

// Lead Enquiries routes
app.use("/api/lead-enquiries", leadRoutes);

// Site Measurements routes
app.use("/api/site-measurements", measurementRoutes);

// Estimate Documents (PDF format print builder)
app.use("/api/estimate-docs", estimateDocRoutes);
app.use("/estimate-docs", estimateDocRoutes);

// Vendor routes
app.use("/api/vendors", vendorRoutes);
app.use("/vendors", vendorRoutes);

// Work Order routes
app.use("/api/work-orders", workOrderRoutes);

// Installation routes
app.use("/api/installations", installationRoutes);

// Project routes
app.use("/api/projects", projectRoutes);
// Dispatch & Delivery routes
app.use("/api/dispatches", dispatchRoutes);

// Purchase Order routes
app.use("/api/purchase", purchaseRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/api/purchase-orders", purchaseRoutes);

// Business Intelligence & Reports routes
app.use("/api/reports", reportsRoutes);
app.use("/reports", reportsRoutes);

// Master Products routes
app.use("/api/products", productRoutes);
app.use("/products", productRoutes);

module.exports = app;
