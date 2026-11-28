
const leaveModel = require("../models/leaveModel");

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// GET: Available leave types.
const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await leaveModel.getLeaveTypes();

    return res.status(200).json({
      success: true,
      leaveTypes,
    });
  } catch (error) {
    console.error("Get leave types error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load leave types.",
    });
  }
};

// POST: Employee applies for leave.
const applyForLeave = async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body;

    if (
      !leave_type_id ||
      !validDate(start_date) ||
      !validDate(end_date) ||
      end_date < start_date ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid leave type, dates and reason.",
      });
    }

    if (reason.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Leave reason cannot exceed 2000 characters.",
      });
    }

    if (start_date < new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    })) {
      return res.status(400).json({
        success: false,
        message: "Leave cannot be applied for a past date.",
      });
    }

    const leave = await leaveModel.createLeaveApplication(
      req.user.id,
      { leave_type_id, start_date, end_date, reason }
    );

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully.",
      leave,
    });
  } catch (error) {
    console.error("Apply leave error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to submit leave application.",
    });
  }
};

// GET: Employee's own leave history.
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await leaveModel.getMyLeaves(req.user.id);

    return res.status(200).json({
      success: true,
      leaves,
    });
  } catch (error) {
    console.error("Get my leaves error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to load your leave history.",
    });
  }
};

// POST: Employee cancels a pending application.
const cancelMyLeave = async (req, res) => {
  try {
    const leave = await leaveModel.cancelMyLeave(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Leave application cancelled.",
      leave,
    });
  } catch (error) {
    console.error("Cancel leave error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to cancel leave application.",
    });
  }
};

// GET: Admin views all leave applications.
const getAllLeaves = async (req, res) => {
  try {
    const status = req.query.status || "All";

    const allowedStatuses = [
      "All",
      "Pending",
      "Approved",
      "Rejected",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave status filter.",
      });
    }

    const leaves = await leaveModel.getAllLeaves(status);

    return res.status(200).json({
      success: true,
      leaves,
    });
  } catch (error) {
    console.error("Get all leaves error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load employee leave applications.",
    });
  }
};

// PATCH: Admin approves or rejects an application.
const reviewLeave = async (req, res) => {
  try {
    const { status, admin_remarks } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected.",
      });
    }

    if (
      admin_remarks !== undefined &&
      (typeof admin_remarks !== "string" || admin_remarks.length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin remarks must be text up to 2000 characters.",
      });
    }

    const leave = await leaveModel.reviewLeave(
      req.params.id,
      req.user.id,
      status,
      admin_remarks?.trim() || null
    );

    return res.status(200).json({
      success: true,
      message: `Leave application ${status.toLowerCase()} successfully.`,
      leave,
    });
  } catch (error) {
    console.error("Review leave error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to review leave application.",
    });
  }
};

module.exports = {
  getLeaveTypes,
  applyForLeave,
  getMyLeaves,
  cancelMyLeave,
  getAllLeaves,
  reviewLeave,
};
