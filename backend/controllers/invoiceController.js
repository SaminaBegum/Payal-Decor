const {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} = require("../models/invoiceModel");

const validate = (b) => {
  if (!b.invoiceNo || !String(b.invoiceNo).trim()) return "Invoice number is required";
  if (!b.invoiceDate) return "Invoice date is required";
  if (!b.billToName || !String(b.billToName).trim()) return "Bill To name is required";
  if (!Array.isArray(b.items) || b.items.length === 0) return "At least one item is required";
  return null;
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "This invoice number already exists",
    });
  }
  return res.status(500).json({ success: false, message: fallback });
};

const listInvoices = async (req, res) => {
  try {
    const data = await getAllInvoices();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to load invoices");
  }
};

const addInvoice = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const data = await createInvoice(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to save invoice");
  }
};

const editInvoice = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const data = await updateInvoice(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to update invoice");
  }
};

const removeInvoice = async (req, res) => {
  try {
    const deleted = await deleteInvoice(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete invoice");
  }
};

module.exports = { listInvoices, addInvoice, editInvoice, removeInvoice };