const pool = require("../config/db");

// DB column -> frontend ला हवी तशी camelCase नावे
const COLUMNS = `
  id,
  invoice_no AS "invoiceNo",
  to_char(invoice_date, 'YYYY-MM-DD') AS "invoiceDate",
  place_of_supply AS "placeOfSupply",
  eway_bill AS "ewayBill",
  customer_id AS "customerId",
  bill_to_name AS "billToName",
  bill_to_address AS "billToAddress",
  bill_to_contact AS "billToContact",
  bill_to_gstin AS "billToGstin",
  bill_to_state AS "billToState",
  ship_to AS "shipTo",
  inter_state AS "interState",
  invoice_discount AS "invoiceDiscount",
  freight,
  advance,
  status,
  items,
  taxable,
  grand_total AS "grandTotal",
  balance
`;

const toValues = (p) => [
  p.invoiceNo,
  p.invoiceDate,
  p.placeOfSupply || null,
  p.ewayBill || null,
  p.customerId != null && p.customerId !== "" ? String(p.customerId) : null,
  p.billToName,
  p.billToAddress || null,
  p.billToContact || null,
  p.billToGstin || null,
  p.billToState || null,
  p.shipTo || null,
  Boolean(p.interState),
  Number(p.invoiceDiscount) || 0,
  Number(p.freight) || 0,
  Number(p.advance) || 0,
  p.status || "Draft",
  JSON.stringify(Array.isArray(p.items) ? p.items : []),
  Number(p.taxable) || 0,
  Number(p.grandTotal) || 0,
  Number(p.balance) || 0,
];

const getAllInvoices = async () => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM public.invoices ORDER BY id DESC`
  );
  return result.rows;
};

const createInvoice = async (p) => {
  const result = await pool.query(
    `INSERT INTO public.invoices (
      invoice_no, invoice_date, place_of_supply, eway_bill, customer_id,
      bill_to_name, bill_to_address, bill_to_contact, bill_to_gstin, bill_to_state,
      ship_to, inter_state, invoice_discount, freight, advance, status,
      items, taxable, grand_total, balance
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING ${COLUMNS}`,
    toValues(p)
  );
  return result.rows[0];
};

const updateInvoice = async (id, p) => {
  const result = await pool.query(
    `UPDATE public.invoices SET
      invoice_no=$1, invoice_date=$2, place_of_supply=$3, eway_bill=$4, customer_id=$5,
      bill_to_name=$6, bill_to_address=$7, bill_to_contact=$8, bill_to_gstin=$9, bill_to_state=$10,
      ship_to=$11, inter_state=$12, invoice_discount=$13, freight=$14, advance=$15, status=$16,
      items=$17, taxable=$18, grand_total=$19, balance=$20,
      updated_at=NOW()
     WHERE id=$21
     RETURNING ${COLUMNS}`,
    [...toValues(p), id]
  );
  return result.rows[0] || null;
};

const deleteInvoice = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.invoices WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};