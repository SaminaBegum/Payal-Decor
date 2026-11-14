
const {
  findUserByEmail,
} = require("../models/userModel");

const {
  comparePassword,
} = require("../utils/passwordUtils");

const generateToken = require("../utils/generateToken");

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
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

    // Find user in PostgreSQL
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact the administrator.",
      });
    }

    // Verify password
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

    // Generate JWT
    const token = generateToken(user);

    // Return user details without password hash
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

module.exports = {
  login,
};
