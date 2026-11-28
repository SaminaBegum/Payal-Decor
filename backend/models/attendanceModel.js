const pool = require("../config/db");

const findActiveEmployeeByUserId = async (userId, client = pool) => {
  const result = await client.query(
    `SELECT
       id,
       user_id,
       full_name,
       email,
       phone,
       designation,
       department,
       status
     FROM public.employees
     WHERE user_id = $1
       AND status = 'Active'
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const getTodayAttendance = async (employeeId, client = pool) => {
  const result = await client.query(
    `SELECT *
     FROM public.employee_attendance
     WHERE employee_id = $1
       AND attendance_date = CURRENT_DATE
     LIMIT 1`,
    [employeeId]
  );

  return result.rows[0] || null;
};

const checkIn = async (employeeId, actorUserId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employee = await findActiveEmployeeByUserId(actorUserId, client);

    if (!employee || employee.id !== employeeId) {
      const error = new Error("Active employee profile not found.");
      error.statusCode = 403;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO public.employee_attendance
        (employee_id, attendance_date, check_in_at, status)
       VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'Present')
       ON CONFLICT (employee_id, attendance_date) DO NOTHING
       RETURNING *`,
      [employeeId]
    );

    if (result.rowCount === 0) {
      const error = new Error("Attendance already exists for today.");
      error.statusCode = 409;
      throw error;
    }

    const attendance = result.rows[0];

    await client.query(
      `INSERT INTO public.employee_attendance_audit
        (attendance_id, employee_id, action, actor_user_id)
       VALUES ($1, $2, 'CHECK_IN', $3)`,
      [attendance.id, employeeId, actorUserId]
    );

    await client.query("COMMIT");
    return attendance;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const checkOut = async (employeeId, actorUserId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employee = await findActiveEmployeeByUserId(actorUserId, client);

    if (!employee || employee.id !== employeeId) {
      const error = new Error("Active employee profile not found.");
      error.statusCode = 403;
      throw error;
    }

    const result = await client.query(
      `UPDATE public.employee_attendance
       SET check_out_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $1
         AND attendance_date = CURRENT_DATE
         AND check_in_at IS NOT NULL
         AND check_out_at IS NULL
       RETURNING *`,
      [employeeId]
    );

    if (result.rowCount === 0) {
      const error = new Error(
        "No active check-in found for today, or you have already checked out."
      );
      error.statusCode = 409;
      throw error;
    }

    const attendance = result.rows[0];

    await client.query(
      `INSERT INTO public.employee_attendance_audit
        (attendance_id, employee_id, action, actor_user_id)
       VALUES ($1, $2, 'CHECK_OUT', $3)`,
      [attendance.id, employeeId, actorUserId]
    );

    await client.query("COMMIT");
    return attendance;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getMyAttendance = async (employeeId, limit = 30) => {
  const result = await pool.query(
    `SELECT *
     FROM public.employee_attendance
     WHERE employee_id = $1
     ORDER BY attendance_date DESC
     LIMIT $2`,
    [employeeId, limit]
  );

  return result.rows;
};

const createDailyProgress = async (employeeId, data) => {
  const result = await pool.query(
    `INSERT INTO public.employee_daily_progress
      (employee_id, progress_date, work_summary, completed_work,
       pending_work, blockers, hours_worked)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      employeeId,
      data.work_summary,
      data.completed_work || null,
      data.pending_work || null,
      data.blockers || null,
      data.hours_worked ?? null,
    ]
  );

  return result.rows[0];
};

const getMyDailyProgress = async (employeeId, limit = 30) => {
  const result = await pool.query(
    `SELECT *
     FROM public.employee_daily_progress
     WHERE employee_id = $1
     ORDER BY progress_date DESC, created_at DESC
     LIMIT $2`,
    [employeeId, limit]
  );

  return result.rows;
};

module.exports = {
  findActiveEmployeeByUserId,
  getTodayAttendance,
  checkIn,
  checkOut,
  getMyAttendance,
  createDailyProgress,
  getMyDailyProgress,
};
