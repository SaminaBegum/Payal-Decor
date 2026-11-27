const {
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
} = require("../models/paymentModel");

const PAYMENT_TYPES = ["Received", "Paid"];
const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque"];
const STATUSES = ["Pending", "Completed", "Cancelled"];

// Database row -> shape the frontend already uses
const toApi = (row) => ({
  id: row.id,
  paymentNo: row.payment_no,
  paymentDate: row.payment_date || "",
  party: row.party_name,
  paymentType: row.payment_type,
  amount: String(row.amount),
  paymentMode: row.payment_mode,
  referenceNo: row.reference_no || "",
  status: row.status,
  remarks: row.remarks || "",
});

// Validate the request body and convert it to database fields
const parseBody = (body = {}) => {
  const party = String(body.party || "").trim();
  const amount = Number(body.amount);
  const paymentType = body.paymentType || "Received";
  const paymentMode = body.paymentMode || "Cash";
  const status = body.status || "Pending";

  if (!party) {
    return { error: "Customer / Vendor is required" };
  }

  if (body.amount === "" || body.amount === undefined || !Number.isFinite(amount) || amount < 0) {
    return { error: "Amount must be a valid number" };
  }

  if (!PAYMENT_TYPES.includes(paymentType)) {
    return { error: "Invalid payment type" };
  }

  if (!PAYMENT_MODES.includes(paymentMode)) {
    return { error: "Invalid payment mode" };
  }

  if (!STATUSES.includes(status)) {
    return { error: "Invalid status" };
  }

  return {
    data: {
      payment_no: String(body.paymentNo || "").trim(),
      payment_date: body.paymentDate ? String(body.paymentDate) : null,
      party_name: party,
      payment_type: paymentType,
      amount,
      payment_mode: paymentMode,
      reference_no: String(body.referenceNo || "").trim() || null,
      status,
      remarks: String(body.remarks || "").trim() || null,
    },
  };
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const handleError = (res, error, label) => {
  console.error(`${label}:`, error);

  // 23505 = unique violation (duplicate payment number)
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "This Payment No. already exists",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Server error. Please try again.",
  });
};

// GET /api/payments
const listPayments = async (req, res) => {
  try {
    const rows = await getAllPayments();
    return res.json({ success: true, data: rows.map(toApi) });
  } catch (error) {
    return handleError(res, error, "List payments error");
  }
};

// POST /api/payments
const addPayment = async (req, res) => {
  try {
    const { error, data } = parseBody(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const row = await createPayment(data);
    return res.status(201).json({ success: true, data: toApi(row) });
  } catch (err) {
    return handleError(res, err, "Create payment error");
  }
};

// PUT /api/payments/:id
const editPayment = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid payment id" });
    }

    const { error, data } = parseBody(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const row = await updatePayment(id, data);

    if (!row) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.json({ success: true, data: toApi(row) });
  } catch (err) {
    return handleError(res, err, "Update payment error");
  }
};

// DELETE /api/payments/:id
const removePayment = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid payment id" });
    }

    const row = await deletePayment(id);

    if (!row) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.json({ success: true, message: "Payment deleted" });
  } catch (err) {
    return handleError(res, err, "Delete payment error");
  }
};

module.exports = {
  listPayments,
  addPayment,
  editPayment,
  removePayment,
};
