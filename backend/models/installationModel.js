const pool = require("../config/db");

let tableReady = null;

// Creates the sequence and table on first use if they do not exist
function ensureTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(
        `CREATE SEQUENCE IF NOT EXISTS installation_no_seq START 1`
      );
      await pool.query(`
        CREATE TABLE IF NOT EXISTS installations (
          id SERIAL PRIMARY KEY,
          installation_no VARCHAR(30) UNIQUE NOT NULL,
          dispatch_no VARCHAR(50),
          work_order_no VARCHAR(50),
          customer_id VARCHAR(50),
          customer_name VARCHAR(255) NOT NULL,
          project_name VARCHAR(255),
          site_address TEXT NOT NULL,
          installer_name VARCHAR(255),
          installer_phone VARCHAR(30),
          scheduled_date DATE,
          completed_date DATE,
          signed_off_by VARCHAR(255),
          status VARCHAR(20) NOT NULL DEFAULT 'Pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

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
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM installations ORDER BY id DESC`
  );
  return rows;
}

async function create(d) {
  await ensureTable();
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
  await ensureTable();
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
  await ensureTable();
  // When marked Completed, fill completed_date with today if it is empty
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
  await ensureTable();
  const { rowCount } = await pool.query(
    "DELETE FROM installations WHERE id=$1",
    [id]
  );
  return rowCount > 0;
}

module.exports = { getAll, create, update, updateStatus, remove };
