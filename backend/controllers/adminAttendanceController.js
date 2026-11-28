
const pool = require("../config/db");

const getAdminAttendanceOverview = async (req, res) => {
  try {
    const { date, status } = req.query;

    // Validate the requested date.
    if (date) {
      const parsedDate = new Date(`${date}T00:00:00.000Z`);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid date in YYYY-MM-DD format.",
        });
      }
    }

    const allowedStatuses = [
      "All",
      "Present",
      "Absent",
      "Checked In",
      "Checked Out",
    ];

    const selectedStatus = status || "All";

    if (!allowedStatuses.includes(selectedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status filter.",
      });
    }

    const result = await pool.query(
      `WITH selected_date AS (
         SELECT COALESCE($1::date, CURRENT_DATE) AS attendance_date
       )
       SELECT
         e.id AS employee_id,
         e.full_name,
         e.email,
         e.designation,
         e.department,
         sd.attendance_date,
         a.id AS attendance_id,
         a.check_in_at,
         a.check_out_at,
         COALESCE(a.status, 'Absent') AS status,
         CASE
           WHEN a.id IS NULL THEN 'Absent'
           WHEN a.check_out_at IS NULL THEN 'Checked In'
           ELSE 'Checked Out'
         END AS attendance_state,
         CASE
           WHEN a.check_in_at IS NULL THEN 0
           ELSE GREATEST(
             0,
             ROUND(
               EXTRACT(
                 EPOCH FROM (
                   COALESCE(a.check_out_at, CURRENT_TIMESTAMP)
                   - a.check_in_at
                 )
               ) / 60
             )
           )::integer
         END AS working_minutes
       FROM public.employees e
       CROSS JOIN selected_date sd
       LEFT JOIN public.employee_attendance a
         ON a.employee_id = e.id
         AND a.attendance_date = sd.attendance_date
       WHERE e.status = 'Active'
       ORDER BY e.full_name ASC`,
      [date || null]
    );

    const allRecords = result.rows;

    const summary = {
      totalEmployees: allRecords.length,
      present: allRecords.filter(
        (record) => record.status === "Present"
      ).length,
      absent: allRecords.filter(
        (record) => record.attendance_state === "Absent"
      ).length,
      currentlyWorking: allRecords.filter(
        (record) => record.attendance_state === "Checked In"
      ).length,
      checkedOut: allRecords.filter(
        (record) => record.attendance_state === "Checked Out"
      ).length,
      totalWorkingMinutes: allRecords.reduce(
        (total, record) => total + Number(record.working_minutes || 0),
        0
      ),
    };

    const filteredRecords =
      selectedStatus === "All"
        ? allRecords
        : allRecords.filter((record) => {
            if (selectedStatus === "Present") {
              return record.status === "Present";
            }

            return record.attendance_state === selectedStatus;
          });

    return res.status(200).json({
      success: true,
      date: allRecords[0]?.attendance_date || date || null,
      summary,
      attendance: filteredRecords,
    });
  } catch (error) {
    console.error("Admin attendance overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load employee attendance records.",
    });
  }
};

module.exports = {
  getAdminAttendanceOverview,
};
