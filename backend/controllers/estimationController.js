const estimationService = require("../services/estimationService");
const quotationModel = require("../models/quotationModel");
const { validateEstimationInput } = require("../validators/estimationValidator");

/**
 * GET /api/estimation
 */
const getEstimations = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      customerId: req.query.customerId,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const estimations = await estimationService.getAllEstimations(filters);

    return res.status(200).json({
      success: true,
      count: estimations.length,
      data: estimations,
      estimations, // Compatibility with varied frontend wrappers
    });
  } catch (error) {
    console.error("Error in getEstimations controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimations",
      error: error.message,
    });
  }
};

/**
 * GET /api/estimation/:id
 */
const getEstimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await estimationService.getEstimationById(id);

    if (!estimation) {
      return res.status(404).json({
        success: false,
        message: `Estimation with ID "${id}" not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: estimation,
      estimation,
    });
  } catch (error) {
    console.error(`Error in getEstimationById (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimation details",
      error: error.message,
    });
  }
};

/**
 * POST /api/estimation
 */
const createEstimation = async (req, res) => {
  try {
    const validation = validateEstimationInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const created = await estimationService.createEstimation(req.body);

    return res.status(201).json({
      success: true,
      message: "Estimation and BOQ lines registered successfully in PostgreSQL database",
      data: created,
      estimation: created,
    });
  } catch (error) {
    console.error("Error in createEstimation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create estimation",
      error: error.message,
    });
  }
};

/**
 * PUT /api/estimation/:id
 */
const updateEstimation = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateEstimationInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const updated = await estimationService.updateEstimation(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Estimation with ID "${id}" not found to update`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Estimation and BOQ lines updated successfully in PostgreSQL database",
      data: updated,
      estimation: updated,
    });
  } catch (error) {
    console.error(`Error in updateEstimation (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update estimation",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/estimation/:id
 */
const deleteEstimation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await estimationService.deleteEstimation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Estimation with ID "${id}" not found to delete`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Estimation "${deleted.estimationNumber || id}" and associated BOQ lines deleted from database`,
      id: deleted.id,
    });
  } catch (error) {
    console.error(`Error in deleteEstimation (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete estimation",
      error: error.message,
    });
  }
};

/**
 * GET /api/estimation/materials
 * Returns catalog of standard materials, rates, and default wastage
 */
const getMaterials = async (req, res) => {
  try {
    const { category } = req.query;
    const materials = await estimationService.getAllMaterials(category);

    return res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
      materials,
    });
  } catch (error) {
    console.error("Error in getMaterials controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch materials master",
      error: error.message,
    });
  }
};

/**
 * POST /api/estimation/calculate-boq
 
 */
const calculateBOQ = async (req, res) => {
  try {
    const { lengthMm, widthMm, heightMm, quantity, wastagePercent, edges, pricingMethod, markupPercent, marginPercent } = req.body;

    const metrics = estimationService.calculateSpatialMetrics({
      lengthMm,
      widthMm,
      heightMm,
      quantity,
      wastagePercent,
      edges,
    });

    const materials = await estimationService.getAllMaterials();
    const boqLines = estimationService.generateDefaultBOQ(metrics, materials);

    let totalPrimeCost = boqLines.reduce((acc, line) => acc + (line.totalCost || 0), 0);
    const unitPrimeCost = totalPrimeCost / Math.max(1, metrics.qty);

    const unitSellingPrice = estimationService.calculateSellingPrice(
      unitPrimeCost,
      pricingMethod === "markup" ? markupPercent : marginPercent,
      pricingMethod
    );
    const totalSellingPrice = unitSellingPrice * metrics.qty;

    return res.status(200).json({
      success: true,
      metrics,
      boqLines,
      costSummary: {
        unitPrimeCost: Number(unitPrimeCost.toFixed(2)),
        totalPrimeCost: Number(totalPrimeCost.toFixed(2)),
        unitSellingPrice: Number(unitSellingPrice.toFixed(2)),
        totalSellingPrice: Number(totalSellingPrice.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error in calculateBOQ controller:", error);
    return res.status(500).json({
      success: false,
      message: "Calculation failed",
      error: error.message,
    });
  }
};

/**
 * POST /api/estimation/:id/convert-to-quotation
 */
const convertToQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await quotationModel.createFromEstimate(id);

    return res.status(201).json({
      success: true,
      message: `Quotation #${quotation.quotationNo} created from estimation and saved to database!`,
      quotation,
      data: quotation,
    });
  } catch (error) {
    console.error("Error in convertToQuotation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to convert estimation to quotation",
      error: error.message,
    });
  }
};

module.exports = {
  getEstimations,
  getEstimationById,
  createEstimation,
  updateEstimation,
  deleteEstimation,
  getMaterials,
  calculateBOQ,
  convertToQuotation,
};
