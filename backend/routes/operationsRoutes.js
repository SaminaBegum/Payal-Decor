// const express = require("express");
// const router = express.Router();

// router.get("/", (req, res) => {
//   return res.status(200).json({ success: true, message: "Operations route active", data: [] });
// });

// module.exports = router;

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getOperationsTasks,
  createOperationsTask,
  updateOperationsTask,
  updateOperationsTaskStatus,
  deleteOperationsTask,
} = require("../controllers/operationsController");

// All Operations endpoints require a valid login.
router.use(authMiddleware);

// Admin can view all tasks.
// Employee can view only their assigned tasks.
router.get("/", getOperationsTasks);

// Admin only: create and assign tasks.
router.post("/", createOperationsTask);

// Admin only: edit task details.
router.put("/:id", updateOperationsTask);

// Admin can update any task status.
// Employee can update only their assigned task status.
router.patch("/:id/status", updateOperationsTaskStatus);

// Admin only: delete tasks.
router.delete("/:id", deleteOperationsTask);

module.exports = router;
