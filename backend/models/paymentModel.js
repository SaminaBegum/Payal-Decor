const pool = require("../config/db");

// Date is returned as plain YYYY-MM-DD text so the browser never shifts it by timezone
const PAYMENT_COLUMNS = `
  id,
  payment_no,
  to_char(payment_date, 'YYYY-MM-DD') AS payment_date,
  party_name,
  payment_type,
  amount,
  payment_mode,
  reference_no,
  status,
  remarks,
  created_at,
  updated_at
`;

// List all payments, newest first
const getAllPayments = async () => {
  const result = await pool.query(
    `SELECT ${PAYMENT_COLUMNS} FROM public.payments ORDER BY id DESC`
  );
  return result.rows;
};

// Create a payment. If payment_no is blank, PAY-001, PAY-002... is generated.
const createPayment = async ({
  payment_no,
  payment_date,
  party_name,
  payment_type,
  amount,
  payment_mode,
  reference_no,
  status,
  remarks,
}) => {
  const query = `
    INSERT INTO public.payments (
      payment_no,
      payment_date,
      party_name,
      payment_type,
      amount,
      payment_mode,
      reference_no,
      status,
      remarks
    )
    VALUES (
      COALESCE(
        NULLIF($1::text, ''),
        'PAY-' || LPAD(nextval('public.payments_no_seq')::text, 3, '0')
      ),
      $2::date,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9
    )
    RETURNING ${PAYMENT_COLUMNS}
  `;

  const result = await pool.query(query, [
    payment_no,
    payment_date,
    party_name,
    payment_type,
    amount,
    payment_mode,
    reference_no,
    status,
    remarks,
  ]);

  return result.rows[0];
};

// Update a payment. A blank payment_no keeps the existing number.
const updatePayment = async (
  id,
  {
    payment_no,
    payment_date,
    party_name,
    payment_type,
    amount,
    payment_mode,
    reference_no,
    status,
    remarks,
  }
) => {
  const query = `
    UPDATE public.payments
    SET
      payment_no = COALESCE(NULLIF($2::text, ''), payment_no),
      payment_date = $3::date,
      party_name = $4,
      payment_type = $5,
      amount = $6,
      payment_mode = $7,
      reference_no = $8,
      status = $9,
      remarks = $10,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${PAYMENT_COLUMNS}
  `;

  const result = await pool.query(query, [
    id,
    payment_no,
    payment_date,
    party_name,
    payment_type,
    amount,
    payment_mode,
    reference_no,
    status,
    remarks,
  ]);

  return result.rows[0] || null;
};

// Delete a payment
const deletePayment = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.payments WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
};
