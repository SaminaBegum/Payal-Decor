const express = require("express");
const router = express.Router();

const {
  getQuotations,
  getNextNumber,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertFromEstimate,
} = require("../controllers/quotationController");

// Next number generator (must be before :id route)
router.get("/next-number", getNextNumber);

// Convert from estimate
router.post("/from-estimate/:estimateId", convertFromEstimate);

// Main CRUD routes
router.get("/", getQuotations);
router.get("/:id", getQuotationById);
router.post("/", createQuotation);
router.put("/:id", updateQuotation);
router.delete("/:id", deleteQuotation);

module.exports = router;
