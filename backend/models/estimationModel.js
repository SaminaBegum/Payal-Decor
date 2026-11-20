const pool = require("../config/db");

/**
 * Fetch all estimations with optional search & status filter
 */
const getAllEstimations = async (filters = {}) => {
  const { search, customerId, status, limit, offset } = filters;
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const idx = params.length;
    conditions.push(`(
      LOWER("estimationNumber") LIKE $${idx} OR
      LOWER(COALESCE("customerName", '')) LIKE $${idx} OR
      LOWER(COALESCE("projectName", '')) LIKE $${idx} OR
      LOWER(COALESCE("notes", '')) LIKE $${idx}
    )`);
  }

  if (customerId && customerId !== "All") {
    params.push(customerId.trim());
    conditions.push(`"customerId" = $${params.length}`);
  }

  if (status && status !== "All") {
    params.push(status.trim());
    conditions.push(`"status" = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let paginationClause = "";
  if (limit && Number(limit) > 0) {
    params.push(Number(limit));
    paginationClause += ` LIMIT $${params.length}`;
  }
  if (offset && Number(offset) >= 0) {
    params.push(Number(offset));
    paginationClause += ` OFFSET $${params.length}`;
  }

  const query = `
    SELECT
      e.id,
      e."estimationNumber",
      e."customerId",
      e."leadEnquiryId",
      e."siteMeasurementId",
      e."customerName",
      e."projectName",
      e."estimationDate",
      e."validUntil",
      e."totalPrimeCost",
      e."pricingMethod",
      e."markupPercent",
      e."marginPercent",
      e."totalSellingPrice",
      e."taxRate",
      e."taxAmount",
      e."grandTotal",
      e.status,
      e.notes,
      e."placeOfSupply",
      e."createdAt",
      e."updatedAt",
      (SELECT COUNT(*) FROM public.estimation_items ei WHERE ei."estimationId" = e.id) AS "itemCount"
    FROM public.estimations e
    ${whereClause}
    ORDER BY e."createdAt" DESC
    ${paginationClause}
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Fetch a single estimation with full items and exploded BOQ lines
 */
const getEstimationById = async (id) => {
  const queryEst = `
    SELECT *
    FROM public.estimations
    WHERE id = $1
    LIMIT 1
  `;
  const estRes = await pool.query(queryEst, [id]);
  if (estRes.rows.length === 0) return null;

  const estimation = estRes.rows[0];

  // Fetch Items
  const queryItems = `
    SELECT *
    FROM public.estimation_items
    WHERE "estimationId" = $1
    ORDER BY "createdAt" ASC
  `;
  const itemsRes = await pool.query(queryItems, [id]);

  // Fetch BOQ Lines
  const queryBoq = `
    SELECT
      b.*,
      m.name AS "materialName",
      m.code AS "materialCode"
    FROM public.estimation_boq_lines b
    LEFT JOIN public.materials_master m ON b."materialId" = m.id
    WHERE b."estimationId" = $1
    ORDER BY b."createdAt" ASC
  `;
  const boqRes = await pool.query(queryBoq, [id]);

  // Attach BOQ lines to their corresponding items
  const items = itemsRes.rows.map((item) => {
    return {
      ...item,
      boqLines: boqRes.rows.filter((line) => line.estimationItemId === item.id),
    };
  });

  return {
    ...estimation,
    items,
    allBoqLines: boqRes.rows,
  };
};

/**
 * Create a new estimation with items and exploded BOQ in a single atomic transaction
 */
const createEstimation = async (payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const estId = payload.id || `EST-${Date.now()}`;
    const estNumber = payload.estimationNumber || `EST-${Date.now().toString().slice(-8)}`;

    const insertEstQuery = `
      INSERT INTO public.estimations (
        id, "estimationNumber", "customerId", "leadEnquiryId", "siteMeasurementId",
        "customerName", "projectName", "estimationDate", "validUntil",
        "totalPrimeCost", "pricingMethod", "markupPercent", "marginPercent",
        "totalSellingPrice", "taxRate", "taxAmount", "grandTotal",
        status, notes, "placeOfSupply", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const estValues = [
      estId,
      estNumber,
      payload.customerId || null,
      payload.leadEnquiryId || null,
      payload.siteMeasurementId || null,
      payload.customerName || "Untitled Customer",
      payload.projectName || "General Project",
      payload.estimationDate || new Date().toISOString().slice(0, 10),
      payload.validUntil || null,
      Number(payload.totalPrimeCost || 0),
      payload.pricingMethod || "markup",
      Number(payload.markupPercent || 25),
      Number(payload.marginPercent || 20),
      Number(payload.totalSellingPrice || 0),
      Number(payload.taxRate || 18),
      Number(payload.taxAmount || 0),
      Number(payload.grandTotal || 0),
      payload.status || "Draft",
      payload.notes || null,
      payload.placeOfSupply || "27-Maharashtra",
    ];

    const estResult = await client.query(insertEstQuery, estValues);
    const createdEst = estResult.rows[0];

    // Insert Items and their BOQ lines
    const items = Array.isArray(payload.items) ? payload.items : [];
    const insertedItems = [];

    for (const item of items) {
      const itemId = item.id || `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const insertItemQuery = `
        INSERT INTO public.estimation_items (
          id, "estimationId", "itemCode", "itemName", description,
          "lengthMm", "widthMm", "heightMm", unit, quantity,
          "unitSqft", "totalSqft", "wastagePercent", "procurementSqft",
          "edgeBandRft", "sheetsRequired", "edges",
          "materialCost", "hardwareCost", "labourCost", "otherCost",
          "unitPrimeCost", "totalPrimeCost", "unitSellingPrice", "totalSellingPrice",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24, $25,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *;
      `;

      const itemValues = [
        itemId,
        estId,
        item.itemCode || null,
        item.itemName || "Custom Assembly",
        item.description || null,
        Number(item.lengthMm || 0),
        Number(item.widthMm || 0),
        Number(item.heightMm || 0),
        item.unit || "Nos",
        Number(item.quantity || 1),
        Number(item.unitSqft || 0),
        Number(item.totalSqft || 0),
        Number(item.wastagePercent || 8),
        Number(item.procurementSqft || 0),
        Number(item.edgeBandRft || 0),
        Number(item.sheetsRequired || 1),
        JSON.stringify(item.edges || { e1: true, e2: true, e3: true, e4: false }),
        Number(item.materialCost || 0),
        Number(item.hardwareCost || 0),
        Number(item.labourCost || 0),
        Number(item.otherCost || 0),
        Number(item.unitPrimeCost || 0),
        Number(item.totalPrimeCost || 0),
        Number(item.unitSellingPrice || 0),
        Number(item.totalSellingPrice || 0),
      ];

      const itemResult = await client.query(insertItemQuery, itemValues);
      const insertedItem = itemResult.rows[0];

      // Insert BOQ lines for this item
      const boqLines = Array.isArray(item.boqLines) ? item.boqLines : [];
      const insertedBoqLines = [];

      for (const line of boqLines) {
        const lineId = line.id || `BOQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const insertBoqQuery = `
          INSERT INTO public.estimation_boq_lines (
            id, "estimationId", "estimationItemId", "materialId",
            "lineCategory", description, "baseQty", "wastagePercent",
            "procurementQty", unit, "unitCost", "totalCost", "createdAt"
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12, CURRENT_TIMESTAMP
          )
          RETURNING *;
        `;

        const boqValues = [
          lineId,
          estId,
          itemId,
          line.materialId || null,
          line.lineCategory || "Sheet Material",
          line.description || "Material Component",
          Number(line.baseQty || 0),
          Number(line.wastagePercent || 0),
          Number(line.procurementQty || 0),
          line.unit || "Nos",
          Number(line.unitCost || 0),
          Number(line.totalCost || 0),
        ];

        const boqResult = await client.query(insertBoqQuery, boqValues);
        insertedBoqLines.push(boqResult.rows[0]);
      }

      insertedItems.push({
        ...insertedItem,
        boqLines: insertedBoqLines,
      });
    }

    await client.query("COMMIT");

    return {
      ...createdEst,
      items: insertedItems,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update existing estimation
 */
const updateEstimation = async (id, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateEstQuery = `
      UPDATE public.estimations
      SET
        "customerId" = COALESCE($1, "customerId"),
        "leadEnquiryId" = COALESCE($2, "leadEnquiryId"),
        "siteMeasurementId" = COALESCE($3, "siteMeasurementId"),
        "customerName" = COALESCE($4, "customerName"),
        "projectName" = COALESCE($5, "projectName"),
        "estimationDate" = COALESCE($6, "estimationDate"),
        "validUntil" = COALESCE($7, "validUntil"),
        "totalPrimeCost" = COALESCE($8, "totalPrimeCost"),
        "pricingMethod" = COALESCE($9, "pricingMethod"),
        "markupPercent" = COALESCE($10, "markupPercent"),
        "marginPercent" = COALESCE($11, "marginPercent"),
        "totalSellingPrice" = COALESCE($12, "totalSellingPrice"),
        "taxRate" = COALESCE($13, "taxRate"),
        "taxAmount" = COALESCE($14, "taxAmount"),
        "grandTotal" = COALESCE($15, "grandTotal"),
        status = COALESCE($16, status),
        notes = COALESCE($17, notes),
        "placeOfSupply" = COALESCE($18, "placeOfSupply"),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *;
    `;

    const estValues = [
      payload.customerId !== undefined ? payload.customerId : null,
      payload.leadEnquiryId !== undefined ? payload.leadEnquiryId : null,
      payload.siteMeasurementId !== undefined ? payload.siteMeasurementId : null,
      payload.customerName,
      payload.projectName,
      payload.estimationDate,
      payload.validUntil,
      payload.totalPrimeCost !== undefined ? Number(payload.totalPrimeCost) : null,
      payload.pricingMethod,
      payload.markupPercent !== undefined ? Number(payload.markupPercent) : null,
      payload.marginPercent !== undefined ? Number(payload.marginPercent) : null,
      payload.totalSellingPrice !== undefined ? Number(payload.totalSellingPrice) : null,
      payload.taxRate !== undefined ? Number(payload.taxRate) : null,
      payload.taxAmount !== undefined ? Number(payload.taxAmount) : null,
      payload.grandTotal !== undefined ? Number(payload.grandTotal) : null,
      payload.status,
      payload.notes,
      payload.placeOfSupply,
      id,
    ];

    const estRes = await client.query(updateEstQuery, estValues);
    if (estRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // If new items are provided, replace existing items and boq lines
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      await client.query('DELETE FROM public.estimation_items WHERE "estimationId" = $1', [id]);
      await client.query('DELETE FROM public.estimation_boq_lines WHERE "estimationId" = $1', [id]);

      for (const item of payload.items) {
        const itemId = item.id || `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await client.query(`
          INSERT INTO public.estimation_items (
            id, "estimationId", "itemCode", "itemName", description,
            "lengthMm", "widthMm", "heightMm", unit, quantity,
            "unitSqft", "totalSqft", "wastagePercent", "procurementSqft",
            "edgeBandRft", "sheetsRequired", "edges",
            "materialCost", "hardwareCost", "labourCost", "otherCost",
            "unitPrimeCost", "totalPrimeCost", "unitSellingPrice", "totalSellingPrice",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          );
        `, [
          itemId, id, item.itemCode || null, item.itemName || "Assembly Item", item.description || null,
          Number(item.lengthMm || 0), Number(item.widthMm || 0), Number(item.heightMm || 0),
          item.unit || "Nos", Number(item.quantity || 1), Number(item.unitSqft || 0), Number(item.totalSqft || 0),
          Number(item.wastagePercent || 8), Number(item.procurementSqft || 0), Number(item.edgeBandRft || 0),
          Number(item.sheetsRequired || 1), JSON.stringify(item.edges || {}),
          Number(item.materialCost || 0), Number(item.hardwareCost || 0), Number(item.labourCost || 0),
          Number(item.otherCost || 0), Number(item.unitPrimeCost || 0), Number(item.totalPrimeCost || 0),
          Number(item.unitSellingPrice || 0), Number(item.totalSellingPrice || 0)
        ]);

        if (Array.isArray(item.boqLines)) {
          for (const line of item.boqLines) {
            const lineId = line.id || `BOQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            await client.query(`
              INSERT INTO public.estimation_boq_lines (
                id, "estimationId", "estimationItemId", "materialId",
                "lineCategory", description, "baseQty", "wastagePercent",
                "procurementQty", unit, "unitCost", "totalCost", "createdAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP);
            `, [
              lineId, id, itemId, line.materialId || null,
              line.lineCategory || "Sheet Material", line.description || "Component",
              Number(line.baseQty || 0), Number(line.wastagePercent || 0),
              Number(line.procurementQty || 0), line.unit || "Nos",
              Number(line.unitCost || 0), Number(line.totalCost || 0)
            ]);
          }
        }
      }
    }

    await client.query("COMMIT");
    return await getEstimationById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete estimation
 */
const deleteEstimation = async (id) => {
  const query = `
    DELETE FROM public.estimations
    WHERE id = $1
    RETURNING id, "estimationNumber"
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Get all available raw materials from master
 */
const getAllMaterials = async (category = null) => {
  let query = `
    SELECT
      id, code, name, category, unit, rate,
      "defaultWastagePct", "hsnCode", "gstRate", description
    FROM public.materials_master
  `;
  const params = [];
  if (category && category !== "All") {
    params.push(category.trim());
    query += ` WHERE category = $1`;
  }
  query += ` ORDER BY category, name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  getAllEstimations,
  getEstimationById,
  createEstimation,
  updateEstimation,
  deleteEstimation,
  getAllMaterials,
};
