
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

// Protected route
// Protected route - return authenticated user and employee profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    let employeeProfile = null;

    if (req.user.role === "Employee") {
      const {
        findActiveEmployeeByUserId,
      } = require("../models/attendanceModel");

      employeeProfile = await findActiveEmployeeByUserId(req.user.id);
    }

    return res.status(200).json({
      success: true,
      message: "Authentication verified successfully",
      user: {
        ...req.user,
        employeeProfile: employeeProfile
          ? {
              employeeId: employeeProfile.id,
              fullName: employeeProfile.full_name,
              email: employeeProfile.email,
              phone: employeeProfile.phone,
              designation: employeeProfile.designation,
              department: employeeProfile.department,
              status: employeeProfile.status,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get authenticated user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load employee profile",
    });
  }
});

// Protected password-change route
router.post("/change-password", authMiddleware, changePassword);

module.exports = router;
