const pool = require("../config/db");

const COLUMNS = `
  id,
  sales_order_no AS "salesOrderNo",
  customer_id AS "customerId",
  quotation_id AS "quotationId",
  customer_name AS "customerName",
  project_name AS "projectName",
  to_char(order_date, 'YYYY-MM-DD') AS "orderDate",
  to_char(delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
  status,
  total_amount AS "totalAmount",
  notes,
  items,
  created_at AS "createdAt"
`;

const toValues = (p) => [
  p.salesOrderNo,
  p.customerId != null && p.customerId !== "" ? String(p.customerId) : null,
  p.quotationId != null && p.quotationId !== "" ? String(p.quotationId) : null,
  p.customerName,
  p.projectName,
  p.orderDate,
  p.deliveryDate || null,
  p.status || "Draft",
  Number(p.totalAmount) || 0,
  p.notes || null,
  JSON.stringify(Array.isArray(p.items) ? p.items : []),
];

const getAllSalesOrders = async () => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.sales_orders ORDER BY id DESC`
  );
  return result.rows;
};

const createSalesOrder = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.sales_orders (
      sales_order_no, customer_id, quotation_id, customer_name, project_name,
      order_date, delivery_date, status, total_amount, notes, items
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING ${COLUMNS}`,
    toValues(p)
  );
  return result.rows[0];
};

const updateSalesOrder = async (id, p) => {
  const result = await pool.query(
    `UPDATE public.sales_orders SET
      sales_order_no=$1, customer_id=$2, quotation_id=$3, customer_name=$4, project_name=$5,
      order_date=$6, delivery_date=$7, status=$8, total_amount=$9, notes=$10, items=$11,
      updated_at=NOW()
     WHERE id=$12
     RETURNING ${COLUMNS}`,
    [...toValues(p), id]
  );
  return result.rows[0] || null;
};

const deleteSalesOrder = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.sales_orders WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
};