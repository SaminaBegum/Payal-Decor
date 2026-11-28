import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Timer,
} from "lucide-react";

import { EmployeeShell } from "@/components/erp/EmployeeShell";
import { getAuthToken } from "@/lib/auth";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  notes?: string | null;
};

type Employee = {
  id: string;
  full_name: string;
};

function formatDate(value?: string | null) {
  if (!value) return "--";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(
        Number(value.slice(0, 4)),
        Number(value.slice(5, 7)) - 1,
        Number(value.slice(8, 10)),
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function durationBetween(start?: string | null, end?: string | null) {
  if (!start) return 0;

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;

  return Math.max(0, Math.floor((endTime - startTime) / 60000));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function statusStyle(status: string) {
  if (status === "Present") {
    return "bg-emerald-500/10 text-emerald-600";
  }

  if (status === "Absent") {
    return "bg-red-500/10 text-red-600";
  }

  return "bg-muted text-muted-foreground";
}

export default function EmployeeAttendance() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const token = getAuthToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong.");
      }

      return data;
    },
    [],
  );

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [todayData, historyData] = await Promise.all([
        apiRequest("/attendance/today"),
        apiRequest("/attendance/history"),
      ]);

      setEmployee(todayData.employee || null);
      setToday(todayData.attendance || null);
      setHistory(historyData.attendance || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attendance information.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const handleAttendanceAction = async (action: "check-in" | "check-out") => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/attendance/${action}`, {
        method: "POST",
      });

      setSuccess(
        data.message ||
          (action === "check-in"
            ? "Checked in successfully."
            : "Checked out successfully."),
      );

      await loadAttendance();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Attendance action failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const now = new Date(currentTime);

  const isCheckedIn = Boolean(today?.check_in_at);
  const isCheckedOut = Boolean(today?.check_out_at);

  const workingMinutes = today?.check_in_at
    ? durationBetween(
        today.check_in_at,
        today.check_out_at || new Date(currentTime).toISOString(),
      )
    : 0;

  const monthlyRecords = useMemo(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;

    return history.filter((record) =>
      String(record.attendance_date).startsWith(prefix),
    );
  }, [history, currentTime]);

  const presentDays = monthlyRecords.filter(
    (record) => record.status === "Present",
  ).length;

  const monthlyMinutes = monthlyRecords.reduce(
    (total, record) =>
      total +
      durationBetween(record.check_in_at, record.check_out_at),
    0,
  );

  const currentDate = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <EmployeeShell title="My Attendance">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Attendance Overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your daily attendance and working hours.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAttendance}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Today's Attendance
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {employee?.full_name || "Employee"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentDate}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isCheckedOut
                    ? "bg-blue-500/10 text-blue-600"
                    : isCheckedIn
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCheckedOut
                  ? "Checked Out"
                  : isCheckedIn
                    ? "Checked In"
                    : "Not Checked In"}
              </span>
            </div>

            <div className="my-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LogIn className="size-4" />
                  Check In
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {formatTime(today?.check_in_at)}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LogOut className="size-4" />
                  Check Out
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {formatTime(today?.check_out_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isCheckedOut ? "Total working time" : "Working time"}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {formatDuration(workingMinutes)}
                </p>
              </div>
              <Timer className="size-8 text-primary" />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleAttendanceAction("check-in")}
                disabled={loading || busy || isCheckedIn}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                Check In
              </button>

              <button
                type="button"
                onClick={() => handleAttendanceAction("check-out")}
                disabled={loading || busy || !isCheckedIn || isCheckedOut}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Check Out
              </button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Attendance times are recorded automatically by the server.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                This Month
              </h3>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {now.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Present Days
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {presentDays}
                  </p>
                </div>
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Recorded Days
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {monthlyRecords.length}
                  </p>
                </div>
                <CalendarDays className="size-7 text-primary" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Working Hours
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatDuration(monthlyMinutes)}
                  </p>
                </div>
                <Clock3 className="size-7 text-primary" />
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Summary is calculated from the attendance records currently
              returned by the server.
            </p>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h3 className="font-semibold text-foreground">
                Attendance History
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your latest attendance records.
              </p>
            </div>
            <CalendarDays className="size-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading attendance...
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarDays className="mx-auto size-9 text-muted-foreground/50" />
              <p className="mt-3 font-medium text-foreground">
                No attendance records yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your attendance history will appear here after check-in.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Check In</th>
                    <th className="px-5 py-3 font-medium">Check Out</th>
                    <th className="px-5 py-3 font-medium">Working Hours</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4 font-medium text-foreground">
                        {formatDate(record.attendance_date)}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatTime(record.check_in_at)}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatTime(record.check_out_at)}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {record.check_in_at
                          ? formatDuration(
                              durationBetween(
                                record.check_in_at,
                                record.check_out_at,
                              ),
                            )
                          : "--"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            record.status,
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </EmployeeShell>
  );
}
