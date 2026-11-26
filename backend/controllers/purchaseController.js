const purchaseModel = require("../models/purchaseModel");

/**
 * Controller to list all purchase orders
 */
async function getPurchaseOrders(req, res) {
  try {
    const { search, status, vendorId, sortBy, sortOrder } = req.query;
    const result = await purchaseModel.getAllPurchaseOrders({
      search,
      status,
      vendorId,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      data: result.purchaseOrders,
      purchaseOrders: result.purchaseOrders,
      total: result.total
    });
  } catch (error) {
    console.error("Error fetching purchase orders: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase orders",
      error: error.message
    });
  }
}

/**
 * Controller to get aggregate KPI stats
 */
async function getPurchaseStats(req, res) {
  try {
    const stats = await purchaseModel.getPurchaseStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching purchase stats: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase statistics",
      error: error.message
    });
  }
}

/**
 * Controller to generate the next sequential PO number
 */
async function getNextPoNumber(req, res) {
  try {
    const nextNumber = await purchaseModel.generatePoNumber();
    return res.status(200).json({
      success: true,
      data: { poNo: nextNumber },
      poNo: nextNumber
    });
  } catch (error) {
    console.error("Error generating next PO number: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate PO number",
      error: error.message
    });
  }
}

/**
 * Controller to get a single purchase order by ID
 */
async function getPurchaseOrderById(req, res) {
  try {
    const { id } = req.params;
    const po = await purchaseModel.getPurchaseOrderById(id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: po,
      purchaseOrder: po
    });
  } catch (error) {
    console.error("Error fetching purchase order by ID (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order",
      error: error.message
    });
  }
}

/**
 * Controller to create a new purchase order
 */
async function createPurchaseOrder(req, res) {
  try {
    const { vendor, vendorCompany } = req.body;
    const company = vendorCompany || vendor;

    if (!company || !String(company).trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier / Vendor company is required"
      });
    }

    const newPO = await purchaseModel.createPurchaseOrder(req.body);

    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: newPO,
      purchaseOrder: newPO
    });
  } catch (error) {
    console.error("Error creating purchase order: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to create purchase order",
      error: error.message
    });
  }
}

/**
 * Controller to update an existing purchase order
 */
async function updatePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const updated = await purchaseModel.updatePurchaseOrder(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: updated,
      purchaseOrder: updated
    });
  } catch (error) {
    console.error("Error updating purchase order (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update purchase order",
      error: error.message
    });
  }
}

/**
 * Controller to fast update purchase order status (Pending, Approved, Ordered, Received, Cancelled)
 */
async function updatePurchaseStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !String(status).trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required"
      });
    }

    const updated = await purchaseModel.updatePurchaseStatus(id, String(status).trim());

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Purchase order status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    console.error("Error updating purchase status (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update purchase status",
      error: error.message
    });
  }
}

/**
 * Controller to delete a purchase order
 */
async function deletePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const deleted = await purchaseModel.deletePurchaseOrder(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting purchase order (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete purchase order",
      error: error.message
    });
  }
}

module.exports = {
  getPurchaseOrders,
  getPurchaseStats,
  getNextPoNumber,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseStatus,
  deletePurchaseOrder
};
