
const express = require("express");
const router = express.Router();

const {
  login,
  changePassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Authentication router health check
router.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication router is working",
  });
});

// Login route
router.post("/login", login);

// Test route to confirm /me registration
router.get("/me-test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "The /me route is reachable",
  });
});

// Change password (authenticated users)
router.post("/change-password", authMiddleware, changePassword);

// Protected user profile route
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication verified successfully",
    user: req.user,
  });
});

module.exports = router;
