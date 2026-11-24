const pool = require("../config/db");

const COLUMNS = `
  id,
  work_order_no AS "workOrderNo",
  sales_order_id AS "salesOrderId",
  sales_order_no AS "salesOrderNo",
  customer_name AS "customerName",
  project_name AS "projectName",
  to_char(start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
  priority,
  status,
  notes,
  items,
  created_at AS "createdAt"
`;

const toValues = (p) => [
  p.workOrderNo,
  p.salesOrderId != null && p.salesOrderId !== "" ? Number(p.salesOrderId) : null,
  p.salesOrderNo || null,
  p.customerName,
  p.projectName,
  p.startDate,
  p.dueDate || null,
  p.priority || "Medium",
  p.status || "Draft",
  p.notes || null,
  JSON.stringify(Array.isArray(p.items) ? p.items : []),
];

const getAllWorkOrders = async () => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.work_orders ORDER BY id DESC`
  );
  return result.rows;
};

const createWorkOrder = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.work_orders (
      work_order_no, sales_order_id, sales_order_no, customer_name, project_name,
      start_date, due_date, priority, status, notes, items
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING ${COLUMNS}`,
    toValues(p)
  );
  return result.rows[0];
};

const updateWorkOrder = async (id, p) => {
  const result = await pool.query(
    `UPDATE public.work_orders SET
      work_order_no=$1, sales_order_id=$2, sales_order_no=$3, customer_name=$4, project_name=$5,
      start_date=$6, due_date=$7, priority=$8, status=$9, notes=$10, items=$11,
      updated_at=NOW()
     WHERE id=$12
     RETURNING ${COLUMNS}`,
    [...toValues(p), id]
  );
  return result.rows[0] || null;
};

const deleteWorkOrder = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.work_orders WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
};