const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  getProducts,
  getProductStats,
  getNextSku,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

// Rate limiting for product master endpoints (CodeQL safe)
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many product requests, please try again later."
  }
});

router.use(productLimiter);

// Specific utility routes (must precede /:id)
router.get("/stats", getProductStats);
router.get("/next-sku", getNextSku);

// Standard CRUD endpoints
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
