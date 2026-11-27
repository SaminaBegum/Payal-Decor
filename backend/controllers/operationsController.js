const pool = require("../config/db");
const operationsModel = require("../models/operationsModel");

const ALLOWED_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Blocked",
  "Pending",
  "Under Review",
];

const isAdmin = (req) =>
  String(req.user?.role || "").trim().toLowerCase() === "admin";

const isEmployee = (req) =>
  String(req.user?.role || "").trim().toLowerCase() === "employee";

// Resolve the currently logged-in employee using the database relationship.
// Never authorize access using a name supplied by the frontend.
const getLinkedActiveEmployee = async (userId) => {
  const result = await pool.query(
    `
      SELECT id, user_id, full_name, email, department, status
      FROM public.employees
      WHERE user_id = $1
        AND LOWER(TRIM(status)) = 'active'
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

// GET /api/operations
const getOperationsTasks = async (req, res) => {
  try {
    if (isAdmin(req)) {
      const tasks = await operationsModel.getAllTasks();

      return res.status(200).json({
        success: true,
        tasks,
      });
    }

    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Manager access to Operations has not been configured.",
      });
    }

    const employee = await getLinkedActiveEmployee(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "No active employee profile is linked to this login.",
      });
    }

    const allTasks = await operationsModel.getAllTasks();

    const tasks = allTasks.filter(
      (task) =>
        String(task.employee || "").trim().toLowerCase() ===
        String(employee.full_name || "").trim().toLowerCase()
    );

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get Operations tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load Operations tasks.",
    });
  }
};

// POST /api/operations — Admin only
const createOperationsTask = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create or assign Operations tasks.",
      });
    }

    const task = req.body || {};

    const requiredFields = [
      "taskId",
      "workstream",
      "taskActivity",
      "priority",
      "primaryResponsible",
      "status",
    ];

    const missingField = requiredFields.find(
      (field) =>
        task[field] === undefined ||
        task[field] === null ||
        String(task[field]).trim() === ""
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField} is required.`,
      });
    }

    if (!ALLOWED_STATUSES.includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status.",
      });
    }

    const savedTask = await operationsModel.createTask(task);

    return res.status(201).json({
      success: true,
      message: "Operations task created successfully.",
      task: savedTask,
    });
  } catch (error) {
    console.error("Create Operations task error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create Operations task.",
    });
  }
};

// PUT /api/operations/:id — Admin only
const updateOperationsTask = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can edit Operations task details.",
      });
    }

    const task = req.body || {};

    const requiredFields = [
      "taskId",
      "workstream",
      "taskActivity",
      "priority",
      "primaryResponsible",
      "status",
    ];

    const missingField = requiredFields.find(
      (field) =>
        task[field] === undefined ||
        task[field] === null ||
        String(task[field]).trim() === ""
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField} is required.`,
      });
    }

    if (!ALLOWED_STATUSES.includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status.",
      });
    }

    const savedTask = await operationsModel.updateTask(
      req.params.id,
      task
    );

    if (!savedTask) {
      return res.status(404).json({
        success: false,
        message: "Operations task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Operations task updated successfully.",
      task: savedTask,
    });
  } catch (error) {
    console.error("Update Operations task error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update Operations task.",
    });
  }
};

// PATCH /api/operations/:id/status
// Admin can update any task. Employees can update only their own task status.
const updateOperationsTaskStatus = async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status.",
      });
    }

    if (!isAdmin(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update task status.",
      });
    }

    if (!isAdmin(req)) {
      const employee = await getLinkedActiveEmployee(req.user.id);

      if (!employee) {
        return res.status(403).json({
          success: false,
          message: "No active employee profile is linked to this login.",
        });
      }

      const existingTask = await operationsModel.getTaskById(
        req.params.id
      );

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: "Operations task not found.",
        });
      }

      const isAssignedToEmployee =
        String(existingTask.employee || "").trim().toLowerCase() ===
        String(employee.full_name || "").trim().toLowerCase();

      if (!isAssignedToEmployee) {
        return res.status(403).json({
          success: false,
          message: "You can update only tasks assigned to you.",
        });
      }
    }

    const updatedTask = await operationsModel.updateTaskStatus(
      req.params.id,
      status
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Operations task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update Operations task status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update task status.",
    });
  }
};

// DELETE /api/operations/:id — Admin only
const deleteOperationsTask = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can delete Operations tasks.",
      });
    }

    const deletedTask = await operationsModel.deleteTask(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: "Operations task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Operations task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Operations task error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete Operations task.",
    });
  }
};

module.exports = {
  getOperationsTasks,
  createOperationsTask,
  updateOperationsTask,
  updateOperationsTaskStatus,
  deleteOperationsTask,
};
