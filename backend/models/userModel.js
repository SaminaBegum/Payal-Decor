
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

// Find a user by ID (without exposing the password hash)
const findUserById = async (id) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      role,
      department,
      is_active,
      must_change_password,
      created_at,
      updated_at
    FROM public.users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

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
      must_change_password,
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
  createUser,
};
