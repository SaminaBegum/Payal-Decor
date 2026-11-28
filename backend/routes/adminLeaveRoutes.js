
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getLeaveTypes,
  getAllLeaves,
  reviewLeave,
} = require("../controllers/leaveController");

router.use(authMiddleware);
router.use(roleMiddleware("Admin"));

// Admin views available leave types
router.get("/types", getLeaveTypes);

// Admin views all employee leave applications
router.get("/", getAllLeaves);

// Admin approves or rejects a leave application
router.patch("/:id/review", reviewLeave);

module.exports = router;
