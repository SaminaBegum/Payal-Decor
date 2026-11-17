const pool = require("../config/db");

/**
 * Fetch all customers from database
 */
const getAllCustomers = async () => {
  const query = `
    SELECT
      id,
      name,
      company,
      phone,
      email,
      location,
      status,
      projects,
      "businessValue",
      gstin,
      address,
      state,
      pincode,
      "contactPerson",
      notes,
      "createdAt",
      "updatedAt"
    FROM public.customers
    ORDER BY "createdAt" DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Get customer by ID
 */
const getCustomerById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      company,
      phone,
      email,
      location,
      status,
      projects,
      "businessValue",
      gstin,
      address,
      state,
      pincode,
      "contactPerson",
      notes,
      "createdAt",
      "updatedAt"
    FROM public.customers
    WHERE id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  getAllCustomers,
  getCustomerById,
};
