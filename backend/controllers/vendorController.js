const vendorModel = require("../models/vendorModel");

/**
 * Controller to list all vendors with search and filters
 */
async function getVendors(req, res) {
  try {
    const { search, category, status, sortBy, sortOrder } = req.query;
    const result = await vendorModel.getAllVendors({
      search,
      category,
      status,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      data: result.vendors,
      vendors: result.vendors,
      total: result.total
    });
  } catch (error) {
    console.error("Error fetching vendors: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message
    });
  }
}

/**
 * Controller to get KPI metrics for vendors
 */
async function getVendorStats(req, res) {
  try {
    const stats = await vendorModel.getVendorStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching vendor stats: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor statistics",
      error: error.message
    });
  }
}

/**
 * Controller to fetch all vendor categories
 */
async function getCategories(req, res) {
  try {
    const categories = await vendorModel.getCategories();
    return res.status(200).json({
      success: true,
      data: categories,
      categories
    });
  } catch (error) {
    console.error("Error fetching categories: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor categories",
      error: error.message
    });
  }
}

/**
 * Controller to add a new category
 */
async function addCategory(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const category = await vendorModel.addCategory(name.trim(), description);
    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      data: category
    });
  } catch (error) {
    console.error("Error adding category: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to add category",
      error: error.message
    });
  }
}

/**
 * Controller to get single vendor by ID
 */
async function getVendorById(req, res) {
  try {
    const { id } = req.params;
    const vendor = await vendorModel.getVendorById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
      vendor
    });
  } catch (error) {
    console.error("Error fetching vendor by id (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor",
      error: error.message
    });
  }
}

/**
 * Controller to create a new vendor
 */
async function createVendor(req, res) {
  try {
    const { name, company, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vendor Name is required"
      });
    }

    if (!company || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company Name is required"
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const newVendor = await vendorModel.createVendor(req.body);

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: newVendor,
      vendor: newVendor
    });
  } catch (error) {
    console.error("Error creating vendor: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to create vendor",
      error: error.message
    });
  }
}

/**
 * Controller to update an existing vendor
 */
async function updateVendor(req, res) {
  try {
    const { id } = req.params;
    const existing = await vendorModel.getVendorById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    const updated = await vendorModel.updateVendor(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: updated,
      vendor: updated
    });
  } catch (error) {
    console.error("Error updating vendor (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update vendor",
      error: error.message
    });
  }
}

/**
 * Controller to delete a vendor
 */
async function deleteVendor(req, res) {
  try {
    const { id } = req.params;
    const deleted = await vendorModel.deleteVendor(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting vendor (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message
    });
  }
}

/**
 * Controller to bulk import vendors from CSV or JSON array
 */
async function bulkImportVendors(req, res) {
  try {
    const { vendors } = req.body;
    if (!Array.isArray(vendors) || vendors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "An array of vendor objects is required for bulk import"
      });
    }

    const result = await vendorModel.bulkImportVendors(vendors);

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${result.insertedCount} vendors`,
      data: result
    });
  } catch (error) {
    console.error("Error bulk importing vendors: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk import vendors",
      error: error.message
    });
  }
}

module.exports = {
  getVendors,
  getVendorStats,
  getCategories,
  addCategory,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  bulkImportVendors
};
