
const pool = require("../config/db");

// Find the active employee linked to the logged-in user.
const findEmployeeByUserId = async (userId, client = pool) => {
  const result = await client.query(
    `SELECT id, user_id, full_name, email, status
     FROM public.employees
     WHERE user_id = $1
       AND status = 'Active'
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

// Get available leave categories.
const getLeaveTypes = async () => {
  const result = await pool.query(
    `SELECT id, name, description, is_paid, annual_limit
     FROM public.employee_leave_types
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );

  return result.rows;
};

// Apply for leave.
const createLeaveApplication = async (userId, data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employee = await findEmployeeByUserId(userId, client);

    if (!employee) {
      const error = new Error("Active employee profile not found.");
      error.statusCode = 403;
      throw error;
    }

    const leaveType = await client.query(
      `SELECT id
       FROM public.employee_leave_types
       WHERE id = $1 AND is_active = TRUE`,
      [data.leave_type_id]
    );

    if (leaveType.rowCount === 0) {
      const error = new Error("Invalid or inactive leave type.");
      error.statusCode = 400;
      throw error;
    }

    // Count Monday-Saturday as working leave days.
    // Sunday is excluded.
    const daysResult = await client.query(
      `SELECT COUNT(*)::integer AS total_days
       FROM generate_series(
         $1::date,
         $2::date,
         INTERVAL '1 day'
       ) AS day
       WHERE EXTRACT(ISODOW FROM day) <> 7`,
      [data.start_date, data.end_date]
    );

    const totalDays = Number(daysResult.rows[0].total_days);

    if (totalDays <= 0) {
      const error = new Error(
        "The selected date range contains no working days."
      );
      error.statusCode = 400;
      throw error;
    }

    // Prevent overlapping pending or approved leave.
    const overlap = await client.query(
      `SELECT id
       FROM public.employee_leaves
       WHERE employee_id = $1
         AND status IN ('Pending', 'Approved')
         AND start_date <= $3::date
         AND end_date >= $2::date
       LIMIT 1`,
      [employee.id, data.start_date, data.end_date]
    );

    if (overlap.rowCount > 0) {
      const error = new Error(
        "You already have a pending or approved leave during these dates."
      );
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO public.employee_leaves
        (employee_id, leave_type_id, start_date, end_date,
         total_days, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        employee.id,
        data.leave_type_id,
        data.start_date,
        data.end_date,
        totalDays,
        data.reason.trim(),
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Employee leave history.
const getMyLeaves = async (userId) => {
  const employee = await findEmployeeByUserId(userId);

  if (!employee) {
    const error = new Error("Active employee profile not found.");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `SELECT
       l.*,
       t.name AS leave_type,
       t.is_paid,
       u.full_name AS reviewer_name
     FROM public.employee_leaves l
     JOIN public.employee_leave_types t
       ON t.id = l.leave_type_id
     LEFT JOIN public.users u
       ON u.id = l.reviewed_by
     WHERE l.employee_id = $1
     ORDER BY l.created_at DESC`,
    [employee.id]
  );

  return result.rows;
};

// Admin: view all employee leave applications.
const getAllLeaves = async (status = "All") => {
  const result = await pool.query(
    `SELECT
       l.*,
       e.full_name,
       e.email,
       e.department,
       e.designation,
       t.name AS leave_type,
       t.is_paid,
       u.full_name AS reviewer_name
     FROM public.employee_leaves l
     JOIN public.employees e
       ON e.id = l.employee_id
     JOIN public.employee_leave_types t
       ON t.id = l.leave_type_id
     LEFT JOIN public.users u
       ON u.id = l.reviewed_by
     WHERE ($1 = 'All' OR l.status = $1)
     ORDER BY
       CASE WHEN l.status = 'Pending' THEN 0 ELSE 1 END,
       l.created_at DESC`,
    [status]
  );

  return result.rows;
};

// Admin: approve or reject a pending application.
const reviewLeave = async (
  leaveId,
  adminUserId,
  status,
  remarks = null
) => {
  const result = await pool.query(
    `UPDATE public.employee_leaves
     SET status = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP,
         admin_remarks = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status = 'Pending'
     RETURNING *`,
    [leaveId, status, adminUserId, remarks]
  );

  if (result.rowCount === 0) {
    const error = new Error(
      "Leave request not found or it has already been reviewed."
    );
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

// Employee: cancel their own pending application.
const cancelMyLeave = async (leaveId, userId) => {
  const employee = await findEmployeeByUserId(userId);

  if (!employee) {
    const error = new Error("Active employee profile not found.");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.employee_leaves
     SET status = 'Cancelled',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND employee_id = $2
       AND status = 'Pending'
     RETURNING *`,
    [leaveId, employee.id]
  );

  if (result.rowCount === 0) {
    const error = new Error(
      "Pending leave request not found or cannot be cancelled."
    );
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = {
  findEmployeeByUserId,
  getLeaveTypes,
  createLeaveApplication,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  cancelMyLeave,
};
