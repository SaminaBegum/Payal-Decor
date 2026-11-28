
const pool = require("../config/db");

const getAdminMonthlyAttendance = async (req, res) => {
  try {
    const { month, employeeId } = req.query;

    // Validate month format: YYYY-MM
    const selectedMonth = month || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid month in YYYY-MM format.",
      });
    }

    const [year, monthNumber] = selectedMonth.split("-").map(Number);

    const firstDay = `${selectedMonth}-01`;

    const result = await pool.query(
      `WITH month_dates AS (
         SELECT
           $1::date AS first_day,
           (date_trunc('month', $1::date) + interval '1 month - 1 day')::date AS last_day,
           CURRENT_DATE AS today
       ),
       eligible_employees AS (
         SELECT
           e.id AS employee_id,
           e.full_name,
           e.email,
           e.department,
           e.designation,
           e.status AS employee_status,
           e.created_at::date AS eligible_from
         FROM public.employees e
         CROSS JOIN month_dates md
         WHERE e.created_at::date <= md.last_day
           AND (
             e.status = 'Active'
             OR EXISTS (
               SELECT 1
               FROM public.employee_attendance ea
               WHERE ea.employee_id = e.id
                 AND ea.attendance_date BETWEEN md.first_day AND md.last_day
             )
           )
           AND ($2::uuid IS NULL OR e.id = $2::uuid)
       ),
       employee_days AS (
         SELECT
           e.*,
           d.attendance_date
         FROM eligible_employees e
         CROSS JOIN month_dates md
         CROSS JOIN LATERAL generate_series(
           GREATEST(e.eligible_from, md.first_day)::timestamp,
           LEAST(md.last_day, md.today)::timestamp,
           interval '1 day'
         ) AS d(attendance_date)
         WHERE EXTRACT(ISODOW FROM d.attendance_date) BETWEEN 1 AND 6
       ),
       daily_records AS (
         SELECT
           ed.employee_id,
           ed.full_name,
           ed.email,
           ed.department,
           ed.designation,
           ed.employee_status,
           ed.attendance_date,
           a.id AS attendance_id,
           a.check_in_at,
           a.check_out_at,
           CASE
             WHEN a.id IS NULL THEN 'Absent'
             WHEN (a.check_in_at AT TIME ZONE 'Asia/Kolkata')::time
                    > TIME '09:30:00' THEN 'Late'
             ELSE 'Present'
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
         FROM employee_days ed
         LEFT JOIN public.employee_attendance a
           ON a.employee_id = ed.employee_id
          AND a.attendance_date = ed.attendance_date
       )
       SELECT *
       FROM daily_records
       ORDER BY full_name ASC, attendance_date DESC`,
      [firstDay, employeeId || null]
    );

    const records = result.rows;

    const summary = {
      totalEmployees: new Set(
        records.map((record) => record.employee_id)
      ).size,

      workingDays: records.length,

      presentDays: records.filter(
        (record) =>
          record.attendance_state === "Present" ||
          record.attendance_state === "Late"
      ).length,

      absentDays: records.filter(
        (record) => record.attendance_state === "Absent"
      ).length,

      lateArrivals: records.filter(
        (record) => record.attendance_state === "Late"
      ).length,

      totalWorkingMinutes: records.reduce(
        (total, record) =>
          total + Number(record.working_minutes || 0),
        0
      ),
    };

    const employeeMap = new Map();

    for (const record of records) {
      if (!employeeMap.has(record.employee_id)) {
        employeeMap.set(record.employee_id, {
          employeeId: record.employee_id,
          fullName: record.full_name,
          email: record.email,
          department: record.department,
          designation: record.designation,
          employeeStatus: record.employee_status,
          workingDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateArrivals: 0,
          totalWorkingMinutes: 0,
          attendance: [],
        });
      }

      const employee = employeeMap.get(record.employee_id);

      employee.workingDays += 1;

      if (
        record.attendance_state === "Present" ||
        record.attendance_state === "Late"
      ) {
        employee.presentDays += 1;
      }

      if (record.attendance_state === "Absent") {
        employee.absentDays += 1;
      }

      if (record.attendance_state === "Late") {
        employee.lateArrivals += 1;
      }

      employee.totalWorkingMinutes += Number(
        record.working_minutes || 0
      );

      employee.attendance.push({
        date: record.attendance_date,
        checkIn: record.check_in_at,
        checkOut: record.check_out_at,
        workingMinutes: Number(record.working_minutes || 0),
        status: record.attendance_state,
      });
    }

    return res.status(200).json({
      success: true,
      month: selectedMonth,
      summary,
      employees: Array.from(employeeMap.values()),
    });
  } catch (error) {
    console.error("Admin monthly attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load monthly attendance report.",
    });
  }
};

module.exports = {
  getAdminMonthlyAttendance,
};
