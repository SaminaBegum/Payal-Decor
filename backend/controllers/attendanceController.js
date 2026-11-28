const {
  findActiveEmployeeByUserId,
  getTodayAttendance,
  checkIn,
  checkOut,
  getMyAttendance,
  createDailyProgress,
  getMyDailyProgress,
} = require("../models/attendanceModel");

const getMyAttendanceStatus = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const attendance = await getTodayAttendance(employee.id);

    return res.status(200).json({
      success: true,
      employee: {
        id: employee.id,
        full_name: employee.full_name,
      },
      attendance,
    });
  } catch (error) {
    console.error("Get attendance status error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load attendance status.",
    });
  }
};

const employeeCheckIn = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const attendance = await checkIn(employee.id, req.user.id);

    return res.status(201).json({
      success: true,
      message: "Checked in successfully.",
      attendance,
    });
  } catch (error) {
    console.error("Employee check-in error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to check in.",
    });
  }
};

const employeeCheckOut = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const attendance = await checkOut(employee.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Checked out successfully.",
      attendance,
    });
  } catch (error) {
    console.error("Employee check-out error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to check out.",
    });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const attendance = await getMyAttendance(employee.id);

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Attendance history error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load attendance history.",
    });
  }
};

const submitDailyProgress = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const {
      work_summary,
      completed_work,
      pending_work,
      blockers,
      hours_worked,
    } = req.body;

    if (
      typeof work_summary !== "string" ||
      !work_summary.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Work summary is required.",
      });
    }

    let normalizedHours = null;

    if (
      hours_worked !== undefined &&
      hours_worked !== null &&
      hours_worked !== ""
    ) {
      normalizedHours = Number(hours_worked);

      if (
        !Number.isFinite(normalizedHours) ||
        normalizedHours < 0 ||
        normalizedHours > 24
      ) {
        return res.status(400).json({
          success: false,
          message: "Hours worked must be between 0 and 24.",
        });
      }
    }

    const optionalFields = {
      completed_work,
      pending_work,
      blockers,
    };

    for (const [field, value] of Object.entries(optionalFields)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be text.`,
        });
      }
    }

    const progress = await createDailyProgress(employee.id, {
      work_summary: work_summary.trim(),
      completed_work,
      pending_work,
      blockers,
      hours_worked: normalizedHours,
    });

    return res.status(201).json({
      success: true,
      message: "Daily progress submitted successfully.",
      progress,
    });
  } catch (error) {
    console.error("Submit daily progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit daily progress.",
    });
  }
};

const getDailyProgressHistory = async (req, res) => {
  try {
    const employee = await findActiveEmployeeByUserId(req.user.id);

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Active employee profile not found.",
      });
    }

    const progress = await getMyDailyProgress(employee.id);

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Daily progress history error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load daily progress history.",
    });
  }
};

module.exports = {
  getMyAttendanceStatus,
  employeeCheckIn,
  employeeCheckOut,
  getAttendanceHistory,
  submitDailyProgress,
  getDailyProgressHistory,
};
