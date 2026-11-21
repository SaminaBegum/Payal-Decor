const pool = require("../config/db");

/**
 * Fetch all BOMs from estimations and dedicated BOM entries
 */
const getAllBOMs = async () => {
  // Pull from estimations that have BOQ items
  const query = `
    SELECT
      e.id,
      e."estimationNumber" AS "bomNo",
      COALESCE(e."projectName", 'Modular Assembly') AS "bomName",
      e."projectName" AS project,
      COALESCE(e."estimationNumber", 'WO-101') AS "workOrderNo",
      e.status,
      e.notes,
      e."createdAt"
    FROM public.estimations e
    ORDER BY e."createdAt" DESC
  `;
  const result = await pool.query(query);

  const boms = [];
  for (const row of result.rows) {
    const boqRes = await pool.query(`
      SELECT
        id,
        description AS "materialName",
        "procurementQty" AS "requiredQty",
        0 AS "availableQty",
        unit,
        "unitCost"
      FROM public.estimation_boq_lines
      WHERE "estimationId" = $1
    `, [row.id]);

    boms.push({
      ...row,
      materials: boqRes.rows,
    });
  }

  return boms;
};

module.exports = {
  getAllBOMs,
};
