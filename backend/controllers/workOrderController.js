const {
  getAllWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
} = require("../models/workOrderModel");

const validate = (b) => {
  if (!b.workOrderNo || !String(b.workOrderNo).trim()) return "Work order number is required";
  if (!b.startDate) return "Start date is required";
  if (!b.customerName || !String(b.customerName).trim()) return "Customer name is required";
  if (!b.projectName || !String(b.projectName).trim()) return "Project name is required";
  return null;
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "This work order number already exists",
    });
  }
  return res.status(500).json({ success: false, message: fallback });
};

const listWorkOrders = async (req, res) => {
  try {
    const data = await getAllWorkOrders();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to load work orders");
  }
};

const addWorkOrder = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const data = await createWorkOrder(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to save work order");
  }
};

const editWorkOrder = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const data = await updateWorkOrder(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Work order not found" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to update work order");
  }
};

const removeWorkOrder = async (req, res) => {
  try {
    const deleted = await deleteWorkOrder(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Work order not found" });
    }
    res.status(200).json({ success: true, message: "Work order deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete work order");
  }
};

module.exports = { listWorkOrders, addWorkOrder, editWorkOrder, removeWorkOrder };