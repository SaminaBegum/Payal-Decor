import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
  AlertCircle,
  Send,
  BriefcaseBusiness,
   UserCircle,
  Mail,
} from "lucide-react";

 
import { EmployeeShell } from "@/components/erp/EmployeeShell";
import { getCurrentUser, getAuthToken } from "@/lib/auth";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

type AttendanceRecord = {
  id?: number;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
};

type ProgressRecord = {
  id?: number;
  progress_date: string;
  work_summary: string;
  completed_work?: string | null;
  pending_work?: string | null;
  blockers?: string | null;
  hours_worked?: number | null;
  created_at?: string;
};

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatDate(value?: string | null) {
  if (!value) return "--";

  const dateValue = String(value);

  // PostgreSQL DATE values may arrive as UTC timestamps.
  // Preserve date-only strings and convert timestamps to local time.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(
        Number(dateValue.slice(0, 4)),
        Number(dateValue.slice(5, 7)) - 1,
        Number(dateValue.slice(8, 10)),
      )
    : new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Clock;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const user = getCurrentUser();

  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    work_summary: "",
    completed_work: "",
    pending_work: "",
    blockers: "",
    hours_worked: "",
  });

  const apiRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
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
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [todayData, attendanceData, progressData] = await Promise.all([
        apiRequest("/attendance/today"),
        apiRequest("/attendance/history"),
        apiRequest("/attendance/progress"),
      ]);

      setAttendance(todayData.attendance || null);
      setAttendanceHistory(attendanceData.attendance || []);
      setProgressHistory(progressData.progress || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAttendance = async (action: "check-in" | "check-out") => {
    setAttendanceBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/attendance/${action}`, {
        method: "POST",
      });

      setSuccess(data.message || "Attendance updated successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance update failed.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleProgressSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProgressBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/attendance/progress", {
        method: "POST",
        body: JSON.stringify({
          work_summary: form.work_summary,
          completed_work: form.completed_work,
          pending_work: form.pending_work,
          blockers: form.blockers,
          hours_worked: form.hours_worked || null,
        }),
      });

      setSuccess(data.message || "Daily progress submitted successfully.");
      setForm({
        work_summary: "",
        completed_work: "",
        pending_work: "",
        blockers: "",
        hours_worked: "",
      });

      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Progress submission failed.");
    } finally {
      setProgressBusy(false);
    }
  };

  const checkedIn = Boolean(attendance?.check_in_at);
  const checkedOut = Boolean(attendance?.check_out_at);

  const attendanceStatus = !attendance
    ? "Not Checked In"
    : checkedOut
      ? "Day Completed"
      : checkedIn
        ? "Currently Working"
        : "Not Checked In";

  const attendanceStatusStyle = checkedOut
    ? "bg-blue-500/10 text-blue-600"
    : checkedIn
      ? "bg-emerald-500/10 text-emerald-600"
      : "bg-amber-500/10 text-amber-600";

  return (
    <EmployeeShell title="My Dashboard">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Welcome */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="relative z-10">
            <p className="text-sm text-primary-foreground/75">
              Employee Workspace
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Welcome back, {user?.name || "Employee"}!
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">
              Track your attendance, manage your daily work and keep your progress updated.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {user?.department && (
                <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs">
                  {user.department}
                </span>
              )}
              <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs">
                Employee Portal
              </span>
            </div>
          </div>
          <BriefcaseBusiness className="absolute -right-5 -bottom-8 size-44 text-primary-foreground/10" />
        </section>

        {/* Alerts */}
                {/* Employee Profile */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <UserCircle className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Employee Profile</h3>
              <p className="text-sm text-muted-foreground">
                Your registered employee information
              </p>
            </div>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              {user?.employeeProfile?.status || "Active"}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="mt-1 font-medium">
                {user?.employeeProfile?.fullName || user?.name || "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="mt-1 font-medium">
                {user?.employeeProfile?.employeeId || "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Designation</p>
              <p className="mt-1 font-medium">
                {user?.employeeProfile?.designation || "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="mt-1 font-medium">
                {user?.employeeProfile?.department || user?.department || "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="mt-1 flex items-center gap-2 break-all font-medium">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                {user?.employeeProfile?.email || user?.email || "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Phone Number</p>
              <p className="mt-1 font-medium">
                {user?.employeeProfile?.phone || "Not provided"}
              </p>
            </div>
          </div>
        </section>
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Today's Attendance"
            value={attendanceStatus}
            subtitle={attendance?.status || "Attendance not started"}
            icon={Clock}
          />
          <StatCard
            title="Check In"
            value={formatTime(attendance?.check_in_at)}
            subtitle="Today's arrival"
            icon={LogIn}
          />
          <StatCard
            title="Check Out"
            value={formatTime(attendance?.check_out_at)}
            subtitle="Today's departure"
            icon={LogOut}
          />
          <StatCard
            title="Progress Reports"
            value={String(progressHistory.length)}
            subtitle="Reports loaded from database"
            icon={TrendingUp}
          />
        </section>

        {/* Attendance Action */}
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Attendance</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record your attendance for today.
                </p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", attendanceStatusStyle)}>
                {attendanceStatus}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Check In Time</p>
                <p className="mt-2 text-xl font-semibold">
                  {formatTime(attendance?.check_in_at)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Check Out Time</p>
                <p className="mt-2 text-xl font-semibold">
                  {formatTime(attendance?.check_out_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!checkedIn ? (
                <button
                  type="button"
                  disabled={attendanceBusy || loading}
                  onClick={() => handleAttendance("check-in")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {attendanceBusy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Check In
                </button>
              ) : !checkedOut ? (
                <button
                  type="button"
                  disabled={attendanceBusy || loading}
                  onClick={() => handleAttendance("check-out")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {attendanceBusy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Check Out
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Attendance Completed
                </div>
              )}

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading || attendanceBusy || progressBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>

          {/* Today's Information */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold">Today's Overview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your workday at a glance.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                <CalendarDays className="size-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="mt-1 text-sm font-semibold">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
              year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                <ClipboardList className="size-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Attendance Record</p>
                  <p className="mt-1 text-sm font-semibold">
                    {attendance ? "Recorded in database" : "Awaiting check-in"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Progress */}
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <form
            onSubmit={handleProgressSubmit}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Submit Daily Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Share your work update with your manager.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Work Summary <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.work_summary}
                  onChange={(e) => setForm({ ...form, work_summary: e.target.value })}
                  placeholder="Briefly describe your work today..."
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Completed Work</label>
                <textarea
                  rows={3}
                  value={form.completed_work}
                  onChange={(e) => setForm({ ...form, completed_work: e.target.value })}
                  placeholder="What did you complete today?"
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Pending Work</label>
                <textarea
                  rows={2}
                  value={form.pending_work}
                  onChange={(e) => setForm({ ...form, pending_work: e.target.value })}
                  placeholder="What is still pending?"
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Blockers</label>
                <textarea
                  rows={2}
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  placeholder="Any blockers or challenges? Write None if there are no blockers."
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Hours Worked</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  value={form.hours_worked}
                  onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
                  placeholder="e.g. 8"
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                type="submit"
                disabled={progressBusy || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
              >
                {progressBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Submit Daily Progress
              </button>
            </div>
          </form>

          {/* Progress History */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Recent Progress</h3>
                <p className="text-sm text-muted-foreground">Your submitted work reports.</p>
              </div>
            </div>

            {progressHistory.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
                <ClipboardList className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No progress reports yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your daily updates will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {progressHistory.slice(0, 5).map((item) => (
                  <article key={item.id || item.progress_date} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDate(item.progress_date)}
                      </p>
                      {item.hours_worked != null && (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs">
                          {item.hours_worked}h
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium">{item.work_summary}</p>
                    {item.completed_work && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Completed:</span>{" "}
                        {item.completed_work}
                      </p>
                    )}
                    {item.pending_work && (
                      <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Pending:</span>{" "}
                      {item.pending_work}
                    </p>
                    )}
                    {item.blockers && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Blockers:</span>{" "}
                        {item.blockers}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Attendance History */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Attendance History</h3>
              <p className="text-sm text-muted-foreground">Your recent attendance records.</p>
            </div>
          </div>

          {attendanceHistory.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No attendance history available yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Check In</th>
                    <th className="px-3 py-3 font-medium">Check Out</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.slice(0, 10).map((item) => (
                    <tr key={item.id || item.attendance_date} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium">{formatDate(item.attendance_date)}</td>
                      <td className="px-3 py-3">{formatTime(item.check_in_at)}</td>
                      <td className="px-3 py-3">{formatTime(item.check_out_at)}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-muted px-2 py-1 text-xs">{item.status || "Present"}</span>
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
