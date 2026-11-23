const {
  getAllJobs,
  createJob,
  updateJob,
  deleteJob,
  getAllBoms,
} = require("../models/productionModel");

const validate = (b) => {
  if (!b.workOrderNo || !String(b.workOrderNo).trim()) return "Work order number is required";
  if (!b.productName || !String(b.productName).trim()) return "Product name is required";
  if (!b.quantity || Number(b.quantity) < 1) return "Production quantity must be at least 1";
  return null;
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);
  res.status(500).json({ success: false, message: fallback });
};

const listJobs = async (req, res) => {
  try {
    const data = await getAllJobs();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to load production jobs");
  }
};

const listBoms = async (req, res) => {
  try {
    const data = await getAllBoms();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to load BOMs");
  }
};

const addJob = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const data = await createJob(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to save production job");
  }
};

const editJob = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const data = await updateJob(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Production job not found" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to update production job");
  }
};

const removeJob = async (req, res) => {
  try {
    const deleted = await deleteJob(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Production job not found" });
    }
    res.status(200).json({ success: true, message: "Production job deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete production job");
  }
};

module.exports = { listJobs, listBoms, addJob, editJob, removeJob };