const express = require("express");
const rateLimit = require("express-rate-limit");
const reportsController = require("../controllers/reportsController");

const router = express.Router();

// Rate limiter for reports endpoints
const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many report requests, please try again later."
  }
});

router.use(reportsLimiter);

// Get available report modules metadata
router.get("/modules", reportsController.getReportModules);

// Get report data (with query params: module, timeRange, startDate, endDate)
router.get("/", reportsController.getReport);

module.exports = router;
