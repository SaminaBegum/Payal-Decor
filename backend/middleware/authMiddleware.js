
const jwt = require("jsonwebtoken");
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

    // 4. Find the latest user record in PostgreSQL
    const user = await findUserById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is invalid or inactive",
      });
    }

    // 5. Attach current user information to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      department: user.department,
    };

    // 6. Continue to the protected route
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
