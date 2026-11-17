const crmService = require("../services/crmService");
const { validateLeadInput } = require("../validators/crmValidator");

/**
 * GET /api/crm and /api/crm/leads
 * Fetch all CRM leads with optional filters
 */
const getLeads = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      locality: req.query.locality,
      genderType: req.query.genderType,
      source: req.query.source,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const leads = await crmService.getAllLeads(filters);

    return res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
      leads, // provides compatibility with different frontend consumers
    });
  } catch (error) {
    console.error("Error in getLeads controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CRM leads",
      error: error.message,
    });
  }
};

/**
 * GET /api/crm/leads/:id and /api/crm/:id
 * Fetch single lead by ID
 */
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await crmService.getLeadById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: `CRM lead with ID "${id}" not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
      lead,
    });
  } catch (error) {
    console.error(`Error in getLeadById (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CRM lead",
      error: error.message,
    });
  }
};

/**
 * POST /api/crm and /api/crm/leads
 * Create a new CRM lead
 */
const createLead = async (req, res) => {
  try {
    const validation = validateLeadInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const createdLead = await crmService.createLead(req.body);

    return res.status(201).json({
      success: true,
      message: "CRM lead registered successfully in database",
      data: createdLead,
      lead: createdLead,
    });
  } catch (error) {
    console.error("Error in createLead controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create CRM lead",
      error: error.message,
    });
  }
};

/**
 * PUT /api/crm/leads/:id and /api/crm/:id
 * Update an existing CRM lead
 */
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateLeadInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const updatedLead = await crmService.updateLead(id, req.body);

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: `CRM lead with ID "${id}" not found to update`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "CRM lead updated successfully in database",
      data: updatedLead,
      lead: updatedLead,
    });
  } catch (error) {
    console.error(`Error in updateLead (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update CRM lead",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/crm/leads/:id and /api/crm/:id
 
 */
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await crmService.deleteLead(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `CRM lead with ID "${id}" not found to delete`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `CRM lead "${deleted.businessName || id}" deleted successfully from database`,
      id: deleted.id,
    });
  } catch (error) {
    console.error(`Error in deleteLead (${req.params.id}):`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete CRM lead",
      error: error.message,
    });
  }
};

/**
 * POST /api/crm/leads/sync and /api/crm/sync
 
 */
const syncLeads = async (req, res) => {
  try {
    const leads = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body.leads)
      ? req.body.leads
      : [];

    const result = await crmService.syncLeads(leads);

    return res.status(200).json({
      success: true,
      message: `Synced ${result.count} leads with database`,
      count: result.count,
      data: result.synced,
    });
  } catch (error) {
    console.error("Error in syncLeads controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sync CRM leads",
      error: error.message,
    });
  }
};

/**
 * GET /api/crm/customers
 */
const getCustomers = async (req, res) => {
  try {
    const customers = await crmService.getCustomers();
    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
      customers,
    });
  } catch (error) {
    console.error("Error in getCustomers controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
  getCustomers,
};
