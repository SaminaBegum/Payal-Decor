
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getLeaveTypes,
  applyForLeave,
  getMyLeaves,
  cancelMyLeave,
} = require("../controllers/leaveController");

router.use(authMiddleware);
router.use(roleMiddleware("Employee"));

// Available leave categories
router.get("/types", getLeaveTypes);

// Employee applies for leave
router.post("/", applyForLeave);

// Employee views own leave history
router.get("/my", getMyLeaves);

// Employee cancels a pending leave
router.patch("/:id/cancel", cancelMyLeave);

module.exports = router;
