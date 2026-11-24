const pool = require("../config/db");

const SELECT_COLUMNS = `
  id::text AS id,
  installation_no AS "installationNo",
  dispatch_no AS "dispatchNo",
  work_order_no AS "workOrderNo",
  customer_id AS "customerId",
  customer_name AS "customerName",
  project_name AS "projectName",
  site_address AS "siteAddress",
  installer_name AS "installerName",
  installer_phone AS "installerPhone",
  to_char(scheduled_date, 'YYYY-MM-DD') AS "scheduledDate",
  to_char(completed_date, 'YYYY-MM-DD') AS "completedDate",
  signed_off_by AS "signedOffBy",
  status,
  notes
`;

async function getAll() {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM installations ORDER BY id DESC`
  );
  return rows;
}

async function create(d) {
  const { rows } = await pool.query(
    `INSERT INTO installations
      (installation_no, dispatch_no, work_order_no, customer_id, customer_name,
       project_name, site_address, installer_name, installer_phone,
       scheduled_date, completed_date, signed_off_by, status, notes)
     VALUES
      ('INS-' || LPAD(nextval('installation_no_seq')::text, 4, '0'),
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING ${SELECT_COLUMNS}`,
    [
      d.dispatchNo, d.workOrderNo, d.customerId, d.customerName,
      d.projectName, d.siteAddress, d.installerName, d.installerPhone,
      d.scheduledDate, d.completedDate, d.signedOffBy, d.status, d.notes,
    ]
  );
  return rows[0];
}

async function update(id, d) {
  const { rows } = await pool.query(
    `UPDATE installations SET
       dispatch_no=$1, work_order_no=$2, customer_id=$3, customer_name=$4,
       project_name=$5, site_address=$6, installer_name=$7, installer_phone=$8,
       scheduled_date=$9, completed_date=$10, signed_off_by=$11, status=$12,
       notes=$13, updated_at=NOW()
     WHERE id=$14
     RETURNING ${SELECT_COLUMNS}`,
    [
      d.dispatchNo, d.workOrderNo, d.customerId, d.customerName,
      d.projectName, d.siteAddress, d.installerName, d.installerPhone,
      d.scheduledDate, d.completedDate, d.signedOffBy, d.status, d.notes, id,
    ]
  );
  return rows[0];
}

async function updateStatus(id, status) {
  // Completed केल्यावर completed_date रिकामी असेल तर आजची तारीख भरते
  const { rows } = await pool.query(
    `UPDATE installations SET
       status=$1,
       completed_date = CASE
         WHEN $1 = 'Completed' AND completed_date IS NULL THEN CURRENT_DATE
         ELSE completed_date
       END,
       updated_at=NOW()
     WHERE id=$2
     RETURNING ${SELECT_COLUMNS}`,
    [status, id]
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await pool.query(
    "DELETE FROM installations WHERE id=$1",
    [id]
  );
  return rowCount > 0;
}

module.exports = { getAll, create, update, updateStatus, remove };