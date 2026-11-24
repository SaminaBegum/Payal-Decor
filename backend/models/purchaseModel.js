const crypto = require("crypto");
const pool = require("../config/db");

/**
 * Generate a cryptographically secure unique ID
 */
function generateId(prefix = "po") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Normalizes database rows to frontend-friendly camelCase and snake_case properties
 */
function formatOrderRow(row) {
  if (!row) return null;
  const vendorComp = row.vendor_company || row.vendorCompany || row.vendor || row.vendor_name || "";
  const poNum = row.po_no || row.poNo || "";
  const dateStr = row.order_date
    ? typeof row.order_date === "string"
      ? row.order_date.slice(0, 10)
      : new Date(row.order_date).toISOString().slice(0, 10)
    : row.date || new Date().toISOString().slice(0, 10);
  const expDateStr = row.expected_delivery_date
    ? typeof row.expected_delivery_date === "string"
      ? row.expected_delivery_date.slice(0, 10)
      : new Date(row.expected_delivery_date).toISOString().slice(0, 10)
    : row.expectedDeliveryDate || "";

  const sub = parseFloat(row.subtotal || 0);
  const disc = parseFloat(row.discount_amount || row.discountTotal || 0);
  const tax = parseFloat(row.taxable_amount || row.taxableTotal || 0);
  const cgstVal = parseFloat(row.cgst_amount || row.cgst || 0);
  const sgstVal = parseFloat(row.sgst_amount || row.sgst || 0);
  const igstVal = parseFloat(row.igst_amount || row.igst || 0);
  const transport = parseFloat(row.transport_charges || row.transportCharges || 0);
  const round = parseFloat(row.round_off || row.roundOff || 0);
  const grand = parseFloat(row.grand_total || row.grandTotal || 0);

  return {
    id: row.id,
    poNo: poNum,
    po_no: poNum,
    vendor: vendorComp,
    vendor_company: vendorComp,
    vendorCompany: vendorComp,
    vendorId: row.vendor_id || row.vendorId || null,
    vendor_id: row.vendor_id || row.vendorId || null,
    vendorName: row.vendor_name || row.vendorName || "",
    vendor_name: row.vendor_name || row.vendorName || "",
    vendorPhone: row.vendor_phone || row.vendorPhone || "",
    vendor_phone: row.vendor_phone || row.vendorPhone || "",
    vendorEmail: row.vendor_email || row.vendorEmail || "",
    vendor_email: row.vendor_email || row.vendorEmail || "",
    vendorGstin: row.vendor_gstin || row.vendorGstin || "",
    vendor_gstin: row.vendor_gstin || row.vendorGstin || "",
    vendorAddress: row.vendor_address || row.vendorAddress || "",
    vendor_address: row.vendor_address || row.vendorAddress || "",
    date: dateStr,
    order_date: dateStr,
    expectedDeliveryDate: expDateStr,
    expected_delivery_date: expDateStr,
    deliveryAddress: row.delivery_address || row.deliveryAddress || "",
    delivery_address: row.delivery_address || row.deliveryAddress || "",
    paymentTerms: row.payment_terms || row.paymentTerms || "30 Days Credit",
    payment_terms: row.payment_terms || row.paymentTerms || "30 Days Credit",
    notes: row.notes || "",
    status: row.status || "Pending",
    subtotal: sub,
    discountTotal: disc,
    discount_amount: disc,
    taxableTotal: tax,
    taxable_amount: tax,
    cgst: cgstVal,
    cgst_amount: cgstVal,
    sgst: sgstVal,
    sgst_amount: sgstVal,
    igst: igstVal,
    igst_amount: igstVal,
    transportCharges: transport,
    transport_charges: transport,
    roundOff: round,
    round_off: round,
    grandTotal: grand,
    grand_total: grand,
    items: Array.isArray(row.items)
      ? row.items.map((it) => ({
          id: it.id,
          description: it.description || it.item_description || "",
          item_description: it.description || it.item_description || "",
          materialId: it.materialId || it.material_id || null,
          material_id: it.materialId || it.material_id || null,
          category: it.category || "General",
          hsnCode: it.hsnCode || it.hsn_code || "9403",
          hsn_code: it.hsnCode || it.hsn_code || "9403",
          quantity: parseFloat(it.quantity || 0),
          unit: it.unit || "Nos",
          rate: parseFloat(it.rate || it.unit_rate || 0),
          unit_rate: parseFloat(it.rate || it.unit_rate || 0),
          discountPct: parseFloat(it.discountPct || it.discount_pct || 0),
          discount_pct: parseFloat(it.discountPct || it.discount_pct || 0),
          gstRate: parseFloat(it.gstRate || it.gst_rate || 18),
          gst_rate: parseFloat(it.gstRate || it.gst_rate || 18),
          taxableAmount: parseFloat(it.taxableAmount || it.taxable_value || 0),
          taxable_value: parseFloat(it.taxableAmount || it.taxable_value || 0),
          gstAmount: parseFloat(it.gstAmount || it.gst_amount || 0),
          gst_amount: parseFloat(it.gstAmount || it.gst_amount || 0),
          total: parseFloat(it.total || it.total_amount || 0),
          total_amount: parseFloat(it.total || it.total_amount || 0),
        }))
      : [],
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

/**
 * Auto-generate sequential PO Number: PO-YYYY-YY/XXX (e.g. PO-2026-27/001)
 */
async function generatePoNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Indian Fiscal Year starts in April
  const startYear = month >= 4 ? year : year - 1;
  const endYearSuffix = String((startYear + 1) % 100).padStart(2, "0");
  const yearPrefix = `PO-${startYear}-${endYearSuffix}/`;

  const query = `
    SELECT po_no 
    FROM public.purchase_orders 
    WHERE po_no LIKE $1 
    ORDER BY id DESC;
  `;
  const result = await pool.query(query, [`${yearPrefix}%`]);

  let nextSequence = 1;
  if (result.rows.length > 0) {
    const sequences = result.rows
      .map((row) => {
        const parts = row.po_no.split("/");
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter((num) => !isNaN(num) && num > 0);

    if (sequences.length > 0) {
      nextSequence = Math.max(...sequences) + 1;
    }
  }

  return `${yearPrefix}${String(nextSequence).padStart(3, "0")}`;
}

/**
 * Get all purchase orders with optional search, status, and vendor filters
 */
async function getAllPurchaseOrders(filters = {}) {
  const { search, status, vendorId, sortBy = "created_at", sortOrder = "DESC" } = filters;
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const pIdx = params.length;
    conditions.push(`(
      LOWER(po.po_no) LIKE $${pIdx} OR 
      LOWER(po.vendor_company) LIKE $${pIdx} OR 
      LOWER(po.vendor_name) LIKE $${pIdx} OR 
      LOWER(po.vendor_gstin) LIKE $${pIdx} OR
      LOWER(po.delivery_address) LIKE $${pIdx} OR
      EXISTS (
        SELECT 1 FROM public.purchase_order_items poi 
        WHERE poi.purchase_order_id = po.id AND LOWER(poi.item_description) LIKE $${pIdx}
      )
    )`);
  }

  if (status && status !== "All" && status.trim()) {
    params.push(status.trim());
    conditions.push(`po.status = $${params.length}`);
  }

  if (vendorId && vendorId.trim()) {
    params.push(vendorId.trim());
    conditions.push(`po.vendor_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Whitelist sort fields to prevent SQL injection
  const allowedSorts = ["po_no", "vendor_company", "order_date", "expected_delivery_date", "status", "grand_total", "created_at"];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : "created_at";
  const safeOrder = sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const query = `
    SELECT 
      po.id,
      po.po_no,
      po.vendor_id,
      po.vendor_name,
      po.vendor_company,
      po.vendor_phone,
      po.vendor_email,
      po.vendor_gstin,
      po.vendor_address,
      po.order_date,
      po.expected_delivery_date,
      po.delivery_address,
      po.payment_terms,
      po.notes,
      po.status,
      po.subtotal,
      po.discount_amount,
      po.taxable_amount,
      po.cgst_amount,
      po.sgst_amount,
      po.igst_amount,
      po.transport_charges,
      po.round_off,
      po.grand_total,
      po.created_at,
      po.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', poi.id,
            'description', poi.item_description,
            'materialId', poi.material_id,
            'category', poi.category,
            'hsnCode', poi.hsn_code,
            'quantity', poi.quantity,
            'unit', poi.unit,
            'rate', poi.unit_rate,
            'discountPct', poi.discount_pct,
            'gstRate', poi.gst_rate,
            'taxableAmount', poi.taxable_value,
            'gstAmount', poi.gst_amount,
            'total', poi.total_amount
          ) ORDER BY poi.created_at ASC
        ) FILTER (WHERE poi.id IS NOT NULL), '[]'::json
      ) AS items
    FROM public.purchase_orders po
    LEFT JOIN public.purchase_order_items poi ON po.id = poi.purchase_order_id
    ${whereClause}
    GROUP BY po.id
    ORDER BY po.${safeSort} ${safeOrder};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM public.purchase_orders po
    ${whereClause};
  `;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params)
  ]);

  return {
    purchaseOrders: rowsResult.rows.map(formatOrderRow),
    total: parseInt(countResult.rows[0].total, 10)
  };
}

/**
 * Get single purchase order by ID with line items
 */
async function getPurchaseOrderById(id) {
  const query = `
    SELECT 
      po.id,
      po.po_no,
      po.vendor_id,
      po.vendor_name,
      po.vendor_company,
      po.vendor_phone,
      po.vendor_email,
      po.vendor_gstin,
      po.vendor_address,
      po.order_date,
      po.expected_delivery_date,
      po.delivery_address,
      po.payment_terms,
      po.notes,
      po.status,
      po.subtotal,
      po.discount_amount,
      po.taxable_amount,
      po.cgst_amount,
      po.sgst_amount,
      po.igst_amount,
      po.transport_charges,
      po.round_off,
      po.grand_total,
      po.created_at,
      po.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', poi.id,
            'description', poi.item_description,
            'materialId', poi.material_id,
            'category', poi.category,
            'hsnCode', poi.hsn_code,
            'quantity', poi.quantity,
            'unit', poi.unit,
            'rate', poi.unit_rate,
            'discountPct', poi.discount_pct,
            'gstRate', poi.gst_rate,
            'taxableAmount', poi.taxable_value,
            'gstAmount', poi.gst_amount,
            'total', poi.total_amount
          ) ORDER BY poi.created_at ASC
        ) FILTER (WHERE poi.id IS NOT NULL), '[]'::json
      ) AS items
    FROM public.purchase_orders po
    LEFT JOIN public.purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE po.id = $1
    GROUP BY po.id;
  `;

  const result = await pool.query(query, [id]);
  return formatOrderRow(result.rows[0]) || null;
}

/**
 * Create a new purchase order with line items in an atomic transaction
 */
async function createPurchaseOrder(data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poId = data.id || generateId("po");
    const poNo = data.poNo || (await generatePoNumber());

    const vendorId = data.vendorId || null;
    const vendorName = String(data.vendorName || data.vendor || "Supplier Contact").trim();
    const vendorCompany = String(data.vendorCompany || data.vendor || "Supplier").trim();
    const vendorPhone = String(data.vendorPhone || "").trim();
    const vendorEmail = String(data.vendorEmail || "").trim();
    const vendorGstin = String(data.vendorGstin || "").trim();
    const vendorAddress = String(data.vendorAddress || "").trim();
    const orderDate = data.orderDate || data.date || new Date().toISOString().slice(0, 10);
    const expectedDeliveryDate = data.expectedDeliveryDate || data.expectedDate || null;
    const deliveryAddress = String(data.deliveryAddress || "Payal Decor Central Works, Timber Market, Pune").trim();
    const paymentTerms = String(data.paymentTerms || "30 Days Credit").trim();
    const notes = String(data.notes || "").trim();
    const status = String(data.status || "Pending").trim();

    // Line items calculation
    const rawItems = Array.isArray(data.items) ? data.items : [];
    let subtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let totalGst = 0;

    const processedItems = rawItems.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discPct = parseFloat(item.discountPct) || 0;
      const gstRate = parseFloat(item.gstRate) || 18;

      const gross = qty * rate;
      const discVal = gross * (discPct / 100);
      const taxable = Math.max(0, gross - discVal);
      const gstVal = taxable * (gstRate / 100);
      const total = taxable + gstVal;

      subtotal += gross;
      discountAmount += discVal;
      taxableAmount += taxable;
      totalGst += gstVal;

      return {
        id: item.id || generateId("item"),
        description: String(item.description || item.itemName || "Raw Material").trim(),
        materialId: item.materialId || null,
        category: String(item.category || "General").trim(),
        hsnCode: String(item.hsnCode || "9403").trim(),
        quantity: qty,
        unit: String(item.unit || "Nos").trim(),
        rate,
        discountPct: discPct,
        gstRate,
        taxableValue: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstVal * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
      };
    });

    const isInterstate = vendorGstin.trim().length >= 2 && !vendorGstin.startsWith("27");
    const cgstAmount = isInterstate ? 0 : Math.round((totalGst / 2) * 100) / 100;
    const sgstAmount = isInterstate ? 0 : Math.round((totalGst / 2) * 100) / 100;
    const igstAmount = isInterstate ? Math.round(totalGst * 100) / 100 : 0;
    const transportCharges = parseFloat(data.transportCharges) || 0;

    const rawGrandTotal = taxableAmount + totalGst + transportCharges;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    // 1. Insert header
    const insertPoQuery = `
      INSERT INTO public.purchase_orders (
        id, po_no, vendor_id, vendor_name, vendor_company, vendor_phone,
        vendor_email, vendor_gstin, vendor_address, order_date,
        expected_delivery_date, delivery_address, payment_terms, notes, status,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount,
        igst_amount, transport_charges, round_off, grand_total,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const poValues = [
      poId, poNo, vendorId, vendorName, vendorCompany, vendorPhone,
      vendorEmail, vendorGstin, vendorAddress, orderDate,
      expectedDeliveryDate, deliveryAddress, paymentTerms, notes, status,
      Math.round(subtotal * 100) / 100,
      Math.round(discountAmount * 100) / 100,
      Math.round(taxableAmount * 100) / 100,
      cgstAmount, sgstAmount, igstAmount,
      transportCharges, roundOff, grandTotal
    ];

    const poRes = await client.query(insertPoQuery, poValues);

    // 2. Insert items
    for (const item of processedItems) {
      await client.query(`
        INSERT INTO public.purchase_order_items (
          id, purchase_order_id, item_description, material_id, category,
          hsn_code, quantity, unit, unit_rate, discount_pct, gst_rate,
          taxable_value, gst_amount, total_amount, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, CURRENT_TIMESTAMP
        );
      `, [
        item.id, poId, item.description, item.materialId, item.category,
        item.hsnCode, item.quantity, item.unit, item.rate, item.discountPct, item.gstRate,
        item.taxableValue, item.gstAmount, item.totalAmount
      ]);
    }

    await client.query("COMMIT");

    return formatOrderRow({
      ...poRes.rows[0],
      items: processedItems
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update an existing purchase order and its line items atomically
 */
async function updatePurchaseOrder(id, data) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingCheck = await client.query(`SELECT id FROM public.purchase_orders WHERE id = $1`, [id]);
    if (existingCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const vendorId = data.vendorId || null;
    const vendorName = String(data.vendorName || data.vendor || "Supplier Contact").trim();
    const vendorCompany = String(data.vendorCompany || data.vendor || "Supplier").trim();
    const vendorPhone = String(data.vendorPhone || "").trim();
    const vendorEmail = String(data.vendorEmail || "").trim();
    const vendorGstin = String(data.vendorGstin || "").trim();
    const vendorAddress = String(data.vendorAddress || "").trim();
    const orderDate = data.orderDate || data.date || new Date().toISOString().slice(0, 10);
    const expectedDeliveryDate = data.expectedDeliveryDate || data.expectedDate || null;
    const deliveryAddress = String(data.deliveryAddress || "Payal Decor Central Works, Timber Market, Pune").trim();
    const paymentTerms = String(data.paymentTerms || "30 Days Credit").trim();
    const notes = String(data.notes || "").trim();
    const status = String(data.status || "Pending").trim();

    // Line items calculation
    const rawItems = Array.isArray(data.items) ? data.items : [];
    let subtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let totalGst = 0;

    const processedItems = rawItems.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discPct = parseFloat(item.discountPct) || 0;
      const gstRate = parseFloat(item.gstRate) || 18;

      const gross = qty * rate;
      const discVal = gross * (discPct / 100);
      const taxable = Math.max(0, gross - discVal);
      const gstVal = taxable * (gstRate / 100);
      const total = taxable + gstVal;

      subtotal += gross;
      discountAmount += discVal;
      taxableAmount += taxable;
      totalGst += gstVal;

      return {
        id: item.id || generateId("item"),
        description: String(item.description || item.itemName || "Raw Material").trim(),
        materialId: item.materialId || null,
        category: String(item.category || "General").trim(),
        hsnCode: String(item.hsnCode || "9403").trim(),
        quantity: qty,
        unit: String(item.unit || "Nos").trim(),
        rate,
        discountPct: discPct,
        gstRate,
        taxableValue: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstVal * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
      };
    });

    const isInterstate = vendorGstin.trim().length >= 2 && !vendorGstin.startsWith("27");
    const cgstAmount = isInterstate ? 0 : Math.round((totalGst / 2) * 100) / 100;
    const sgstAmount = isInterstate ? 0 : Math.round((totalGst / 2) * 100) / 100;
    const igstAmount = isInterstate ? Math.round(totalGst * 100) / 100 : 0;
    const transportCharges = parseFloat(data.transportCharges) || 0;

    const rawGrandTotal = taxableAmount + totalGst + transportCharges;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    // 1. Update header
    const updatePoQuery = `
      UPDATE public.purchase_orders
      SET 
        vendor_id = $2,
        vendor_name = $3,
        vendor_company = $4,
        vendor_phone = $5,
        vendor_email = $6,
        vendor_gstin = $7,
        vendor_address = $8,
        order_date = $9,
        expected_delivery_date = $10,
        delivery_address = $11,
        payment_terms = $12,
        notes = $13,
        status = $14,
        subtotal = $15,
        discount_amount = $16,
        taxable_amount = $17,
        cgst_amount = $18,
        sgst_amount = $19,
        igst_amount = $20,
        transport_charges = $21,
        round_off = $22,
        grand_total = $23,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    const poValues = [
      id, vendorId, vendorName, vendorCompany, vendorPhone,
      vendorEmail, vendorGstin, vendorAddress, orderDate,
      expectedDeliveryDate, deliveryAddress, paymentTerms, notes, status,
      Math.round(subtotal * 100) / 100,
      Math.round(discountAmount * 100) / 100,
      Math.round(taxableAmount * 100) / 100,
      cgstAmount, sgstAmount, igstAmount,
      transportCharges, roundOff, grandTotal
    ];

    const poRes = await client.query(updatePoQuery, poValues);

    // 2. Delete old items and insert updated items
    await client.query(`DELETE FROM public.purchase_order_items WHERE purchase_order_id = $1`, [id]);

    for (const item of processedItems) {
      await client.query(`
        INSERT INTO public.purchase_order_items (
          id, purchase_order_id, item_description, material_id, category,
          hsn_code, quantity, unit, unit_rate, discount_pct, gst_rate,
          taxable_value, gst_amount, total_amount, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, CURRENT_TIMESTAMP
        );
      `, [
        item.id, id, item.description, item.materialId, item.category,
        item.hsnCode, item.quantity, item.unit, item.rate, item.discountPct, item.gstRate,
        item.taxableValue, item.gstAmount, item.totalAmount
      ]);
    }

    await client.query("COMMIT");

    return formatOrderRow({
      ...poRes.rows[0],
      items: processedItems
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fast status updater for purchase orders
 */
async function updatePurchaseStatus(id, status) {
  const query = `
    UPDATE public.purchase_orders
    SET status = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id, status]);
  return formatOrderRow(result.rows[0]) || null;
}

/**
 * Delete a purchase order with cascading item deletion
 */
async function deletePurchaseOrder(id) {
  const result = await pool.query(`DELETE FROM public.purchase_orders WHERE id = $1 RETURNING id`, [id]);
  return result.rowCount > 0;
}

/**
 * Get aggregate statistics and KPIs for Purchase module
 */
async function getPurchaseStats() {
  const query = `
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'Pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN status IN ('Approved', 'Ordered') THEN 1 END) AS active,
      COUNT(CASE WHEN status = 'Received' THEN 1 END) AS received,
      COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) AS cancelled,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN grand_total ELSE 0 END), 0) AS "totalSpend"
    FROM public.purchase_orders;
  `;
  const result = await pool.query(query);
  const row = result.rows[0] || {};
  return {
    total: parseInt(row.total || 0, 10),
    pending: parseInt(row.pending || 0, 10),
    active: parseInt(row.active || 0, 10),
    received: parseInt(row.received || 0, 10),
    cancelled: parseInt(row.cancelled || 0, 10),
    totalSpend: parseFloat(row.totalSpend || 0)
  };
}

module.exports = {
  generatePoNumber,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseStatus,
  deletePurchaseOrder,
  getPurchaseStats
};
