
const pool = require("../config/db");

// Find a user by email for login
const findUserByEmail = async (email) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      password_hash,
      role,
      department,
      is_active,
      must_change_password
    FROM public.users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;

  const result = await pool.query(query, [email.trim()]);
  return result.rows[0] || null;
};

// Find a user by ID without exposing the password hash
const findUserById = async (id) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      role,
      department,
      is_active,
      created_at,
      updated_at
    FROM public.users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// Find a user's password hash for authenticated password verification
const findUserPasswordById = async (id) => {
  const query = `
    SELECT id, password_hash, is_active
    FROM public.users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// Update password and clear the mandatory password-change flag
const updateUserPassword = async (id, passwordHash) => {
  const query = `
    UPDATE public.users
    SET
      password_hash = $2,
      must_change_password = FALSE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_active = TRUE
    RETURNING
      id,
      full_name,
      email,
      role,
      department,
      must_change_password
  `;

  const result = await pool.query(query, [id, passwordHash]);
  return result.rows[0] || null;
};

// Create a new user
const createUser = async ({
  full_name,
  email,
  password_hash,
  role,
  department = null,
}) => {
  const query = `
    INSERT INTO public.users (
      full_name,
      email,
      password_hash,
      role,
      department
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      full_name,
      email,
      role,
      department,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    full_name.trim(),
    email.trim().toLowerCase(),
    password_hash,
    role,
    department,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserPasswordById,
  updateUserPassword,
  createUser,
};
