const crypto = require("crypto");
const { hashPassword } = require("../utils/passwordUtils");

const {
  listEmployees,
  findEmployeeByUserId,
  createEmployeeWithUser,
  updateEmployee,
  deactivateEmployee,
} = require("../models/employeeModel");

const getEmployees = async (req, res) => {
  try {
    const employees = await listEmployees();

    return res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load employees.",
    });
  }
};

const getMyEmployeeProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const employee = await findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No employee profile is linked to this account.",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Get my employee profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your employee profile.",
    });
  }
};
const createEmployee = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      designation,
      department,
    } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required.",
      });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee email is required.",
      });
    }

    const cleanName = String(full_name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    const password_hash = await hashPassword(temporaryPassword);

    const employee = await createEmployeeWithUser({
      full_name: cleanName,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      designation: designation ? String(designation).trim() : "",
      department: department ? String(department).trim() : "",
      password_hash,
    });

    return res.status(201).json({
      success: true,
      employee,
      loginCredentials: {
        email: cleanEmail,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.statusCode === 409 || error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An employee or user already exists with this email.",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to create employee.",
    });
  }
};

const editEmployee = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      designation,
      department,
      status,
    } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required.",
      });
    }

    const normalizedStatus =
      String(status || "Active").trim().toLowerCase() === "inactive"
        ? "Inactive"
        : "Active";

    const cleanEmail = email ? String(email).trim().toLowerCase() : "";

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const employee = await updateEmployee(req.params.id, {
      full_name: String(full_name).trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      designation: designation ? String(designation).trim() : "",
      department: department ? String(department).trim() : "",
      status: normalizedStatus,
    });

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    if (error.statusCode === 409 || error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Another employee or user already uses this email.",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to update employee.",
    });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    await deactivateEmployee(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully.",
    });
  } catch (error) {
    console.error("Deactivate employee error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to deactivate employee.",
    });
  }
};

module.exports = {
  getEmployees,
  getMyEmployeeProfile,
  createEmployee,
  editEmployee,
  deleteEmployee,
};


