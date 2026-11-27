const pool = require("../config/db");

const mapAccount = (row) => ({
  id: row.id,
  accountName: row.account_name,
  accountType: row.account_type,
  openingBalance: row.opening_balance,
  transactionType: row.transaction_type,
  status: row.status,
  remarks: row.remarks || "",
});

const getAllAccounts = async () => {
  const result = await pool.query(
    "SELECT * FROM public.accounts ORDER BY id DESC"
  );
  return result.rows.map(mapAccount);
};

const createAccount = async (data) => {
  const result = await pool.query(
    `INSERT INTO public.accounts
      (account_name, account_type, opening_balance, transaction_type, status, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.accountName,
      data.accountType || "Customer",
      data.openingBalance || 0,
      data.transactionType || "Debit",
      data.status || "Active",
      data.remarks || null,
    ]
  );
  return mapAccount(result.rows[0]);
};

const updateAccount = async (id, data) => {
  const result = await pool.query(
    `UPDATE public.accounts
     SET account_name = $1,
         account_type = $2,
         opening_balance = $3,
         transaction_type = $4,
         status = $5,
         remarks = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      data.accountName,
      data.accountType,
      data.openingBalance || 0,
      data.transactionType,
      data.status,
      data.remarks || null,
      id,
    ]
  );
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
};

const deleteAccount = async (id) => {
  const result = await pool.query(
    "DELETE FROM public.accounts WHERE id = $1 RETURNING id",
    [id]
  );
  return result.rowCount > 0;
};

module.exports = {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};