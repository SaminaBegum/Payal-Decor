const crypto = require("crypto");
const pool = require("../config/db");

/**
 * Generate next estimate number in format YYYY-YY/XXX (e.g., 2026-27/049)
 */
const getNextEstimateNo = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = (year + 1).toString().slice(-2);
  const prefix = `${year}-${nextYear}/`;

  try {
    const result = await pool.query(
      `SELECT "estimateNo" FROM public.estimate_documents 
       WHERE "estimateNo" LIKE $1 
       ORDER BY "createdAt" DESC, "estimateNo" DESC 
       LIMIT 1`,
      [`${prefix}%`]
    );

    if (result.rows.length === 0) {
      // Also check highest number regardless of year
      const fallbackResult = await pool.query(
        `SELECT "estimateNo" FROM public.estimate_documents 
         ORDER BY "createdAt" DESC LIMIT 1`
      );
      if (fallbackResult.rows.length > 0) {
        const lastNo = fallbackResult.rows[0].estimateNo || "";
        const parts = lastNo.split("/");
        if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
          const nextSeq = (parseInt(parts[1], 10) + 1).toString().padStart(3, "0");
          return `${prefix}${nextSeq}`;
        }
      }
      return `${prefix}001`;
    }

    const lastNo = result.rows[0].estimateNo;
    const parts = lastNo.split("/");
    const seq = parseInt(parts[1], 10) || 0;
    const nextSeq = (seq + 1).toString().padStart(3, "0");
    return `${prefix}${nextSeq}`;
  } catch (error) {
    console.error("Error generating next estimateNo:", error);
    return `${prefix}${crypto.randomInt(100, 1000)}`;
  }
};

/**
 * Fetch all saved estimate documents
 */
const getAllEstimateDocs = async () => {
  const query = `
    SELECT 
      id,
      "estimateNo",
      "estimateDate",
      "customerId",
      "customerName",
      "customerAddress",
      "projectName",
      "placeOfSupply",
      items,
      "taxRate",
      "subTotal",
      "taxAmount",
      "roundOff",
      total,
      terms,
      status,
      "createdAt",
      "updatedAt"
    FROM public.estimate_documents
    ORDER BY "createdAt" DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Fetch single estimate document by ID
 */
const getEstimateDocById = async (id) => {
  const query = `
    SELECT *
    FROM public.estimate_documents
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Create a new estimate document
 */
const createEstimateDoc = async (data) => {
  const {
    customerId = null,
    customerName,
    customerAddress = null,
    projectName = null,
    placeOfSupply = "27-Maharashtra",
    estimateDate = new Date().toISOString(),
    items = [],
    taxRate = 18,
    terms = [],
    status = "Draft",
  } = data;

  const id = `estdoc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const estimateNo = data.estimateNo || (await getNextEstimateNo());

  // Calculate totals
  const subTotal = items.reduce(
    (sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)),
    0
  );
  const taxAmount = (subTotal * Number(taxRate)) / 100;
  const rawTotal = subTotal + taxAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const query = `
    INSERT INTO public.estimate_documents (
      id,
      "estimateNo",
      "estimateDate",
      "customerId",
      "customerName",
      "customerAddress",
      "projectName",
      "placeOfSupply",
      items,
      "taxRate",
      "subTotal",
      "taxAmount",
      "roundOff",
      total,
      terms,
      status,
      "createdAt",
      "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
    )
    RETURNING *
  `;

  const values = [
    id,
    estimateNo,
    estimateDate,
    customerId || null,
    customerName,
    customerAddress || null,
    projectName || null,
    placeOfSupply,
    JSON.stringify(items),
    Number(taxRate),
    Number(subTotal.toFixed(2)),
    Number(taxAmount.toFixed(2)),
    roundOff,
    Number(total.toFixed(2)),
    JSON.stringify(terms),
    status,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Update an existing estimate document
 */
const updateEstimateDoc = async (id, data) => {
  const {
    customerId = null,
    customerName,
    customerAddress = null,
    projectName = null,
    placeOfSupply = "27-Maharashtra",
    estimateDate,
    items = [],
    taxRate = 18,
    terms = [],
    status,
  } = data;

  // Calculate totals
  const subTotal = items.reduce(
    (sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)),
    0
  );
  const taxAmount = (subTotal * Number(taxRate)) / 100;
  const rawTotal = subTotal + taxAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const query = `
    UPDATE public.estimate_documents
    SET
      "customerId" = COALESCE($1, "customerId"),
      "customerName" = COALESCE($2, "customerName"),
      "customerAddress" = $3,
      "projectName" = $4,
      "placeOfSupply" = COALESCE($5, "placeOfSupply"),
      "estimateDate" = COALESCE($6, "estimateDate"),
      items = $7,
      "taxRate" = $8,
      "subTotal" = $9,
      "taxAmount" = $10,
      "roundOff" = $11,
      total = $12,
      terms = $13,
      status = COALESCE($14, status),
      "updatedAt" = NOW()
    WHERE id = $15
    RETURNING *
  `;

  const values = [
    customerId || null,
    customerName,
    customerAddress || null,
    projectName || null,
    placeOfSupply,
    estimateDate || null,
    JSON.stringify(items),
    Number(taxRate),
    Number(subTotal.toFixed(2)),
    Number(taxAmount.toFixed(2)),
    roundOff,
    Number(total.toFixed(2)),
    JSON.stringify(terms),
    status || null,
    id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Delete estimate document
 */
const deleteEstimateDoc = async (id) => {
  const query = `DELETE FROM public.estimate_documents WHERE id = $1 RETURNING id, "estimateNo"`;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  getNextEstimateNo,
  getAllEstimateDocs,
  getEstimateDocById,
  createEstimateDoc,
  updateEstimateDoc,
  deleteEstimateDoc,
};
