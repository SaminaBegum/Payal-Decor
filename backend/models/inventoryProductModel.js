const crypto = require("crypto");
const pool = require("../config/db");

// List never returns the image itself (it is heavy).
// It returns hasImage + imageVer; the browser loads each image from
// GET /inventory-products/:srNo/image (lazy + cached).
const COLUMNS = `
  "srNo",
  "itemName",
  dimension,
  price::float AS price,
  category,
  series,
  (image IS NOT NULL) AS "hasImage",
  COALESCE(EXTRACT(EPOCH FROM COALESCE("updatedAt","createdAt"))::int, 0) AS "imageVer"
`;

const bySrNo = (a, b) =>
  a.srNo.localeCompare(b.srNo, undefined, { numeric: true });

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const getAllProducts = async () => {
  const result = await pool.query(`SELECT ${COLUMNS} FROM public.inventory_products`);
  return result.rows.sort(bySrNo);
};

const getProductImage = async (srNo) => {
  const result = await pool.query(
    `SELECT image FROM public.inventory_products WHERE "srNo" = $1`,
    [srNo]
  );
  return result.rows[0]?.image || null;
};

const createProduct = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.inventory_products
      (id, "srNo", "itemName", dimension, price, category, series, image, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     RETURNING ${COLUMNS}`,
    [crypto.randomUUID(), p.srNo, p.itemName, p.dimension || "", Number(p.price),
     p.category || "Uncategorised", p.series || "General", p.image || null]
  );
  return result.rows[0];
};

// image: key missing = keep, null = remove, string = replace
const updateProduct = async (srNo, p) => {
  const result = await pool.query(
    `UPDATE public.inventory_products SET
      "itemName"=$2, dimension=$3, price=$4, category=$5, series=$6,
      image = CASE WHEN $8::boolean THEN $7 ELSE image END,
      "updatedAt"=NOW()
     WHERE "srNo"=$1
     RETURNING ${COLUMNS}`,
    [srNo, p.itemName, p.dimension || "", Number(p.price),
     p.category || "Uncategorised", p.series || "General",
     p.image || null, hasOwn(p, "image")]
  );
  return result.rows[0] || null;
};

const deleteProduct = async (srNo) => {
  const result = await pool.query(
    `DELETE FROM public.inventory_products WHERE "srNo" = $1 RETURNING "srNo"`,
    [srNo]
  );
  return result.rows[0] || null;
};

// One transaction: update-or-insert changed rows, delete removed rows
const syncProducts = async (upserts = [], deletes = []) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const p of upserts) {
      const upd = await client.query(
        `UPDATE public.inventory_products SET
          "itemName"=$2, dimension=$3, price=$4, category=$5, series=$6,
          image = CASE WHEN $8::boolean THEN $7 ELSE image END,
          "updatedAt"=NOW()
         WHERE "srNo"=$1`,
        [p.srNo, p.itemName, p.dimension || "", Number(p.price),
         p.category || "Uncategorised", p.series || "General",
         p.image || null, hasOwn(p, "image")]
      );
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO public.inventory_products
            (id, "srNo", "itemName", dimension, price, category, series, image, "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [crypto.randomUUID(), p.srNo, p.itemName, p.dimension || "", Number(p.price),
           p.category || "Uncategorised", p.series || "General", p.image || null]
        );
      }
    }

    if (deletes.length) {
      await client.query(
        `DELETE FROM public.inventory_products WHERE "srNo" = ANY($1::text[])`,
        [deletes]
      );
    }

    await client.query("COMMIT");
    return { upserted: upserts.length, deleted: deletes.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllProducts,
  getProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
  syncProducts,
};