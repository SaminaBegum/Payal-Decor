
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { findUserById } = require("../models/userModel");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // 2. Extract the JWT
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // 3. Verify JWT signature, expiry and issuer
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "payal-decor-api",
    });

    // 4. Retrieve the latest user record
    const user = await findUserById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is invalid or inactive",
      });
    }

    // 5. Verify linked employee profile is still active
    if (user.role === "Employee") {
      const employeeResult = await pool.query(
        `SELECT status
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

    // 6. Attach latest user information to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      department: user.department,
      mustChangePassword: user.must_change_password,
    };

    // 7. Allow session verification and password change
    const allowedDuringPasswordChange = [
      "/me",
      "/change-password",
    ];

    // 8. Restrict normal API access until password is changed
    if (
      user.must_change_password &&
      !allowedDuringPasswordChange.includes(req.path)
    ) {
      return res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: "Please change your temporary password before continuing.",
      });
    }

    return next();

  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication verification failed",
    });
  }
};

module.exports = authMiddleware;
