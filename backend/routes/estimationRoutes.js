const express = require("express");
const router = express.Router();

const {
  getEstimations,
  getEstimationById,
  createEstimation,
  updateEstimation,
  deleteEstimation,
  getMaterials,
  calculateBOQ,
  convertToQuotation,
} = require("../controllers/estimationController");

// 1. Materials Master Catalog
router.get("/materials", getMaterials);

// 2. Real-time BOQ & Metric Calculation (pre-save preview)
router.post("/calculate-boq", calculateBOQ);

// 3. Conversion Bridge
router.post("/:id/convert-to-quotation", convertToQuotation);

// 4. Estimation CRUD Routes
router.get("/", getEstimations);
router.get("/:id", getEstimationById);
router.post("/", createEstimation);
router.put("/:id", updateEstimation);
router.delete("/:id", deleteEstimation);

module.exports = router;
