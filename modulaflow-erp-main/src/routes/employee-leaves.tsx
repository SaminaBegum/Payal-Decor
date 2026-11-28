
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { EmployeeShell } from "@/components/erp/EmployeeShell";
import { getAuthToken } from "@/lib/auth";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

type LeaveType = {
  id: string;
  name: string;
  description?: string | null;
  is_paid: boolean;
  annual_limit: number | null;
};

type LeaveRecord = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  admin_remarks?: string | null;
  reviewer_name?: string | null;
  created_at: string;
};
const formatLeaveDate = (value?: string) => {
  if (!value) return "—";

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return value;

  return `${day}-${month}-${year}`;
};
export default function EmployeeLeaves() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

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

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [typesData, leavesData] = await Promise.all([
        apiRequest("/leaves/types"),
        apiRequest("/leaves/my"),
      ]);

      setLeaveTypes(typesData.leaveTypes || []);
      setLeaves(leavesData.leaves || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load leave information.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/leaves", {
        method: "POST",
        body: JSON.stringify({
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      setSuccess(data.message || "Leave application submitted successfully.");
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");

      await loadLeaves();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit leave application.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/leaves/${leaveId}/cancel`, {
        method: "PATCH",
      });

      setSuccess(data.message || "Leave application cancelled.");
      await loadLeaves();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to cancel leave application.",
      );
    } finally {
      setBusy(false);
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-500/10 text-emerald-600";
      case "Rejected":
        return "bg-red-500/10 text-red-600";
      case "Pending":
        return "bg-amber-500/10 text-amber-600";
      case "Cancelled":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const pendingCount = leaves.filter((leave) => leave.status === "Pending").length;
  const approvedCount = leaves.filter((leave) => leave.status === "Approved").length;

  return (
    <EmployeeShell title="My Leaves">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Leave Management
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apply for leave and track your application status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeaves}
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              Total Applications
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {leaves.length}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" />
              Pending
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Approved
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {approvedCount}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Apply for Leave
            </h3>
          </div>

          <form onSubmit={handleApply} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Leave Type
                </label>
                <select
                  required
                  value={leaveTypeId}
                  onChange={(event) => setLeaveTypeId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.is_paid ? "(Paid)" : "(Unpaid)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Reason
                </label>
                <input
                  required
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Enter reason for leave"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Start Date
                </label>
                <input
                  required
                  type="date"
                  value={startDate}
                  min={new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                  })}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  End Date
                </label>
                <input
                  required
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                  })}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {leaveTypeId && (
              <p className="text-xs text-muted-foreground">
                {leaveTypes.find((type) => type.id === leaveTypeId)?.description ||
                  "Select your leave dates and provide a reason."}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || loading || leaveTypes.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Submit Leave Application
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h3 className="font-semibold text-foreground">
                My Leave History
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Track submitted, approved and rejected applications.
              </p>
            </div>
            <CalendarDays className="size-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading leave history...
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarDays className="mx-auto size-9 text-muted-foreground/50" />
              <p className="mt-3 font-medium text-foreground">
                No leave applications yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your leave applications will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Leave Type</th>
                    <th className="px-5 py-3 font-medium">From</th>
                    <th className="px-5 py-3 font-medium">To</th>
                    <th className="px-5 py-3 font-medium">Days</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4 font-medium text-foreground">
                        {leave.leave_type}
                      </td>
                     <td className="px-5 py-4 text-muted-foreground">
  {formatLeaveDate(leave.start_date)}
</td>
                      <td className="px-5 py-4 text-muted-foreground">
  {formatLeaveDate(leave.end_date)}
</td>
                      <td className="px-5 py-4 text-foreground">
                        {leave.total_days}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            leave.status,
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {leave.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(leave.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            <XCircle className="size-4" />
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            --
                          </span>
                        )}
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
