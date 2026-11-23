
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Authentication must run before role authorization.
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Please authenticate first",
        });
      }

      // Admin has full access to all protected ERP routes.
      const userRole = String(req.user.role || "")
        .trim()
        .toLowerCase();

      if (userRole === "admin") {
        return next();
      }

      // Check the permitted roles for other users.
      const normalizedAllowedRoles = allowedRoles.map((role) =>
        String(role).trim().toLowerCase()
      );

      if (!normalizedAllowedRoles.includes(userRole)) {
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
