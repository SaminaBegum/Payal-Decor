
const pool = require("../config/db");

// GET: Load all employee profiles
const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        phone,
        designation,
        department,
        status,
        user_id,
        created_at,
        updated_at
      FROM public.employees
      ORDER BY full_name ASC
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

// POST: Create an employee profile
const createEmployee = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      designation,
      department,
      status = "Active",
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanStatus = status === "Inactive" ? "Inactive" : "Active";

    const result = await pool.query(
      `INSERT INTO public.employees
        (full_name, email, phone, designation, department, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        full_name.trim(),
        cleanEmail,
        phone?.trim() || null,
        designation?.trim() || null,
        department?.trim() || null,
        cleanStatus,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An employee with this email already exists",
      });
    }

    console.error("Create employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
};

// PUT: Update an employee profile
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      designation,
      department,
      status,
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee status",
      });
    }

    const result = await pool.query(
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
        full_name.trim(),
        email?.trim().toLowerCase() || null,
        phone?.trim() || null,
        designation?.trim() || null,
        department?.trim() || null,
        status || "Active",
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An employee with this email already exists",
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
      message: "Failed to update employee",
    });
  }
};

// DELETE: Deactivate an employee without deleting history
const deleteEmployee = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE public.employees
       SET status = 'Inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, status`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
      employee: result.rows[0],
    });
  } catch (error) {
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
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
