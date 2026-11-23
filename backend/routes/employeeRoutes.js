const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getEmployees,
  getMyEmployeeProfile,
  createEmployee,
  editEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

// All employee routes require authentication.
router.use(authMiddleware);

// Employees can access only their own linked profile.
router.get("/me", getMyEmployeeProfile);

// All remaining employee management endpoints require Admin.
router.use(roleMiddleware("Admin"));

// GET /api/employees
router.get("/", getEmployees);

// POST /api/employees
router.post("/", createEmployee);

// PUT /api/employees/:id
router.put("/:id", editEmployee);

// DELETE /api/employees/:id
router.delete("/:id", deleteEmployee);

module.exports = router;
