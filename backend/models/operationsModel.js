const pool = require("../config/db");
const { randomUUID } = require("crypto");

// Return all Operations tasks.
const getAllTasks = async () => {
  const query = `
    SELECT
      id,
      "taskId",
      workstream,
      "taskActivity",
      priority,
      employee,
      "primaryResponsible",
      "supportingRole",
      "expectedDeliverable",
      "targetDate",
      status,
      remarks,
      others,
      "createdAt",
      "updatedAt"
    FROM public.operation_tasks
    ORDER BY "taskId" ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

// Find one task by database ID.
const getTaskById = async (id) => {
  const query = `
    SELECT
      id,
      "taskId",
      workstream,
      "taskActivity",
      priority,
      employee,
      "primaryResponsible",
      "supportingRole",
      "expectedDeliverable",
      "targetDate",
      status,
      remarks,
      others,
      "createdAt",
      "updatedAt"
    FROM public.operation_tasks
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// Create a new Operations task.
const createTask = async (task) => {
  const query = `
    INSERT INTO public.operation_tasks (
      id,
      "taskId",
      workstream,
      "taskActivity",
      priority,
      employee,
      "primaryResponsible",
      "supportingRole",
      "expectedDeliverable",
      "targetDate",
      status,
      remarks,
      others,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const values = [
    task.id || randomUUID(),
    task.taskId,
    task.workstream,
    task.taskActivity,
    task.priority,
    task.employee || null,
    task.primaryResponsible,
    task.supportingRole || null,
    task.expectedDeliverable || null,
    task.targetDate || null,
    task.status,
    task.remarks || null,
    task.others || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Update an existing task.
const updateTask = async (id, task) => {
  const query = `
    UPDATE public.operation_tasks
    SET
      "taskId" = $2,
      workstream = $3,
      "taskActivity" = $4,
      priority = $5,
      employee = $6,
      "primaryResponsible" = $7,
      "supportingRole" = $8,
      "expectedDeliverable" = $9,
      "targetDate" = $10,
      status = $11,
      remarks = $12,
      others = $13,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    id,
    task.taskId,
    task.workstream,
    task.taskActivity,
    task.priority,
    task.employee || null,
    task.primaryResponsible,
    task.supportingRole || null,
    task.expectedDeliverable || null,
    task.targetDate || null,
    task.status,
    task.remarks || null,
    task.others || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

// Update only the task status.
const updateTaskStatus = async (id, status) => {
  const query = `
    UPDATE public.operation_tasks
    SET
      status = $2,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id, status]);
  return result.rows[0] || null;
};

// Delete a task.
const deleteTask = async (id) => {
  const query = `
    DELETE FROM public.operation_tasks
    WHERE id = $1
    RETURNING id
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
