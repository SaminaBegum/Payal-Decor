const crmModel = require("../models/crmModel");
const customerModel = require("../models/customerModel");

const getAllLeads = async (filters) => {
  return await crmModel.getAllLeads(filters);
};

const getLeadById = async (id) => {
  return await crmModel.getLeadById(id);
};

const createLead = async (leadData) => {
  return await crmModel.createLead(leadData);
};

const updateLead = async (id, leadData) => {
  return await crmModel.updateLead(id, leadData);
};

const deleteLead = async (id) => {
  return await crmModel.deleteLead(id);
};

const syncLeads = async (leadsArray) => {
  return await crmModel.syncLeads(leadsArray);
};

const getCustomers = async () => {
  return await customerModel.getAllCustomers();
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
  getCustomers,
};
