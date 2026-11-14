require("dotenv").config();

const pool = require("../config/db");

async function updateAdminEmail() {
  try {
    const result = await pool.query(
      `UPDATE public.users
       SET email = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, full_name, email, role`,
      [
        "payaldecor@gmail.com",
        "8fbdf30d-037c-4a24-baf3-bc2a29c09947",
      ]
    );

    if (result.rows.length === 0) {
      console.log("No matching Admin account found.");
    } else {
      console.log("Admin email corrected successfully!");
      console.log(result.rows[0]);
    }
  } catch (error) {
    console.error("Update failed:", error.message);
  } finally {
    await pool.end();
  }
}

updateAdminEmail();
