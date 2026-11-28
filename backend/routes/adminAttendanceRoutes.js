
// const express = require("express");
// const router = express.Router();

// const authMiddleware = require("../middleware/authMiddleware");
// const roleMiddleware = require("../middleware/roleMiddleware");

// const {
//   getAdminAttendanceOverview,
// } = require("../controllers/adminAttendanceController");

// // Require login and Admin authorization.
// router.use(authMiddleware);
// router.use(roleMiddleware("Admin"));

// // GET /api/admin/attendance
// router.get("/", getAdminAttendanceOverview);

// module.exports = router;


const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAdminAttendanceOverview,
} = require("../controllers/adminAttendanceController");

const {
  getAdminMonthlyAttendance,
} = require("../controllers/adminAttendanceMonthlyController");

// Require login and Admin authorization.
router.use(authMiddleware);
router.use(roleMiddleware("Admin"));

// Daily attendance overview
router.get("/", getAdminAttendanceOverview);

// Monthly attendance history and reports
router.get("/monthly", getAdminMonthlyAttendance);

module.exports = router;
