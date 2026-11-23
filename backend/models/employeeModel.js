const pool = require("../config/db");

const listEmployees = async () => {
  const result = await pool.query(`
    SELECT
      id,
      user_id,
      full_name,
      email,
      phone,
      designation,
      department,
      status,
      created_at,
      updated_at
    FROM public.employees
    ORDER BY LOWER(full_name), created_at
  `);

  return result.rows;
};

const findEmployeeById = async (id, client = pool) => {
  const result = await client.query(
    `SELECT * FROM public.employees WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};
const findEmployeeByUserId = async (userId) => {
  const result = await pool.query(`
    SELECT
      id,
      user_id,
      full_name,
      email,
      phone,
      designation,
      department,
      status,
      created_at,
      updated_at
    FROM public.employees
    WHERE user_id = $1
    LIMIT 1
  `, [userId]);

  return result.rows[0] || null;
};

const createEmployeeWithUser = async ({
  full_name,
  email,
  phone,
  designation,
  department,
  password_hash,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const duplicate = await client.query(
      `SELECT email FROM public.users WHERE LOWER(email) = LOWER($1)
       UNION ALL
       SELECT email FROM public.employees WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (duplicate.rowCount > 0) {
      const error = new Error("An employee or user already exists with this email.");
      error.statusCode = 409;
      throw error;
    }

    const userResult = await client.query(
      `INSERT INTO public.users
        (full_name, email, password_hash, role, department, is_active, must_change_password)
       VALUES ($1, $2, $3, 'Employee', $4, TRUE, TRUE)
       RETURNING id`,
      [full_name, email, password_hash, department || null]
    );

    const userId = userResult.rows[0].id;

    const employeeResult = await client.query(
      `INSERT INTO public.employees
        (user_id, full_name, email, phone, designation, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active')
       RETURNING id, user_id, full_name, email, phone, designation, department, status, created_at, updated_at`,
      [
        userId,
        full_name,
        email,
        phone || null,
        designation || null,
        department || null,
      ]
    );

    await client.query("COMMIT");
    return employeeResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateEmployee = async (id, fields) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await findEmployeeById(id, client);

    if (!current) {
      const error = new Error("Employee not found.");
      error.statusCode = 404;
      throw error;
    }

    const fullName = fields.full_name;
    const email = fields.email;
    const phone = fields.phone || null;
    const designation = fields.designation || null;
    const department = fields.department || null;
    const status = fields.status;

    if (current.user_id && !email) {
      const error = new Error("Email is required for an employee with a login account.");
      error.statusCode = 400;
      throw error;
    }

    if (email) {
      const duplicate = await client.query(
        `SELECT id FROM public.employees
         WHERE LOWER(email) = LOWER($1) AND id <> $2
         UNION ALL
         SELECT id FROM public.users
         WHERE LOWER(email) = LOWER($1) AND id <> $3
         LIMIT 1`,
        [email, id, current.user_id || "00000000-0000-0000-0000-000000000000"]
      );

      if (duplicate.rowCount > 0) {
        const error = new Error("Another employee or user already uses this email.");
        error.statusCode = 409;
        throw error;
      }
    }

    const employeeResult = await client.query(
      `UPDATE public.employees
       SET full_name = $1,
           email = $2,
           phone = $3,
           designation = $4,
           department = $5,
           status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, user_id, full_name, email, phone, designation, department, status, created_at, updated_at`,
      [fullName, email || null, phone, designation, department, status, id]
    );

    if (current.user_id) {
      await client.query(
        `UPDATE public.users
         SET full_name = $1,
             email = $2,
             department = $3,
             is_active = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [fullName, email, department, status === "Active", current.user_id]
      );
    }

    await client.query("COMMIT");
    return employeeResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deactivateEmployee = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employee = await findEmployeeById(id, client);

    if (!employee) {
      const error = new Error("Employee not found.");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `UPDATE public.employees
       SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    if (employee.user_id) {
      await client.query(
        `UPDATE public.users
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [employee.user_id]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  listEmployees,
  findEmployeeByUserId,
  createEmployeeWithUser,
  updateEmployee,
  deactivateEmployee,
};


