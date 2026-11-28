
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { getAuthToken } from "@/lib/auth";
import {
  CalendarCheck,
  Clock,
  Users,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  BriefcaseBusiness,
  CalendarDays,
  FileBarChart,
  Download,
} from "lucide-react";

type AttendanceRecord = {
  employee_id: number;
  full_name: string;
  email: string;
  designation: string | null;
  department: string | null;
  attendance_date: string;
  attendance_id: number | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  attendance_state: string;
  working_minutes: number;
};

type AttendanceResponse = {
  success: boolean;
  date: string | null;
  summary: {
    totalEmployees: number;
    present: number;
    absent: number;
    currentlyWorking: number;
    checkedOut: number;
    totalWorkingMinutes: number;
  };
  attendance: AttendanceRecord[];
  message?: string;
};
type MonthlyAttendanceDay = {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingMinutes: number;
  status: "Present" | "Late" | "Absent";
};

type MonthlyEmployeeRecord = {
  employeeId: string;
  fullName: string;
  email: string;
  department: string | null;
  designation: string | null;
  employeeStatus: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateArrivals: number;
  totalWorkingMinutes: number;
  attendance: MonthlyAttendanceDay[];
};

type MonthlyAttendanceResponse = {
  success: boolean;
  month: string;
  summary: {
    totalEmployees: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lateArrivals: number;
    totalWorkingMinutes: number;
  };
  employees: MonthlyEmployeeRecord[];
  message?: string;
};
const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const formatTime = (value: string | null) => {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const today = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

export default function AdminAttendancePage() {
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
const [monthlyData, setMonthlyData] =
  useState<MonthlyAttendanceResponse | null>(null);
const [monthlyLoading, setMonthlyLoading] = useState(false);
const [monthlyError, setMonthlyError] = useState("");
const [monthlySearch, setMonthlySearch] = useState("");
const [selectedEmployee, setSelectedEmployee] =
  useState<MonthlyEmployeeRecord | null>(null);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getAuthToken();

      if (!token) {
        throw new Error("Please log in again to view attendance.");
      }

      const params = new URLSearchParams({ date, status });

      const response = await fetch(
        `${API_BASE}/admin/attendance?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load attendance records."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  }, [date, status]);
const fetchMonthlyAttendance = useCallback(async () => {
  try {
    setMonthlyLoading(true);
    setMonthlyError("");

    const token = getAuthToken();

    if (!token) {
      throw new Error("Please log in again to view monthly attendance.");
    }

    const response = await fetch(
      `${API_BASE}/admin/attendance/monthly?month=${selectedMonth}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const result: MonthlyAttendanceResponse = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load monthly attendance report."
      );
    }

    setMonthlyData(result);
  } catch (err) {
    setMonthlyError(
      err instanceof Error
        ? err.message
        : "Unable to load monthly attendance report."
    );
  } finally {
    setMonthlyLoading(false);
  }
}, [selectedMonth]);
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);
  useEffect(() => {
  if (activeTab === "monthly") {
    fetchMonthlyAttendance();
  }
}, [activeTab, fetchMonthlyAttendance]);

  const filteredRecords = useMemo(() => {
    const records = data?.attendance || [];
    const term = search.trim().toLowerCase();

    if (!term) return records;

    return records.filter((record) =>
      [
        record.full_name,
        record.email,
        record.designation,
        record.department,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [data, search]);
const filteredMonthlyEmployees = useMemo(() => {
  const records = monthlyData?.employees || [];
  const term = monthlySearch.trim().toLowerCase();

  if (!term) return records;

  return records.filter((employee) =>
    [
      employee.fullName,
      employee.email,
      employee.department,
      employee.designation,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  );
}, [monthlyData, monthlySearch]);
  const summary = data?.summary;

  const cards = [
    {
      label: "Total Employees",
      value: summary?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Present",
      value: summary?.present ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Absent / No Record",
      value: summary?.absent ?? 0,
      icon: UserX,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Currently Working",
      value: summary?.currentlyWorking ?? 0,
      icon: LogIn,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Checked Out",
      value: summary?.checkedOut ?? 0,
      icon: LogOut,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Total Working Hours",
      value: formatMinutes(summary?.totalWorkingMinutes ?? 0),
      icon: Clock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  const statusStyle = (state: string) => {
    if (state === "Checked In")
      return "bg-amber-50 text-amber-700";
    if (state === "Checked Out")
      return "bg-green-50 text-green-700";
    return "bg-red-50 text-red-700";
  };

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                Attendance Management
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor employee check-ins, check-outs and working hours.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAttendance}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
<div className="flex gap-2 rounded-xl border bg-card p-2">
  <button
    type="button"
    onClick={() => setActiveTab("daily")}
    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === "daily"
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted"
    }`}
  >
    <CalendarDays className="h-4 w-4" />
    Daily Attendance
  </button>

  <button
    type="button"
    onClick={() => setActiveTab("monthly")}
    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === "monthly"
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted"
    }`}
  >
    <FileBarChart className="h-4 w-4" />
    Monthly Reports
  </button>
</div>
   {activeTab === "daily" && (

<><div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Attendance Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formatDate(date)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Attendance Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="All">All Employees</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent / No Record</option>
                <option value="Checked In">Currently Working</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {card.label}
                  </p>
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">Employee Attendance Records</h2>
              <p className="text-sm text-muted-foreground">
                Attendance details for {formatDate(date)}
              </p>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={fetchAttendance}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading attendance records...
            </div>
          ) : !error && filteredRecords.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No employee attendance records found.
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Designation</th>
                    <th className="px-4 py-3 font-medium">Check In</th>
                    <th className="px-4 py-3 font-medium">Check Out</th>
                    <th className="px-4 py-3 font-medium">Working Hours</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.employee_id}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium">{record.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.email}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseBusiness className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.department || "--"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {record.designation || "--"}
                      </td>

                      <td className="px-4 py-4">
                        {formatTime(record.check_in_at)}
                      </td>

                      <td className="px-4 py-4">
                        {formatTime(record.check_out_at)}
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {formatMinutes(Number(record.working_minutes || 0))}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(record.attendance_state)}`}
                        >
                          {record.attendance_state === "Absent"
                            ? "No Record"
                            : record.attendance_state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Showing {filteredRecords.length} employee record(s).
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Attendance times are recorded by the server. Employees without an
          attendance record are shown as No Record; this does not yet account
          for weekly holidays, approved leave or company holidays.
       </p>
  </>
)}
{activeTab === "monthly" && (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Monthly Attendance Report</h2>
        <p className="text-sm text-muted-foreground">
          Review employee attendance, absences and working hours.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        />

        <button
          type="button"
          onClick={fetchMonthlyAttendance}
          disabled={monthlyLoading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>

    {monthlyError && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {monthlyError}
      </div>
    )}

    {monthlyLoading ? (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading monthly attendance...
      </div>
    ) : monthlyData ? (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="mt-2 text-2xl font-bold">{monthlyData.summary.totalEmployees}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Employee Working Days</p>
            <p className="mt-2 text-2xl font-bold">{monthlyData.summary.workingDays}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Present Days</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{monthlyData.summary.presentDays}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Absent Days</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{monthlyData.summary.absentDays}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Late Arrivals</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{monthlyData.summary.lateArrivals}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Working Hours</p>
            <p className="mt-2 text-2xl font-bold">
              {formatMinutes(monthlyData.summary.totalWorkingMinutes)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Employee Monthly Summary</h3>
              <p className="text-sm text-muted-foreground">
                {filteredMonthlyEmployees.length} employees
              </p>
            </div>

            <input
              type="search"
              value={monthlySearch}
              onChange={(event) => setMonthlySearch(event.target.value)}
              placeholder="Search employee..."
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm sm:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 text-center font-medium">Working Days</th>
                  <th className="px-4 py-3 text-center font-medium">Present</th>
                  <th className="px-4 py-3 text-center font-medium">Absent</th>
                  <th className="px-4 py-3 text-center font-medium">Late</th>
                  <th className="px-4 py-3 text-right font-medium">Working Hours</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMonthlyEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No employee records found for this month.
                    </td>
                  </tr>
                ) : (
                  filteredMonthlyEmployees.map((employee) => (
                    <tr key={employee.employeeId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{employee.fullName}</p>
                        <p className="text-xs text-muted-foreground">{employee.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {employee.department || employee.designation || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">{employee.workingDays}</td>
                      <td className="px-4 py-3 text-center text-green-600">{employee.presentDays}</td>
                      <td className="px-4 py-3 text-center text-red-600">{employee.absentDays}</td>
                      <td className="px-4 py-3 text-center text-amber-600">{employee.lateArrivals}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMinutes(employee.totalWorkingMinutes)}
                      </td>
                      <td className="px-4 py-3 text-center">
  <button
    type="button"
    onClick={() => setSelectedEmployee(employee)}
    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
  >
    View Details
  </button>
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No monthly attendance data available.
      </div>
    )}

    <p className="text-xs text-muted-foreground">
      Sundays are excluded. Approved leave and company holidays are not yet integrated
      and may currently appear as absences.
    </p>
  </div>
)}
{selectedEmployee && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-4xl overflow-hidden rounded-xl border bg-background shadow-xl">
      <div className="flex items-start justify-between border-b p-5">
        <div>
          <h2 className="text-lg font-semibold">
            {selectedEmployee.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedEmployee.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedEmployee.department || selectedEmployee.designation || "Employee"}
            {" · "}
            {selectedMonth}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedEmployee(null)}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Working Days</p>
          <p className="mt-1 text-xl font-bold">{selectedEmployee.workingDays}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Present</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {selectedEmployee.presentDays}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {selectedEmployee.absentDays}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Late Arrivals</p>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {selectedEmployee.lateArrivals}
          </p>
        </div>
      </div>

      <div className="max-h-[55vh] overflow-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Check In</th>
              <th className="px-4 py-3 text-left font-medium">Check Out</th>
              <th className="px-4 py-3 text-left font-medium">Working Hours</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {selectedEmployee.attendance.map((day) => (
              <tr key={day.date} className="hover:bg-muted/30">
                <td className="px-4 py-3">{formatDate(day.date)}</td>
                <td className="px-4 py-3">{formatTime(day.checkIn)}</td>
                <td className="px-4 py-3">{formatTime(day.checkOut)}</td>
                <td className="px-4 py-3">
                  {formatMinutes(day.workingMinutes)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      day.status === "Present"
                        ? "bg-green-50 text-green-700"
                        : day.status === "Late"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {day.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t p-4">
        <button
          type="button"
          onClick={() => setSelectedEmployee(null)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Close Details
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </AppShell>
  );
}
