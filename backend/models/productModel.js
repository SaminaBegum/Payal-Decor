const crypto = require("crypto");
const pool = require("../config/db");

/**
 * Generate cryptographically secure unique ID
 */
function generateId(prefix = "prd") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Normalizes database rows to frontend camelCase and snake_case properties
 */
function formatProductRow(row) {
  if (!row) return null;
  const pPrice = parseFloat(row.price || 0);
  const cPrice = parseFloat(row.cost_price || 0);
  const gst = parseFloat(row.gst_rate || 18);

  return {
    id: row.id,
    name: row.name || "",
    code: row.code || "",
    sku: row.sku || row.code || "",
    category: row.category || "General",
    description: row.description || "",
    unit: row.unit || "NOS",
    price: pPrice,
    costPrice: cPrice,
    cost_price: cPrice,
    hsnCode: row.hsn_code || "9403",
    hsn_code: row.hsn_code || "9403",
    gstRate: gst,
    gst_rate: gst,
    dimensions: row.dimensions || "",
    status: row.status || "Active",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Whitelist dictionary mapping for SQL sort columns (CodeQL safe)
 */
const SORT_COLUMNS = {
  name: "name",
  code: "code",
  sku: "sku",
  category: "category",
  price: "price",
  unit: "unit",
  status: "status",
  created_at: "created_at",
  updated_at: "updated_at"
};

/**
 * Retrieve all products with optional search, category, status, and sorting filters
 */
async function getAllProducts(filters = {}) {
  const { search, category, status, sortBy = "created_at", sortOrder = "DESC" } = filters;
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const pIdx = params.length;
    conditions.push(`(
      LOWER(p.name) LIKE $${pIdx} OR 
      LOWER(p.code) LIKE $${pIdx} OR 
      LOWER(p.sku) LIKE $${pIdx} OR 
      LOWER(p.category) LIKE $${pIdx} OR 
      LOWER(COALESCE(p.description, '')) LIKE $${pIdx} OR 
      LOWER(COALESCE(p.dimensions, '')) LIKE $${pIdx}
    )`);
  }

  if (category && category !== "All" && category.trim()) {
    params.push(category.trim());
    conditions.push(`p.category = $${params.length}`);
  }

  if (status && status !== "All" && status.trim()) {
    params.push(status.trim());
    conditions.push(`p.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeSort = SORT_COLUMNS[sortBy] || "created_at";
  const safeOrder = sortOrder && String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const query = `
    SELECT 
      p.id, p.name, p.code, p.sku, p.category, p.description, p.unit,
      p.price, p.cost_price, p.hsn_code, p.gst_rate, p.dimensions, p.status,
      p.created_at, p.updated_at
    FROM public.products p
    ${whereClause}
    ORDER BY p.${safeSort} ${safeOrder};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM public.products p
    ${whereClause};
  `;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params)
  ]);

  return {
    products: rowsResult.rows.map(formatProductRow),
    total: parseInt(countResult.rows[0].total, 10)
  };
}

/**
 * Retrieve a single product by ID
 */
async function getProductById(id) {
  const query = `
    SELECT * FROM public.products WHERE id = $1 LIMIT 1;
  `;
  const result = await pool.query(query, [id]);
  return formatProductRow(result.rows[0]);
}

/**
 * Retrieve a product by Code / SKU
 */
async function getProductByCode(code) {
  const query = `
    SELECT * FROM public.products WHERE code = $1 OR sku = $1 LIMIT 1;
  `;
  const result = await pool.query(query, [code]);
  return formatProductRow(result.rows[0]);
}

/**
 * Auto-generate next sequential SKU for a given category
 */
async function generateNextSku(category = "General") {
  const cat = String(category).toLowerCase();
  let prefix = "PD-PRD-";
  if (cat.includes("kitchen")) prefix = "PD-KT-";
  else if (cat.includes("wardrobe")) prefix = "PD-WD-";
  else if (cat.includes("living") || cat.includes("tv")) prefix = "PD-LV-";
  else if (cat.includes("office") || cat.includes("desk")) prefix = "PD-OF-";
  else if (cat.includes("vanity") || cat.includes("vanities")) prefix = "PD-VN-";
  else if (cat.includes("panel") || cat.includes("partition")) prefix = "PD-PN-";

  const query = `
    SELECT sku FROM public.products 
    WHERE sku LIKE $1 
    ORDER BY id DESC LIMIT 10;
  `;
  const result = await pool.query(query, [`${prefix}%`]);

  let maxNum = 0;
  for (const row of result.rows) {
    const match = String(row.sku).match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextSeq = maxNum + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

/**
 * Create a new product
 */
async function createProduct(data) {
  const id = data.id || generateId("prd");
  const name = String(data.name || "").trim();
  const code = String(data.code || data.sku || "").trim();
  const sku = String(data.sku || data.code || "").trim();
  const category = String(data.category || "General").trim();
  const description = data.description || null;
  const unit = String(data.unit || "NOS").trim().toUpperCase();
  const price = parseFloat(data.price || 0);
  const costPrice = parseFloat(data.costPrice || data.cost_price || 0);
  const hsnCode = String(data.hsnCode || data.hsn_code || "9403").trim();
  const gstRate = parseFloat(data.gstRate || data.gst_rate || 18);
  const dimensions = data.dimensions ? String(data.dimensions).trim() : null;
  const status = data.status || "Active";

  const query = `
    INSERT INTO public.products (
      id, name, code, sku, category, description, unit, price, cost_price,
      hsn_code, gst_rate, dimensions, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    id, name, code, sku, category, description, unit, price, costPrice,
    hsnCode, gstRate, dimensions, status
  ];

  const result = await pool.query(query, values);
  return formatProductRow(result.rows[0]);
}

/**
 * Update an existing product
 */
async function updateProduct(id, data) {
  const existing = await getProductById(id);
  if (!existing) return null;

  const name = data.name !== undefined ? String(data.name).trim() : existing.name;
  const code = data.code !== undefined ? String(data.code).trim() : existing.code;
  const sku = data.sku !== undefined ? String(data.sku).trim() : (existing.sku || existing.code);
  const category = data.category !== undefined ? String(data.category).trim() : existing.category;
  const description = data.description !== undefined ? data.description : existing.description;
  const unit = data.unit !== undefined ? String(data.unit).trim().toUpperCase() : existing.unit;
  const price = data.price !== undefined ? parseFloat(data.price || 0) : existing.price;
  const costPrice = data.costPrice !== undefined || data.cost_price !== undefined
    ? parseFloat(data.costPrice || data.cost_price || 0)
    : existing.costPrice;
  const hsnCode = data.hsnCode !== undefined || data.hsn_code !== undefined
    ? String(data.hsnCode || data.hsn_code || "9403").trim()
    : existing.hsnCode;
  const gstRate = data.gstRate !== undefined || data.gst_rate !== undefined
    ? parseFloat(data.gstRate || data.gst_rate || 18)
    : existing.gstRate;
  const dimensions = data.dimensions !== undefined ? data.dimensions : existing.dimensions;
  const status = data.status !== undefined ? data.status : existing.status;

  const query = `
    UPDATE public.products
    SET 
      name = $2,
      code = $3,
      sku = $4,
      category = $5,
      description = $6,
      unit = $7,
      price = $8,
      cost_price = $9,
      hsn_code = $10,
      gst_rate = $11,
      dimensions = $12,
      status = $13,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;

  const values = [
    id, name, code, sku, category, description, unit, price, costPrice,
    hsnCode, gstRate, dimensions, status
  ];

  const result = await pool.query(query, values);
  return formatProductRow(result.rows[0]);
}

/**
 * Delete a product
 */
async function deleteProduct(id) {
  const query = `DELETE FROM public.products WHERE id = $1 RETURNING id;`;
  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
}

/**
 * Retrieve aggregate KPI statistics for Product Master
 */
async function getProductStats() {
  const query = `
    SELECT 
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active,
      COUNT(CASE WHEN status != 'Active' THEN 1 END) AS inactive,
      COUNT(DISTINCT category) AS categories_count,
      COALESCE(AVG(price), 0) AS avg_price,
      COALESCE(SUM(price), 0) AS total_catalog_value
    FROM public.products;
  `;

  const catQuery = `
    SELECT category, COUNT(*) AS count
    FROM public.products
    GROUP BY category
    ORDER BY count DESC, category ASC;
  `;

  const [statsRes, catRes] = await Promise.all([
    pool.query(query),
    pool.query(catQuery)
  ]);

  const row = statsRes.rows[0] || {};
  return {
    total: parseInt(row.total || 0, 10),
    active: parseInt(row.active || 0, 10),
    inactive: parseInt(row.inactive || 0, 10),
    categoriesCount: parseInt(row.categories_count || 0, 10),
    avgPrice: Math.round(parseFloat(row.avg_price || 0)),
    totalCatalogValue: Math.round(parseFloat(row.total_catalog_value || 0)),
    categories: catRes.rows.map((r) => ({
      name: r.category,
      count: parseInt(r.count, 10)
    }))
  };
}

module.exports = {
  generateId,
  generateNextSku,
  getAllProducts,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
};
