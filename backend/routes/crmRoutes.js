const express = require("express");
const router = express.Router();

const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
} = require("../controllers/crmController");

// Health check
router.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CRM API routes are reachable and healthy",
  });
});

// Bulk sync endpoint (supports both /crm/leads/sync and /crm/sync)
router.post("/leads/sync", syncLeads);
router.post("/sync", syncLeads);

// CRUD routes for leads (supports /crm/leads, /crm/leads/:id, /crm, and /crm/:id)
router.get("/leads", getLeads);
router.get("/leads/:id", getLeadById);
router.post("/leads", createLead);
router.put("/leads/:id", updateLead);
router.delete("/leads/:id", deleteLead);

// Root CRM aliases
router.get("/", getLeads);
router.get("/:id", getLeadById);
router.post("/", createLead);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

module.exports = router;
