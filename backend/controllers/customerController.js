const customerService = require("../services/customerService");

const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
      customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID "${id}" not found`,
      });
    }
    return res.status(200).json({
      success: true,
      data: customer,
      customer,
    });
  } catch (error) {
    console.error("Error fetching customer by id:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
};
