
const pool = require("../config/db");
const crypto = require("crypto");
const { hashPassword } = require("../utils/passwordUtils");

// GET: Load all employee profiles
const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.full_name,
        e.email,
        e.phone,
        e.designation,
        e.department,
        e.status,
        e.user_id,
        e.created_at,
        e.updated_at,
        u.is_active AS login_active,
        u.must_change_password
      FROM public.employees e
      LEFT JOIN public.users u ON u.id = e.user_id
      ORDER BY e.full_name ASC
    `);

    return res.status(200).json({
      success: true,
      employees: result.rows,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load employees",
    });
  }
};

// POST: Create employee profile and login account
const createEmployee = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      phone,
      designation,
      department,
      status = "Active",
    } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee email is required to create login access",
      });
    }

    if (status !== "Active" && status !== "Inactive") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee status",
      });
    }

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanStatus = status;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid employee email address",
      });
    }

    await client.query("BEGIN");

    // Generate a secure one-time temporary password
    const temporaryPassword =
      crypto.randomBytes(12).toString("base64url");

    // Hash the temporary password
    const passwordHash = await hashPassword(temporaryPassword);

    // Create employee login account
    const userResult = await client.query(
      `INSERT INTO public.users (
        full_name,
        email,
        password_hash,
        role,
        department,
        is_active,
        must_change_password
      )
      VALUES ($1, $2, $3, 'Employee', $4, $5, TRUE)
      RETURNING id, full_name, email, role, department, is_active`,
      [
        cleanName,
        cleanEmail,
        passwordHash,
        department?.trim() || null,
        cleanStatus === "Active",
      ]
    );

    const user = userResult.rows[0];

    // Create employee profile linked to the login account
    const employeeResult = await client.query(
      `INSERT INTO public.employees (
        user_id,
        full_name,
        email,
        phone,
        designation,
        department,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        user.id,
        cleanName,
        cleanEmail,
        typeof phone === "string" ? phone.trim() || null : null,
        typeof designation === "string"
          ? designation.trim() || null
          : null,
        typeof department === "string"
          ? department.trim() || null
          : null,
        cleanStatus,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Employee and login account created successfully",
      employee: employeeResult.rows[0],
      loginCredentials: {
        email: user.email,
        temporaryPassword,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An employee or login account with this email already exists",
      });
    }

    console.error("Create employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create employee and login account",
    });
  } finally {
    client.release();
  }
};

// PUT: Update an employee profile

const updateEmployee = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const { id } = req.params;

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Get existing employee record
    const existingResult = await client.query(
      `SELECT *
       FROM public.employees
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const existing = existingResult.rows[0];
    const body = req.body;

    // Preserve existing values when fields are omitted
    const cleanName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : existing.full_name;

    const cleanEmail =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : existing.email;

    const cleanPhone =
      typeof body.phone === "string"
        ? body.phone.trim() || null
        : existing.phone;

    const cleanDesignation =
      typeof body.designation === "string"
        ? body.designation.trim() || null
        : existing.designation;

    const cleanDepartment =
      typeof body.department === "string"
        ? body.department.trim() || null
        : existing.department;

    const cleanStatus = body.status || existing.status;

    if (!cleanName) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }

    if (!["Active", "Inactive"].includes(cleanStatus)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Invalid employee status",
      });
    }

    if (
      cleanEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Please enter a valid employee email address",
      });
    }

    // A linked login account must always have an email
    if (existing.user_id && !cleanEmail) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Email is required for an employee with login access",
      });
    }

    // Update employee profile
    const result = await client.query(
      `UPDATE public.employees
       SET
         full_name = $1,
         email = $2,
         phone = $3,
         designation = $4,
         department = $5,
         status = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanDesignation,
        cleanDepartment,
        cleanStatus,
        id,
      ]
    );

    // Synchronize linked login account
    if (existing.user_id) {
      await client.query(
        `UPDATE public.users
         SET
           full_name = $1,
           email = $2,
           department = $3,
           is_active = $4,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          cleanName,
          cleanEmail,
          cleanDepartment,
          cleanStatus === "Active",
          existing.user_id,
        ]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Employee profile and login account updated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An employee or login account with this email already exists",
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    console.error("Update employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee and login account",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};


// DELETE: Deactivate employee and login account
const deleteEmployee = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE public.employees
       SET status = 'Inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, user_id, status`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (result.rows[0].user_id) {
      await client.query(
        `UPDATE public.users
         SET is_active = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [result.rows[0].user_id]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Employee and login access deactivated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    console.error("Deactivate employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate employee",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
