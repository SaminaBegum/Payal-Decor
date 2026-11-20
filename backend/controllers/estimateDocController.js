const estimateDocModel = require("../models/estimateDocModel");

/**
 * GET /api/estimate-docs
 */
const getEstimateDocs = async (req, res) => {
  try {
    const estimates = await estimateDocModel.getAllEstimateDocs();
    return res.status(200).json({
      success: true,
      count: estimates.length,
      estimates,
      data: estimates,
    });
  } catch (error) {
    console.error("Error in getEstimateDocs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved estimate documents",
      error: error.message,
    });
  }
};

/**
 * GET /api/estimate-docs/:id
 */
const getEstimateDocById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimate = await estimateDocModel.getEstimateDocById(id);

    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: `Estimate document with ID "${id}" not found`,
      });
    }

    return res.status(200).json({
      success: true,
      estimate,
      data: estimate,
    });
  } catch (error) {
    console.error(`Error in getEstimateDocById (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimate document",
      error: error.message,
    });
  }
};

/**
 * POST /api/estimate-docs
 */
const createEstimateDoc = async (req, res) => {
  try {
    const { customerName, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "'Estimate For' (customer name) is required.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required in the estimate.",
      });
    }

    const created = await estimateDocModel.createEstimateDoc(req.body);

    return res.status(201).json({
      success: true,
      message: `Estimate ${created.estimateNo} created successfully`,
      estimate: created,
      data: created,
    });
  } catch (error) {
    console.error("Error in createEstimateDoc:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save estimate document",
      error: error.message,
    });
  }
};

/**
 * PUT /api/estimate-docs/:id
 */
const updateEstimateDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await estimateDocModel.updateEstimateDoc(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Estimate document with ID "${id}" not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Estimate ${updated.estimateNo} updated successfully`,
      estimate: updated,
      data: updated,
    });
  } catch (error) {
    console.error(`Error in updateEstimateDoc (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update estimate document",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/estimate-docs/:id
 */
const deleteEstimateDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await estimateDocModel.deleteEstimateDoc(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Estimate document with ID "${id}" not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Estimate document ${deleted.estimateNo || id} deleted successfully`,
    });
  } catch (error) {
    console.error(`Error in deleteEstimateDoc (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete estimate document",
      error: error.message,
    });
  }
};

module.exports = {
  getEstimateDocs,
  getEstimateDocById,
  createEstimateDoc,
  updateEstimateDoc,
  deleteEstimateDoc,
};
