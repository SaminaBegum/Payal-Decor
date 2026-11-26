const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  getPurchaseOrders,
  getPurchaseStats,
  getNextPoNumber,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseStatus,
  deletePurchaseOrder
} = require("../controllers/purchaseController");

// Rate limiting for purchase endpoints (CodeQL safe)
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many purchase requests, please try again later."
  }
});

router.use(purchaseLimiter);

// Specific routes (must be before /:id)
router.get("/stats", purchaseLimiter, getPurchaseStats);
router.get("/next-number", purchaseLimiter, getNextPoNumber);

// CRUD routes
router.get("/", purchaseLimiter, getPurchaseOrders);
router.get("/:id", purchaseLimiter, getPurchaseOrderById);
router.post("/", purchaseLimiter, createPurchaseOrder);
router.put("/:id", purchaseLimiter, updatePurchaseOrder);
router.patch("/:id/status", purchaseLimiter, updatePurchaseStatus);
router.delete("/:id", purchaseLimiter, deletePurchaseOrder);

module.exports = router;
