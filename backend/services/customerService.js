const customerModel = require("../models/customerModel");

const getAllCustomers = async () => {
  return await customerModel.getAllCustomers();
};

const getCustomerById = async (id) => {
  return await customerModel.getCustomerById(id);
};

module.exports = {
  getAllCustomers,
  getCustomerById,
};
