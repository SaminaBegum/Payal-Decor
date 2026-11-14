
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure authentication middleware ran first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Please authenticate first",
        });
      }

      // Check whether the user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      return next();

    } catch (error) {
      console.error("Role authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization failed",
      });
    }
  };
};

module.exports = roleMiddleware;
