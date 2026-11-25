
const pool = require("../config/db");

const SELECT = `
  SELECT
    id::text AS id,
    dispatch_no AS "dispatchNo",
    work_order_no AS "workOrderNo",
    sales_order_no AS "salesOrderNo",
    customer_id AS "customerId",
    customer_name AS "customerName",
    project_name AS "projectName",
    delivery_address AS "deliveryAddress",
    vehicle_no AS "vehicleNo",
    driver_name AS "driverName",
    driver_phone AS "driverPhone",
    transporter,
    challan_no AS "challanNo",
    to_char(dispatch_date, 'YYYY-MM-DD') AS "dispatchDate",
    to_char(expected_delivery, 'YYYY-MM-DD') AS "expectedDelivery",
    to_char(delivered_date, 'YYYY-MM-DD') AS "deliveredDate",
    received_by AS "receivedBy",
    status,
    notes
  FROM dispatches
`;

const getAll = async () => {
  const { rows } = await pool.query(
    `${SELECT} ORDER BY created_at DESC`
  );
  return rows;
};

const getById = async (id) => {
  const { rows } = await pool.query(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] || null;
};

const values = (d) => [
  d.workOrderNo, d.salesOrderNo, d.customerId, d.customerName,
  d.projectName, d.deliveryAddress, d.vehicleNo, d.driverName,
  d.driverPhone, d.transporter, d.challanNo, d.dispatchDate,
  d.expectedDelivery, d.deliveredDate, d.receivedBy, d.status, d.notes,
];

const create = async (d) => {
  const { rows } = await pool.query(
    `INSERT INTO dispatches (
      work_order_no, sales_order_no, customer_id, customer_name,
      project_name, delivery_address, vehicle_no, driver_name,
      driver_phone, transporter, challan_no, dispatch_date,
      expected_delivery, delivered_date, received_by, status, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
      COALESCE($12::date, CURRENT_DATE),$13,$14,$15,$16,$17)
    RETURNING id::text AS id`,
    values(d)
  );
  return getById(rows[0].id);
};

const update = async (id, d) => {
  const { rowCount } = await pool.query(
    `UPDATE dispatches SET
      work_order_no=$1, sales_order_no=$2, customer_id=$3, customer_name=$4,
      project_name=$5, delivery_address=$6, vehicle_no=$7, driver_name=$8,
      driver_phone=$9, transporter=$10, challan_no=$11,
      dispatch_date=COALESCE($12::date, dispatch_date),
      expected_delivery=$13, delivered_date=$14, received_by=$15,
      status=$16, notes=$17, updated_at=NOW()
     WHERE id=$18`,
    [...values(d), id]
  );
  return rowCount ? getById(id) : null;
};

const updateStatus = async (id, status) => {
  const { rowCount } = await pool.query(
    `UPDATE dispatches SET
      status = $1,
      delivered_date = CASE WHEN $1 = 'Delivered'
        THEN COALESCE(delivered_date, CURRENT_DATE) ELSE delivered_date END,
      updated_at = NOW()
     WHERE id = $2`,
    [status, id]
  );
  return rowCount ? getById(id) : null;
};

const remove = async (id) => {
  const { rowCount } = await pool.query(
    "DELETE FROM dispatches WHERE id = $1",
    [id]
  );
  return rowCount > 0;
};

module.exports = { getAll, getById, create, update, updateStatus, remove };