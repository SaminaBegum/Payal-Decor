const pool = require("../config/db");
const { getAllBOMs } = require("./bomModel");

const COLUMNS = `
  id,
  work_order_no AS "workOrderNo",
  bom_id AS "bomId",
  product_name AS "productName",
  quantity,
  current_stage AS "currentStage",
  department,
  to_char(deadline, 'YYYY-MM-DD') AS deadline,
  notes,
  created_at AS "createdAt"
`;

const toValues = (p) => [
  p.workOrderNo,
  p.bomId != null && p.bomId !== "" ? String(p.bomId) : null,
  p.productName,
  Number(p.quantity) || 1,
  p.currentStage || "Pending",
  p.department || "Production",
  p.deadline || null,
  p.notes || null,
];

// Attach BOM details (from estimations) to each job
const attachBoms = async (rows) => {
  let boms = [];
  try {
    boms = await getAllBOMs();
  } catch (error) {
    console.error("Production: BOM lookup failed:", error.message);
  }
  return rows.map((row) => ({
    ...row,
    bom: boms.find((b) => String(b.id) === String(row.bomId)) || null,
  }));
};

const getAllJobs = async () => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.production_jobs ORDER BY id DESC`
  );
  return attachBoms(result.rows);
};

const getJobById = async (id) => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.production_jobs WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  const [job] = await attachBoms(result.rows);
  return job;
};

const createJob = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.production_jobs
      (work_order_no, bom_id, product_name, quantity, current_stage, department, deadline, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    toValues(p)
  );
  return getJobById(result.rows[0].id);
};

const updateJob = async (id, p) => {
  const result = await pool.query(
    `UPDATE public.production_jobs SET
      work_order_no=$1, bom_id=$2, product_name=$3, quantity=$4,
      current_stage=$5, department=$6, deadline=$7, notes=$8,
      updated_at=NOW()
     WHERE id=$9
     RETURNING id`,
    [...toValues(p), id]
  );
  if (!result.rows[0]) return null;
  return getJobById(id);
};

const deleteJob = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.production_jobs WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

// BOMs come from the existing estimation-based BOM model
const getAllBoms = async () => getAllBOMs();

module.exports = { getAllJobs, createJob, updateJob, deleteJob, getAllBoms };
