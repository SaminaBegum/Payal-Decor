require("dotenv").config();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function inspectUsers() {
  try {
    const res = await pool.query(`SELECT id, full_name, email, role, department, is_active, password_hash FROM public.users;`);
    console.log("Total users found:", res.rows.length);
    for (const u of res.rows) {
      console.log({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        department: u.department,
        is_active: u.is_active,
        has_hash: Boolean(u.password_hash)
      });

      // Test common passwords
      const testPasswords = ["payalstore@123", "admin123", "admin", "PayalDecor@123", "123456", "password"];
      for (const p of testPasswords) {
        if (u.password_hash) {
          const match = await bcrypt.compare(p, u.password_hash);
          if (match) {
            console.log(`>>> MATCH FOUND for ${u.email}: password is "${p}"`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error inspecting users:", err);
  } finally {
    await pool.end();
  }
}

inspectUsers();
