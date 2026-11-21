const pool = require("../config/db");
const crypto = require("crypto");

/**
 * Generate next quotation number in format QT-YYYY-YY/XXX (e.g., QT-2026-27/001)
 */
const getNextQuotationNo = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = (year + 1).toString().slice(-2);
  const prefix = `QT-${year}-${nextYear}/`;

  try {
    const result = await pool.query(
      `SELECT "quotationNo" FROM public.quotations 
       WHERE "quotationNo" LIKE $1 
       ORDER BY "createdAt" DESC, "quotationNo" DESC 
       LIMIT 1`,
      [`${prefix}%`]
    );

    if (result.rows.length === 0) {
      // Check any quotation numbers
      const fallback = await pool.query(
        `SELECT "quotationNo" FROM public.quotations 
         WHERE "quotationNo" LIKE 'QT-%' 
         ORDER BY "createdAt" DESC LIMIT 1`
      );

      if (fallback.rows.length > 0) {
        const lastNo = fallback.rows[0].quotationNo || "";
        const parts = lastNo.split("/");
        if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
          const nextSeq = (parseInt(parts[1], 10) + 1).toString().padStart(3, "0");
          return `${prefix}${nextSeq}`;
        }
      }
      return `${prefix}001`;
    }

    const lastNo = result.rows[0].quotationNo;
    const parts = lastNo.split("/");
    const seq = parseInt(parts[1], 10) || 0;
    const nextSeq = (seq + 1).toString().padStart(3, "0");
    return `${prefix}${nextSeq}`;
  } catch (error) {
    console.error("Error generating next quotationNo:", error);
    return `QT-${year}-${nextYear}/${crypto.randomInt(100, 1000)}`;
  }
};

/**
 * Fetch all quotations with their line items
 */
const getAllQuotations = async (filters = {}) => {
  const { search, status } = filters;
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term);
    const idx = params.length;
    conditions.push(`(
      LOWER(q."quotationNo") LIKE $${idx} OR
      LOWER(q."customerName") LIKE $${idx} OR
      LOWER(COALESCE(q."projectName", '')) LIKE $${idx} OR
      LOWER(COALESCE(q."customerAddress", '')) LIKE $${idx} OR
      LOWER(COALESCE(q."notes", '')) LIKE $${idx}
    )`);
  }

  if (status && status !== "All" && status !== "ALL") {
    params.push(status.trim());
    conditions.push(`q.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      q.id,
      q."quotationNo",
      q."customerId",
      q."customerName",
      q."customerAddress",
      q."projectName",
      q."estimateId",
      q."quotationDate",
      q."validUntil",
      q.status,
      q."gstRate",
      q."placeOfSupply",
      q.terms,
      q.notes,
      q.subtotal,
      q."gstAmount",
      q."grandTotal",
      q."createdAt",
      q."updatedAt",
      COUNT(qi.id) AS "itemCount",
      COALESCE(
        json_agg(
          json_build_object(
            'id', qi.id,
            'quotationId', qi."quotationId",
            'itemName', qi."itemName",
            'description', qi.description,
            'hsn', qi.hsn,
            'sizes', qi.sizes,
            'quantity', qi.quantity,
            'unit', qi.unit,
            'rate', qi.rate,
            'amount', qi.amount
          ) ORDER BY qi.id
        ) FILTER (WHERE qi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM public.quotations q
    LEFT JOIN public.quotation_items qi ON q.id = qi."quotationId"
    ${whereClause}
    GROUP BY q.id
    ORDER BY q."createdAt" DESC;
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Fetch a single quotation by ID with its line items
 */
const getQuotationById = async (id) => {
  const query = `
    SELECT 
      q.id,
      q."quotationNo",
      q."customerId",
      q."customerName",
      q."customerAddress",
      q."projectName",
      q."estimateId",
      q."quotationDate",
      q."validUntil",
      q.status,
      q."gstRate",
      q."placeOfSupply",
      q.terms,
      q.notes,
      q.subtotal,
      q."gstAmount",
      q."grandTotal",
      q."createdAt",
      q."updatedAt",
      COALESCE(
        json_agg(
          json_build_object(
            'id', qi.id,
            'quotationId', qi."quotationId",
            'itemName', qi."itemName",
            'description', qi.description,
            'hsn', qi.hsn,
            'sizes', qi.sizes,
            'quantity', qi.quantity,
            'unit', qi.unit,
            'rate', qi.rate,
            'amount', qi.amount
          ) ORDER BY qi.id
        ) FILTER (WHERE qi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM public.quotations q
    LEFT JOIN public.quotation_items qi ON q.id = qi."quotationId"
    WHERE q.id = $1
    GROUP BY q.id;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Create a new quotation with line items in an atomic transaction
 */
const createQuotation = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const id = data.id || crypto.randomUUID();
    const quotationNo = data.quotationNo || (await getNextQuotationNo());
    const customerId = data.customerId || null;
    const customerName = data.customerName;
    const customerAddress = data.customerAddress || null;
    const projectName = data.projectName || "Modular Interior Project";
    const estimateId = data.estimateId || null;
    const quotationDate = data.quotationDate ? new Date(data.quotationDate) : new Date();
    const validUntil = data.validUntil ? new Date(data.validUntil) : null;
    const status = data.status || "Draft";
    const gstRate = Number(data.gstRate != null ? data.gstRate : 18);
    const placeOfSupply = data.placeOfSupply || "27-Maharashtra";
    const notes = data.notes || null;
    const terms = Array.isArray(data.terms) ? JSON.stringify(data.terms) : JSON.stringify([]);

    // Calculate totals from items if not provided or to ensure math accuracy
    const rawItems = Array.isArray(data.items) ? data.items : [];
    let subtotal = 0;

    const preparedItems = rawItems.map((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const rate = Number(item.rate ?? item.price ?? 0);
      const amount = Number((qty * rate).toFixed(2));
      subtotal += amount;

      return {
        id: item.id || crypto.randomUUID(),
        quotationId: id,
        itemName: item.itemName ?? item.name ?? "Item",
        description: item.description || null,
        hsn: item.hsn || "9403",
        sizes: item.sizes || null,
        quantity: qty,
        unit: item.unit || "Nos",
        rate: rate,
        amount: amount,
      };
    });

    const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
    const rawTotal = subtotal + gstAmount;
    const grandTotal = Math.round(rawTotal);

    const insertQuotationQuery = `
      INSERT INTO public.quotations (
        id,
        "quotationNo",
        "customerId",
        "customerName",
        "customerAddress",
        "projectName",
        "estimateId",
        "quotationDate",
        "validUntil",
        status,
        "gstRate",
        "placeOfSupply",
        terms,
        notes,
        subtotal,
        "gstAmount",
        "grandTotal",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
      )
      RETURNING *;
    `;

    const qResult = await client.query(insertQuotationQuery, [
      id,
      quotationNo,
      customerId,
      customerName,
      customerAddress,
      projectName,
      estimateId,
      quotationDate,
      validUntil,
      status,
      gstRate,
      placeOfSupply,
      terms,
      notes,
      subtotal,
      gstAmount,
      grandTotal,
    ]);

    // Insert line items
    if (preparedItems.length > 0) {
      for (const item of preparedItems) {
        await client.query(
          `INSERT INTO public.quotation_items (
            id,
            "quotationId",
            "itemName",
            description,
            quantity,
            unit,
            rate,
            amount,
            hsn,
            sizes,
            "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            item.id,
            id,
            item.itemName,
            item.description,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
            item.hsn,
            item.sizes,
          ]
        );
      }
    }

    await client.query("COMMIT");

    const created = qResult.rows[0];
    created.items = preparedItems;
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating quotation in transaction:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update an existing quotation and its items in an atomic transaction
 */
const updateQuotation = async (id, data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if quotation exists
    const checkRes = await client.query(`SELECT id FROM public.quotations WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      throw new Error(`Quotation #${id} not found to update`);
    }

    const customerId = data.customerId || null;
    const customerName = data.customerName;
    const customerAddress = data.customerAddress || null;
    const projectName = data.projectName || "Modular Interior Project";
    const estimateId = data.estimateId || null;
    const quotationDate = data.quotationDate ? new Date(data.quotationDate) : new Date();
    const validUntil = data.validUntil ? new Date(data.validUntil) : null;
    const status = data.status || "Draft";
    const gstRate = Number(data.gstRate != null ? data.gstRate : 18);
    const placeOfSupply = data.placeOfSupply || "27-Maharashtra";
    const notes = data.notes || null;
    const terms = Array.isArray(data.terms) ? JSON.stringify(data.terms) : undefined;

    // Recalculate totals from items
    const rawItems = Array.isArray(data.items) ? data.items : [];
    let subtotal = 0;

    const preparedItems = rawItems.map((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const rate = Number(item.rate ?? item.price ?? 0);
      const amount = Number((qty * rate).toFixed(2));
      subtotal += amount;

      return {
        id: item.id || crypto.randomUUID(),
        quotationId: id,
        itemName: item.itemName ?? item.name ?? "Item",
        description: item.description || null,
        hsn: item.hsn || "9403",
        sizes: item.sizes || null,
        quantity: qty,
        unit: item.unit || "Nos",
        rate: rate,
        amount: amount,
      };
    });

    const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
    const rawTotal = subtotal + gstAmount;
    const grandTotal = Math.round(rawTotal);

    const updateQuery = `
      UPDATE public.quotations
      SET
        "customerId" = COALESCE($1, "customerId"),
        "customerName" = COALESCE($2, "customerName"),
        "customerAddress" = $3,
        "projectName" = COALESCE($4, "projectName"),
        "estimateId" = $5,
        "quotationDate" = COALESCE($6, "quotationDate"),
        "validUntil" = $7,
        status = COALESCE($8, status),
        "gstRate" = COALESCE($9, "gstRate"),
        "placeOfSupply" = COALESCE($10, "placeOfSupply"),
        terms = COALESCE($11, terms),
        notes = $12,
        subtotal = $13,
        "gstAmount" = $14,
        "grandTotal" = $15,
        "updatedAt" = NOW()
      WHERE id = $16
      RETURNING *;
    `;

    const uResult = await client.query(updateQuery, [
      customerId,
      customerName,
      customerAddress,
      projectName,
      estimateId,
      quotationDate,
      validUntil,
      status,
      gstRate,
      placeOfSupply,
      terms,
      notes,
      subtotal,
      gstAmount,
      grandTotal,
      id,
    ]);

    // Replace items
    await client.query(`DELETE FROM public.quotation_items WHERE "quotationId" = $1`, [id]);

    if (preparedItems.length > 0) {
      for (const item of preparedItems) {
        await client.query(
          `INSERT INTO public.quotation_items (
            id,
            "quotationId",
            "itemName",
            description,
            quantity,
            unit,
            rate,
            amount,
            hsn,
            sizes,
            "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            item.id,
            id,
            item.itemName,
            item.description,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
            item.hsn,
            item.sizes,
          ]
        );
      }
    }

    await client.query("COMMIT");

    const updated = uResult.rows[0];
    updated.items = preparedItems;
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating quotation in transaction:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete a quotation and its line items
 */
const deleteQuotation = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM public.quotation_items WHERE "quotationId" = $1`, [id]);
    const res = await client.query(`DELETE FROM public.quotations WHERE id = $1 RETURNING id, "quotationNo"`, [id]);
    await client.query("COMMIT");

    return res.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting quotation:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create a formal quotation directly from a saved Estimate ID
 * Supports both public.estimations (Studio) and public.estimate_documents (Document)
 */
const createFromEstimate = async (estimateId) => {
  // 1. Try public.estimations first
  const studioEst = await pool.query(
    `SELECT e.*, 
       COALESCE(
         json_agg(
           json_build_object(
             'itemName', ei."itemName",
             'description', ei.description,
             'lengthMm', ei."lengthMm",
             'widthMm', ei."widthMm",
             'heightMm', ei."heightMm",
             'quantity', ei.quantity,
             'unit', ei.unit,
             'unitSellingPrice', ei."unitSellingPrice",
             'totalSellingPrice', ei."totalSellingPrice"
           )
         ) FILTER (WHERE ei.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM public.estimations e
     LEFT JOIN public.estimation_items ei ON e.id = ei."estimationId"
     WHERE e.id = $1 OR e."estimationNumber" = $1
     GROUP BY e.id`,
    [estimateId]
  );

  if (studioEst.rows.length > 0) {
    const est = studioEst.rows[0];
    const items = (est.items || []).map((i) => ({
      itemName: i.itemName || "Modular Assembly",
      description: i.description || (i.lengthMm ? `Size: ${i.lengthMm} x ${i.widthMm} x ${i.heightMm} mm` : ""),
      hsn: "9403",
      sizes: i.lengthMm ? `${i.lengthMm}x${i.widthMm}x${i.heightMm}` : "",
      quantity: Number(i.quantity || 1),
      unit: i.unit || "Nos",
      rate: Number(i.unitSellingPrice || 0),
      amount: Number(i.totalSellingPrice || 0),
    }));

    return createQuotation({
      estimateId: est.id,
      customerName: est.customerName || "Valued Client",
      projectName: est.projectName || "Modular Interior Project",
      placeOfSupply: est.placeOfSupply || "27-Maharashtra",
      gstRate: Number(est.taxRate || 18),
      notes: est.notes || null,
      status: "Draft",
      items,
      terms: [
        "Goods Once Sold will not be taken return.",
        "Quotation Valid For 30 days.",
        "Payment Term-50% Advance and 50% Before Dispatch.",
        "Mathadi Extra If Applicable",
        "Delivery Period - 25-35 Days",
        "Transport At Actual",
      ],
    });
  }

  // 2. Try public.estimate_documents
  const docEst = await pool.query(
    `SELECT * FROM public.estimate_documents WHERE id = $1 OR "estimateNo" = $1`,
    [estimateId]
  );

  if (docEst.rows.length > 0) {
    const doc = docEst.rows[0];
    const rawItems = Array.isArray(doc.items) ? doc.items : [];
    const items = rawItems.map((i) => ({
      itemName: i.name || i.itemName || "Custom Furniture",
      description: i.description || "",
      hsn: i.hsn || "9403",
      sizes: i.sizes || "",
      quantity: Number(i.qty || i.quantity || 1),
      unit: i.unit || "Nos",
      rate: Number(i.price || i.rate || 0),
      amount: Number(((Number(i.qty || 1)) * (Number(i.price || 0))).toFixed(2)),
    }));

    return createQuotation({
      estimateId: doc.id,
      customerName: doc.customerName || "Valued Client",
      customerAddress: doc.customerAddress || null,
      projectName: doc.projectName || "Modular Project",
      placeOfSupply: doc.placeOfSupply || "27-Maharashtra",
      gstRate: Number(doc.taxRate || 18),
      status: "Draft",
      items,
      terms: Array.isArray(doc.terms) ? doc.terms : [
        "Goods Once Sold will not be taken return.",
        "Quotation Valid For 30 days.",
        "Payment Term-50% Advance and 50% Before Dispatch.",
        "Mathadi Extra If Applicable",
        "Delivery Period - 25-35 Days",
        "Transport At Actual",
      ],
    });
  }

  throw new Error(`Estimate with ID or number "${estimateId}" was not found in saved estimates`);
};

module.exports = {
  getNextQuotationNo,
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  createFromEstimate,
};
