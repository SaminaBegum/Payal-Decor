require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function resetAdminPassword() {
  try {
    const newPassword = "payalstore@123";
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      `UPDATE public.users 
       SET password_hash = $1,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, full_name, email, role, is_active;`,
      [passwordHash, "payaldecor@gmail.com"]
    );

    if (result.rows.length === 0) {
      console.log("No user found with email payaldecor@gmail.com");
    } else {
      console.log("Password updated successfully for:", result.rows[0]);
      
      // Verify immediately
      const match = await bcrypt.compare(newPassword, passwordHash);
      console.log("Verification test for payalstore@123:", match ? "SUCCESS (Matched!)" : "FAILED");
    }
  } catch (err) {
    console.error("Error resetting password:", err);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
