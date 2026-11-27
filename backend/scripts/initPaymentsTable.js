const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../config/db");

const run = async () => {
  try {
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS public.payments_no_seq START 1
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.payments (
        id SERIAL PRIMARY KEY,
        payment_no VARCHAR(30) NOT NULL UNIQUE,
        payment_date DATE,
        party_name VARCHAR(150) NOT NULL,
        payment_type VARCHAR(20) NOT NULL DEFAULT 'Received'
          CHECK (payment_type IN ('Received', 'Paid')),
        amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
        payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash'
          CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque')),
        reference_no VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
        remarks TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (payment_date)
    `);

    console.log("payments table is ready");
  } catch (error) {
    console.error("Failed to create payments table:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
