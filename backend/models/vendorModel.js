const crypto = require("crypto");
const pool = require("../config/db");

/**
 * Generate a secure CUID-style unique ID
 */
function generateId() {
  return "cmv" + crypto.randomBytes(12).toString("hex");
}

/**
 * Get all vendors with optional search, category, and status filtering
 */
async function getAllVendors(filters = {}) {
  const { search, category, status, sortBy = "createdAt", sortOrder = "DESC" } = filters;
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const pIdx = params.length;
    conditions.push(`(
      LOWER(name) LIKE $${pIdx} OR 
      LOWER(company) LIKE $${pIdx} OR 
      LOWER(phone) LIKE $${pIdx} OR 
      LOWER(email) LIKE $${pIdx} OR 
      LOWER(city) LIKE $${pIdx} OR 
      LOWER(category) LIKE $${pIdx} OR 
      LOWER(gstin) LIKE $${pIdx} OR 
      LOWER("contactPerson") LIKE $${pIdx}
    )`);
  }

  if (category && category !== "All" && category.trim()) {
    params.push(category.trim());
    conditions.push(`category = $${params.length}`);
  }

  if (status && status !== "All" && status.trim()) {
    params.push(status.trim());
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Whitelist sort fields to prevent SQL injection
  const allowedSortFields = ["name", "company", "category", "city", "status", "createdAt", "updatedAt"];
  const safeSort = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeOrder = sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const query = `
    SELECT 
      id, name, company, phone, email, category, city, status, 
      gstin, address, state, pincode, "contactPerson", notes, 
      "createdAt", "updatedAt"
    FROM public."Vendor"
    ${whereClause}
    ORDER BY "${safeSort}" ${safeOrder};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total 
    FROM public."Vendor"
    ${whereClause};
  `;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params)
  ]);

  return {
    vendors: rowsResult.rows,
    total: parseInt(countResult.rows[0].total, 10)
  };
}

/**
 * Get vendor by ID
 */
async function getVendorById(id) {
  const res = await pool.query(
    `SELECT 
      id, name, company, phone, email, category, city, status, 
      gstin, address, state, pincode, "contactPerson", notes, 
      "createdAt", "updatedAt"
     FROM public."Vendor" 
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Create a new vendor
 */
async function createVendor(data) {
  const id = generateId();
  const name = String(data.name || "").trim();
  const company = String(data.company || "").trim();
  const phone = String(data.phone || "").trim();
  const email = String(data.email || "").trim();
  const category = String(data.category || "Other").trim();
  const city = String(data.city || "").trim();
  const status = String(data.status || "Active").trim();
  const gstin = String(data.gstin || "").trim();
  const address = String(data.address || "").trim();
  const state = String(data.state || "").trim();
  const pincode = String(data.pincode || "").trim();
  const contactPerson = String(data.contactPerson || "").trim();
  const notes = String(data.notes || "").trim();

  const query = `
    INSERT INTO public."Vendor" (
      id, name, company, phone, email, category, city, status,
      gstin, address, state, pincode, "contactPerson", notes,
      "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING 
      id, name, company, phone, email, category, city, status, 
      gstin, address, state, pincode, "contactPerson", notes, 
      "createdAt", "updatedAt";
  `;

  const values = [
    id, name, company, phone, email, category, city, status,
    gstin, address, state, pincode, contactPerson, notes
  ];

  const res = await pool.query(query, values);
  return res.rows[0];
}

/**
 * Update an existing vendor
 */
async function updateVendor(id, data) {
  const name = String(data.name || "").trim();
  const company = String(data.company || "").trim();
  const phone = String(data.phone || "").trim();
  const email = String(data.email || "").trim();
  const category = String(data.category || "Other").trim();
  const city = String(data.city || "").trim();
  const status = String(data.status || "Active").trim();
  const gstin = String(data.gstin || "").trim();
  const address = String(data.address || "").trim();
  const state = String(data.state || "").trim();
  const pincode = String(data.pincode || "").trim();
  const contactPerson = String(data.contactPerson || "").trim();
  const notes = String(data.notes || "").trim();

  const query = `
    UPDATE public."Vendor"
    SET 
      name = $2,
      company = $3,
      phone = $4,
      email = $5,
      category = $6,
      city = $7,
      status = $8,
      gstin = $9,
      address = $10,
      state = $11,
      pincode = $12,
      "contactPerson" = $13,
      notes = $14,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id, name, company, phone, email, category, city, status, 
      gstin, address, state, pincode, "contactPerson", notes, 
      "createdAt", "updatedAt";
  `;

  const values = [
    id, name, company, phone, email, category, city, status,
    gstin, address, state, pincode, contactPerson, notes
  ];

  const res = await pool.query(query, values);
  return res.rows[0] || null;
}

/**
 * Delete a vendor
 */
async function deleteVendor(id) {
  const res = await pool.query(
    `DELETE FROM public."Vendor" WHERE id = $1 RETURNING id`,
    [id]
  );
  return res.rowCount > 0;
}

/**
 * Get all available categories (from vendor_categories and existing vendors)
 */
async function getCategories() {
  const res = await pool.query(`
    SELECT DISTINCT name FROM (
      SELECT name FROM public.vendor_categories
      UNION
      SELECT DISTINCT category AS name FROM public."Vendor" WHERE category IS NOT NULL AND category != ''
    ) combined
    ORDER BY name ASC;
  `);
  return res.rows.map(r => r.name);
}

/**
 * Add a new vendor category
 */
async function addCategory(name, description = "") {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new Error("Category name is required");
  }
  const res = await pool.query(
    `INSERT INTO public.vendor_categories (name, description) 
     VALUES ($1, $2) 
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
     RETURNING id, name, description`,
    [cleanName, description]
  );
  return res.rows[0];
}

/**
 * Bulk import multiple vendors in an atomic transaction
 */
async function bulkImportVendors(vendorsList) {
  if (!Array.isArray(vendorsList) || vendorsList.length === 0) {
    return { insertedCount: 0, failedCount: 0, vendors: [] };
  }

  const client = await pool.connect();
  const inserted = [];
  const errors = [];

  try {
    await client.query("BEGIN");

    for (let i = 0; i < vendorsList.length; i++) {
      const v = vendorsList[i];
      if (!v.name && !v.company) {
        errors.push({ index: i, error: "Name or Company is required" });
        continue;
      }

      const id = generateId();
      const name = String(v.name || v.company || "").trim();
      const company = String(v.company || v.name || "").trim();
      const phone = String(v.phone || "").trim();
      const email = String(v.email || "").trim();
      const category = String(v.category || "Other").trim();
      const city = String(v.city || "").trim();
      const status = String(v.status || "Active").trim();
      const gstin = String(v.gstin || "").trim();
      const address = String(v.address || "").trim();
      const state = String(v.state || "").trim();
      const pincode = String(v.pincode || "").trim();
      const contactPerson = String(v.contactPerson || "").trim();
      const notes = String(v.notes || "").trim();

      const insertRes = await client.query(`
        INSERT INTO public."Vendor" (
          id, name, company, phone, email, category, city, status,
          gstin, address, state, pincode, "contactPerson", notes,
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, name, company, phone, email, category, city, status;
      `, [
        id, name, company, phone, email, category, city, status,
        gstin, address, state, pincode, contactPerson, notes
      ]);

      inserted.push(insertRes.rows[0]);
    }

    await client.query("COMMIT");
    return {
      insertedCount: inserted.length,
      failedCount: errors.length,
      vendors: inserted,
      errors
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get vendor summary metrics / KPIs
 */
async function getVendorStats() {
  const statsRes = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active,
      COUNT(CASE WHEN status = 'Inactive' THEN 1 END) AS inactive,
      COUNT(DISTINCT category) AS "categoryCount",
      COUNT(CASE WHEN gstin IS NOT NULL AND gstin != '' THEN 1 END) AS "gstinCount"
    FROM public."Vendor";
  `);

  const row = statsRes.rows[0] || {};
  return {
    total: parseInt(row.total || 0, 10),
    active: parseInt(row.active || 0, 10),
    inactive: parseInt(row.inactive || 0, 10),
    categoryCount: parseInt(row.categoryCount || 0, 10),
    gstinCount: parseInt(row.gstinCount || 0, 10)
  };
}

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getCategories,
  addCategory,
  bulkImportVendors,
  getVendorStats
};
