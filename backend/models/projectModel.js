const pool = require("../config/db");

// DB column -> frontend ला हवी तशी camelCase नावे
const COLUMNS = `
  id,
  name,
  customer_id AS "customerId",
  customer_name AS "customerName",
  site,
  project_lead AS "projectLead",
  measured_area AS "measuredArea",
  to_char(target_date, 'YYYY-MM-DD') AS "targetDate",
  progress,
  value::float8 AS value,
  status,
  notes
`;

const toValues = (p) => [
  p.name,
  p.customerId != null && p.customerId !== "" ? String(p.customerId) : null,
  p.customerName || null,
  p.site || null,
  p.projectLead || null,
  p.measuredArea || null,
  p.targetDate || null,
  Number(p.progress) || 0,
  Number(p.value) || 0,
  p.status || "Pending",
  p.notes || null,
];

// सगळे projects (status filter सह)
const getAllProjects = async (status) => {
  if (status && status !== "All") {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM public.projects WHERE status = $1 ORDER BY id DESC`,
      [status]
    );
    return result.rows;
  }
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.projects ORDER BY id DESC`
  );
  return result.rows;
};

// नवीन project
const createProject = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.projects
      (name, customer_id, customer_name, site, project_lead, measured_area,
       target_date, progress, value, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING ${COLUMNS}`,
    toValues(p)
  );
  return result.rows[0];
};

// project update
const updateProject = async (id, p) => {
  const result = await pool.query(
    `UPDATE public.projects SET
      name=$1, customer_id=$2, customer_name=$3, site=$4, project_lead=$5,
      measured_area=$6, target_date=$7, progress=$8, value=$9, status=$10,
      notes=$11, updated_at=NOW()
     WHERE id=$12
     RETURNING ${COLUMNS}`,
    [...toValues(p), id]
  );
  return result.rows[0] || null;
};

// project delete
const deleteProject = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.projects WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
};