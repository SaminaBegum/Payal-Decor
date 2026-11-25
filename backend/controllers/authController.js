
const {
  findUserByEmail,
  findUserPasswordById,
  updateUserPassword,
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
        mustChangePassword: user.must_change_password,
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

// Change password for authenticated user
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

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
        message: "New password must be at least 8 characters long",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password",
      });
    }

    const user = await findUserPasswordById(req.user.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is invalid or inactive",
      });
    }

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const passwordHash = await hashPassword(newPassword);

    const updatedUser = await updateUserPassword(
      req.user.id,
      passwordHash
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Password could not be updated. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      user: updatedUser,
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
