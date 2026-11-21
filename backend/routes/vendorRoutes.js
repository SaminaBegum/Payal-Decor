const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  getVendors,
  getVendorStats,
  getCategories,
  addCategory,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  bulkImportVendors
} = require("../controllers/vendorController");

// Rate limiting for vendor endpoints to prevent unthrottled access (CodeQL safe)
const vendorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many vendor requests, please try again later."
  }
});

router.use(vendorLimiter);

// Specific routes (must be before /:id)
router.get("/stats", vendorLimiter, getVendorStats);
router.get("/categories", vendorLimiter, getCategories);
router.post("/categories", vendorLimiter, addCategory);
router.post("/bulk-import", vendorLimiter, bulkImportVendors);

// CRUD routes
router.get("/", vendorLimiter, getVendors);
router.get("/:id", vendorLimiter, getVendorById);
router.post("/", vendorLimiter, createVendor);
router.put("/:id", vendorLimiter, updateVendor);
router.delete("/:id", vendorLimiter, deleteVendor);

module.exports = router;
