const express = require("express");
const router = express.Router();

const {
  getEstimateDocs,
  getEstimateDocById,
  createEstimateDoc,
  updateEstimateDoc,
  deleteEstimateDoc,
} = require("../controllers/estimateDocController");

router.get("/", getEstimateDocs);
router.get("/:id", getEstimateDocById);
router.post("/", createEstimateDoc);
router.put("/:id", updateEstimateDoc);
router.delete("/:id", deleteEstimateDoc);

module.exports = router;
