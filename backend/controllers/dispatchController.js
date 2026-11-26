const Dispatch = require("../models/dispatchModel");

const STATUSES = ["Pending", "Dispatched", "In Transit", "Delivered", "Cancelled"];

const clean = (body = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    out[key] = typeof value === "string" ? value.trim() || null : value ?? null;
  }
  out.status = out.status || "Pending";
  return out;
};

const validate = (d) => {
  if (!d.customerName) return "Customer name is required.";
  if (!d.deliveryAddress) return "Delivery address is required.";
  if (!STATUSES.includes(d.status)) return "Invalid status.";
  return null;
};

const isBadId = (err) => err.code === "22P02"; // invalid uuid

const handleError = (res, err, label) => {
  if (isBadId(err)) {
    return res.status(404).json({ success: false, message: "Dispatch not found." });
  }
  console.error(`${label}:`, err);
  res.status(500).json({ success: false, message: `${label} failed.` });
};

exports.getDispatches = async (req, res) => {
  try {
    const dispatches = await Dispatch.getAll();
    res.json({ success: true, dispatches });
  } catch (err) {
    handleError(res, err, "Loading dispatches");
  }
};

exports.createDispatch = async (req, res) => {
  try {
    const data = clean(req.body);
    const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const dispatch = await Dispatch.create(data);
    res.status(201).json({ success: true, dispatch });
  } catch (err) {
    handleError(res, err, "Creating dispatch");
  }
};

exports.updateDispatch = async (req, res) => {
  try {
    const data = clean(req.body);
    const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const dispatch = await Dispatch.update(req.params.id, data);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found." });
    }
    res.json({ success: true, dispatch });
  } catch (err) {
    handleError(res, err, "Updating dispatch");
  }
};

exports.updateDispatchStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const dispatch = await Dispatch.updateStatus(req.params.id, status);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found." });
    }
    res.json({ success: true, dispatch });
  } catch (err) {
    handleError(res, err, "Updating status");
  }
};

exports.deleteDispatch = async (req, res) => {
  try {
    const deleted = await Dispatch.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Dispatch not found." });
    }
    res.json({ success: true, message: "Dispatch deleted." });
  } catch (err) {
    handleError(res, err, "Deleting dispatch");
  }
};