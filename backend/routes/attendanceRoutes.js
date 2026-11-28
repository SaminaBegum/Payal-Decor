const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getMyAttendanceStatus,
  employeeCheckIn,
  employeeCheckOut,
  getAttendanceHistory,
  submitDailyProgress,
  getDailyProgressHistory,
} = require("../controllers/attendanceController");

// All attendance endpoints require authentication.
router.use(authMiddleware);

// Employee-only self-service endpoints.
router.use(roleMiddleware("Employee"));

router.get("/today", getMyAttendanceStatus);
router.post("/check-in", employeeCheckIn);
router.post("/check-out", employeeCheckOut);
router.get("/history", getAttendanceHistory);
router.post("/progress", submitDailyProgress);
router.get("/progress", getDailyProgressHistory);

module.exports = router;
