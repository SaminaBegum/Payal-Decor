const quotationModel = require("../models/quotationModel");

/**
 * GET /api/quotations - List all quotations with items
 */
const getQuotations = async (req, res) => {
  try {
    const quotations = await quotationModel.getAllQuotations(req.query);
    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
      quotations: quotations,
    });
  } catch (error) {
    console.error("Error in getQuotations controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
      error: error.message,
    });
  }
};

/**
 * GET /api/quotations/next-number - Generate next sequential quotation number
 */
const getNextNumber = async (req, res) => {
  try {
    const quotationNo = await quotationModel.getNextQuotationNo();
    return res.status(200).json({
      success: true,
      quotationNo,
    });
  } catch (error) {
    console.error("Error in getNextNumber controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate quotation number",
      error: error.message,
    });
  }
};

/**
 * GET /api/quotations/:id - Fetch single quotation
 */
const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await quotationModel.getQuotationById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: `Quotation #${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: quotation,
      quotation: quotation,
    });
  } catch (error) {
    console.error("Error in getQuotationById controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotation details",
      error: error.message,
    });
  }
};

/**
 * POST /api/quotations - Create a new quotation
 */
const createQuotation = async (req, res) => {
  try {
    const { customerName, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer / Client name is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Quotation must contain at least one line item",
      });
    }

    const created = await quotationModel.createQuotation(req.body);

    return res.status(201).json({
      success: true,
      message: `Quotation #${created.quotationNo} created successfully`,
      data: created,
      quotation: created,
    });
  } catch (error) {
    console.error("Error in createQuotation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create quotation",
      error: error.message,
    });
  }
};

/**
 * PUT /api/quotations/:id - Update quotation
 */
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer / Client name is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Quotation must contain at least one line item",
      });
    }

    const updated = await quotationModel.updateQuotation(id, req.body);

    return res.status(200).json({
      success: true,
      message: `Quotation #${updated.quotationNo} updated successfully`,
      data: updated,
      quotation: updated,
    });
  } catch (error) {
    console.error("Error in updateQuotation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quotation",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/quotations/:id - Delete quotation
 */
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await quotationModel.deleteQuotation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Quotation #${id} not found to delete`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Quotation #${deleted.quotationNo || id} deleted successfully`,
      id: deleted.id,
    });
  } catch (error) {
    console.error("Error in deleteQuotation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete quotation",
      error: error.message,
    });
  }
};

/**
 * POST /api/quotations/from-estimate/:estimateId - Convert saved estimate to quotation
 */
const convertFromEstimate = async (req, res) => {
  try {
    const { estimateId } = req.params;
    const created = await quotationModel.createFromEstimate(estimateId);

    return res.status(201).json({
      success: true,
      message: `Quotation #${created.quotationNo} successfully created from estimate #${estimateId}`,
      data: created,
      quotation: created,
    });
  } catch (error) {
    console.error("Error in convertFromEstimate controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to convert estimate to quotation",
      error: error.message,
    });
  }
};

module.exports = {
  getQuotations,
  getNextNumber,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertFromEstimate,
};
