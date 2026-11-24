const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");

// Rate limiting for site measurement routes
const measurementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests to site measurements, please try again later.",
  },
});

router.use(measurementLimiter);

// GET /api/site-measurements
router.get("/", measurementLimiter, async (req, res) => {
  try {
    // Check if table SiteMeasurement exists
    const tableCheck = await pool.query(`
      SELECT to_regclass('public."SiteMeasurement"') AS tbl;
    `);

    if (tableCheck.rows[0].tbl) {
      const result = await pool.query(`
        SELECT
          id,
          "visitId",
          "customerName",
          "leadId",
          "projectName",
          "siteAddress",
          "visitDate",
          "assignedTo",
          "roomType",
          "furnitureType",
          "lengthMm",
          "widthMm",
          "heightMm",
          unit,
          status,
          "leadEnquiryId",
          "createdAt"
        FROM public."SiteMeasurement"
        ORDER BY "createdAt" DESC;
      `);

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        measurements: result.rows,
        data: result.rows,
      });
    }

    // Default sample measurements if table not found
    const sampleVisits = [
      {
        id: "SM-101",
        visitId: "SM-VISIT-01",
        customerName: "Vijay Patil",
        projectName: "Wipro Workstation Floor",
        siteAddress: "Hinjewadi Phase 2, Pune",
        visitDate: new Date().toISOString().slice(0, 10),
        roomType: "Open Office Workstation Hall",
        furnitureType: "Linear Workstations",
        lengthMm: 2400,
        widthMm: 1200,
        heightMm: 750,
        unit: "mm",
        status: "Completed",
      },
      {
        id: "SM-102",
        visitId: "SM-VISIT-02",
        customerName: "Pallavi Patil",
        projectName: "Executive Cabin Setup",
        siteAddress: "Magarpatta City, Tower 4, Pune",
        visitDate: new Date().toISOString().slice(0, 10),
        roomType: "Director Cabin",
        furnitureType: "Executive Desk & Credenza",
        lengthMm: 1800,
        widthMm: 900,
        heightMm: 750,
        unit: "mm",
        status: "Completed",
      },
    ];

    return res.status(200).json({
      success: true,
      count: sampleVisits.length,
      measurements: sampleVisits,
      data: sampleVisits,
    });
  } catch (error) {
    console.error("Error in measurementRoutes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch site measurements",
      error: error.message,
    });
  }
});

module.exports = router;
