const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/lead-enquiries - Fetch all lead enquiries
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        "customerName",
        "companyName",
        phone,
        email,
        source,
        requirement,
        budget,
        "followUpDate",
        priority,
        status,
        "createdAt",
        "updatedAt",
        "customerId"
      FROM public."LeadEnquiry"
      ORDER BY id DESC;
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      leads: result.rows,
    });
  } catch (error) {
    console.error("Error in leadRoutes GET /:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead enquiries",
      error: error.message,
    });
  }
});

// GET /api/lead-enquiries/:id - Fetch single lead
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM public."LeadEnquiry" WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      lead: result.rows[0],
    });
  } catch (error) {
    console.error("Error in leadRoutes GET /:id:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead enquiry",
      error: error.message,
    });
  }
});

// POST /api/lead-enquiries - Create a new lead enquiry
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      companyName = "",
      phone = "",
      email = "",
      source = "Direct",
      requirement = "",
      budget = "",
      followUpDate = null,
      priority = "Medium",
      status = "New",
      customerId = null,
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO public."LeadEnquiry" (
        "customerName",
        "companyName",
        phone,
        email,
        source,
        requirement,
        budget,
        "followUpDate",
        priority,
        status,
        "customerId",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
      `,
      [
        customerName.trim(),
        companyName.trim(),
        phone.trim(),
        email.trim(),
        source.trim() || "Direct",
        requirement.trim(),
        budget.trim(),
        followUpDate || null,
        priority || "Medium",
        status || "New",
        customerId || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Lead enquiry created successfully",
      data: result.rows[0],
      lead: result.rows[0],
    });
  } catch (error) {
    console.error("Error in leadRoutes POST /:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create lead enquiry",
      error: error.message,
    });
  }
});

// PUT /api/lead-enquiries/:id - Update lead enquiry
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      companyName = "",
      phone = "",
      email = "",
      source = "Direct",
      requirement = "",
      budget = "",
      followUpDate = null,
      priority = "Medium",
      status = "New",
      customerId = null,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE public."LeadEnquiry"
      SET
        "customerName" = COALESCE($1, "customerName"),
        "companyName" = COALESCE($2, "companyName"),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        source = COALESCE($5, source),
        requirement = COALESCE($6, requirement),
        budget = COALESCE($7, budget),
        "followUpDate" = $8,
        priority = COALESCE($9, priority),
        status = COALESCE($10, status),
        "customerId" = $11,
        "updatedAt" = NOW()
      WHERE id = $12
      RETURNING *;
      `,
      [
        customerName ? customerName.trim() : null,
        companyName ? companyName.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        source ? source.trim() : null,
        requirement ? requirement.trim() : null,
        budget ? budget.trim() : null,
        followUpDate || null,
        priority,
        status,
        customerId || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead enquiry not found to update",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead enquiry updated successfully",
      data: result.rows[0],
      lead: result.rows[0],
    });
  } catch (error) {
    console.error("Error in leadRoutes PUT /:id:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lead enquiry",
      error: error.message,
    });
  }
});

// DELETE /api/lead-enquiries/:id - Delete lead enquiry
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM public."LeadEnquiry" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead enquiry not found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead enquiry deleted successfully",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error in leadRoutes DELETE /:id:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete lead enquiry",
      error: error.message,
    });
  }
});

module.exports = router;
