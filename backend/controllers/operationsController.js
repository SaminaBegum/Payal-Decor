
const crypto = require("crypto");
const pool = require("../config/db");

const getTaskFields = (body) => ({
  taskId: String(body.taskId || "").trim().toUpperCase(),
  workstream: String(body.workstream || "").trim(),
  taskActivity: String(body.taskActivity || "").trim(),
  priority: String(body.priority || "Medium").trim(),
  primaryResponsible: String(body.primaryResponsible || "").trim(),
  supportingRole: body.supportingRole || null,
  expectedDeliverable: body.expectedDeliverable || null,
  targetDate: body.targetDate || null,
  status: String(body.status || "Pending").trim(),
  remarks: body.remarks || null,
  others: body.others || null,
  employee: body.employee || null,
});

const validateTask = (task) => {
  if (!task.taskId || !task.workstream || !task.taskActivity ||
      !task.primaryResponsible) {
    return "Task ID, Workstream, Task Activity and Primary Responsible are required.";
  }
  return null;
};

// GET all tasks
const getTasks = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM public.operation_tasks ORDER BY "createdAt" DESC'
    );

    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error("Get operations tasks error:", error);
    res.status(500).json({ success: false, message: "Unable to fetch tasks." });
  }
};

// CREATE task
const createTask = async (req, res) => {
  try {
    const task = getTaskFields(req.body);
    const validationError = validateTask(task);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const duplicate = await pool.query(
      'SELECT id FROM public.operation_tasks WHERE "taskId" = $1 LIMIT 1',
      [task.taskId]
    );

    if (duplicate.rows.length) {
      return res.status(409).json({
        success: false,
        message: "This Task ID already exists.",
      });
    }

    const result = await pool.query(
      `INSERT INTO public.operation_tasks
      ("id", "taskId", "workstream", "taskActivity", "priority",
       "primaryResponsible", "supportingRole", "expectedDeliverable",
       "targetDate", "status", "remarks", "others", "employee")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp,
              $10, $11, $12, $13)
      RETURNING *`,
      [
        crypto.randomUUID(),
        task.taskId,
        task.workstream,
        task.taskActivity,
        task.priority,
        task.primaryResponsible,
        task.supportingRole,
        task.expectedDeliverable,
        task.targetDate,
        task.status,
        task.remarks,
        task.others,
        task.employee,
      ]
    );

    res.status(201).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error("Create operations task error:", error);
    res.status(500).json({ success: false, message: "Unable to create task." });
  }
};

// UPDATE task
const updateTask = async (req, res) => {
  try {
    const task = getTaskFields(req.body);
    const validationError = validateTask(task);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const duplicate = await pool.query(
      'SELECT id FROM public.operation_tasks WHERE "taskId" = $1 AND id <> $2 LIMIT 1',
      [task.taskId, req.params.id]
    );

    if (duplicate.rows.length) {
      return res.status(409).json({
        success: false,
        message: "Another task already uses this Task ID.",
      });
    }

    const result = await pool.query(
      `UPDATE public.operation_tasks SET
       "taskId" = $1, "workstream" = $2, "taskActivity" = $3,
       "priority" = $4, "primaryResponsible" = $5,
       "supportingRole" = $6, "expectedDeliverable" = $7,
       "targetDate" = $8::timestamp, "status" = $9,
       "remarks" = $10, "others" = $11, "employee" = $12,
       "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        task.taskId,
        task.workstream,
        task.taskActivity,
        task.priority,
        task.primaryResponsible,
        task.supportingRole,
        task.expectedDeliverable,
        task.targetDate,
        task.status,
        task.remarks,
        task.others,
        task.employee,
        req.params.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error("Update operations task error:", error);
    res.status(500).json({ success: false, message: "Unable to update task." });
  }
};

// DELETE task
const deleteTask = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM public.operation_tasks WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    res.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete operations task error:", error);
    res.status(500).json({ success: false, message: "Unable to delete task." });
  }
};

// UPDATE task status
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || typeof status !== "string") {
      return res.status(400).json({ success: false, message: "A valid status is required." });
    }

    const result = await pool.query(
      `UPDATE public.operation_tasks
       SET "status" = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ success: false, message: "Unable to update task status." });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
};
