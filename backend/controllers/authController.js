
const pool = require("../config/db");

const {
  findUserByEmail,
} = require("../models/userModel");

const {
  comparePassword,
  hashPassword,
} = require("../utils/passwordUtils");

const generateToken = require("../utils/generateToken");

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact the administrator.",
      });
    }

    const isPasswordValid = await comparePassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify that an Employee has an active linked employee profile.
    if (user.role === "Employee") {
      const employeeResult = await pool.query(
        `SELECT id, status
         FROM public.employees
         WHERE user_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (
        employeeResult.rowCount === 0 ||
        employeeResult.rows[0].status !== "Active"
      ) {
        return res.status(403).json({
          success: false,
          message: "Your employee profile is inactive or unavailable. Contact the administrator.",
        });
      }
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        must_change_password: user.must_change_password,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password",
      });
    }

    const userResult = await pool.query(
      `SELECT id, password_hash
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const user = userResult.rows[0];

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.query(
      `UPDATE public.users
       SET password_hash = $1,
           must_change_password = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newPasswordHash, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      mustChangePassword: false,
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Password change failed due to a server error",
    });
  }
};

module.exports = {
  login,
  changePassword,
};
