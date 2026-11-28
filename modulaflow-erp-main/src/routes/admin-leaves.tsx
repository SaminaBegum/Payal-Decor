
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  XCircle,
  X,
  MessageSquare,
  UserRound,
  CalendarCheck,
} from "lucide-react";

import { AppShell } from "@/components/erp/AppShell";
import { getAuthToken } from "@/lib/auth";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

interface LeaveApplication {
  id: string | number;
  employee_id?: string;
  full_name?: string;
  email?: string;
  employee_name?: string;
  employee_email?: string;
  employee_code?: string;

  department?: string;
  designation?: string;
  leave_type_id?: string | number;
  leave_type_name?: string;
  leave_type?: string;
  reason?: string;
  start_date: string;
  end_date: string;
  total_days?: number | string;
  duration?: number | string;
  status: LeaveStatus;
  admin_remarks?: string | null;
  created_at?: string;
  applied_at?: string;
}

type FilterStatus = "All" | LeaveStatus;

const formatDate = (value?: string) => {
  if (!value) return "—";

  const datePart = value.slice(0, 10);
  const parts = datePart.split("-");

  if (parts.length !== 3) return value;

  const [year, month, day] = parts;

  return `${day}-${month}-${year}`;
};

const getEmployeeName = (leave: LeaveApplication) =>
  leave.full_name || leave.employee_name || leave.email || leave.employee_email || "Employee";

const getLeaveType = (leave: LeaveApplication) =>
  leave.leave_type_name || leave.leave_type || "Leave";

const getDuration = (leave: LeaveApplication) =>
  Number(leave.total_days ?? leave.duration ?? 0);

const getErrorMessage = (
  data: { message?: string } | null | undefined,
  fallback: string,
) => data?.message || fallback;

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [search, setSearch] = useState("");
  const [selectedLeave, setSelectedLeave] =
    useState<LeaveApplication | null>(null);
  const [reviewStatus, setReviewStatus] =
    useState<"Approved" | "Rejected">("Approved");
  const [remarks, setRemarks] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const getHeaders = () => {
    const token = getAuthToken();

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchLeaves = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API_BASE}/admin/leaves`, {
        method: "GET",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to load leave applications.")
        );
      }

      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load leave applications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const counts = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((leave) => leave.status === "Pending").length,
      approved: leaves.filter((leave) => leave.status === "Approved").length,
      rejected: leaves.filter((leave) => leave.status === "Rejected").length,
    }),
    [leaves]
  );

  const filteredLeaves = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leaves.filter((leave) => {
      const matchesStatus =
        filter === "All" || leave.status === filter;

      const matchesSearch =
        !term ||
        [
          getEmployeeName(leave),
          leave.employee_email,
          leave.employee_code,
          leave.department,
          leave.designation,
          getLeaveType(leave),
          leave.reason,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [leaves, filter, search]);

  const openReview = (
    leave: LeaveApplication,
    status: "Approved" | "Rejected"
  ) => {
    setSelectedLeave(leave);
    setReviewStatus(status);
    setRemarks("");
    setError("");
    setSuccess("");
  };

  const submitReview = async () => {
    if (!selectedLeave) return;

    setReviewing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE}/admin/leaves/${selectedLeave.id}/review`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            status: reviewStatus,
            admin_remarks: remarks.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to review leave application.")
        );
      }

      setSuccess(
        data.message ||
          `Leave application ${reviewStatus.toLowerCase()} successfully.`
      );

      setSelectedLeave(null);
      setRemarks("");

      await fetchLeaves(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to review leave application."
      );
    } finally {
      setReviewing(false);
    }
  };

  const statusStyle = (status: LeaveStatus) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
                <CalendarCheck size={17} />
                Human Resources
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Leave Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review and manage employee leave applications.
              </p>
            </div>

            <button
              onClick={() => fetchLeaves(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <XCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Total Applications"
              value={counts.total}
              icon={<FileText size={20} />}
              color="indigo"
            />
            <SummaryCard
              label="Pending"
              value={counts.pending}
              icon={<Clock3 size={20} />}
              color="amber"
            />
            <SummaryCard
              label="Approved"
              value={counts.approved}
              icon={<CheckCircle2 size={20} />}
              color="emerald"
            />
            <SummaryCard
              label="Rejected"
              value={counts.rejected}
              icon={<XCircle size={20} />}
              color="red"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Employee Leave Applications
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredLeaves.length} application
                    {filteredLeaves.length === 1 ? "" : "s"} found
                  </p>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search employee, email or leave type..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {(
                  ["All", "Pending", "Approved", "Rejected", "Cancelled"] as FilterStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filter === status
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status}
                    {status === "All"
                      ? ` (${counts.total})`
                      : status === "Pending"
                        ? ` (${counts.pending})`
                        : status === "Approved"
                          ? ` (${counts.approved})`
                          : status === "Rejected"
                            ? ` (${counts.rejected})`
                            : ""}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
                <RefreshCw size={18} className="animate-spin" />
                Loading leave applications...
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400">
                  <CalendarDays size={30} />
                </div>
                <h3 className="font-semibold text-slate-800">
                  No leave applications found
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Applications matching your selected filter will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Employee</th>
                        <th className="px-5 py-4 font-semibold">Leave Type</th>
                        <th className="px-5 py-4 font-semibold">Leave Period</th>
                        <th className="px-5 py-4 font-semibold">Days</th>
                        <th className="px-5 py-4 font-semibold">Applied On</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredLeaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <UserRound size={19} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">
                                  {getEmployeeName(leave)}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {leave.employee_code ||
                                    leave.employee_email ||
                                    leave.department ||
                                    "Employee"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {getLeaveType(leave)}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            <div>{formatDate(leave.start_date)}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              to {formatDate(leave.end_date)}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {getDuration(leave)}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(leave.applied_at || leave.created_at)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                                leave.status
                              )}`}
                            >
                              {leave.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  openReview(leave, "Approved")
                                }
                                disabled={leave.status !== "Pending"}
                                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  openReview(leave, "Rejected")
                                }
                                disabled={leave.status !== "Pending"}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-3 md:hidden">
                  {filteredLeaves.map((leave) => (
                    <article
                      key={leave.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <UserRound size={19} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-800">
                              {getEmployeeName(leave)}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {leave.employee_email || leave.employee_code || "Employee"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Leave Type</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {getLeaveType(leave)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Duration</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {getDuration(leave)} days
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">From</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {formatDate(leave.start_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">To</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {formatDate(leave.end_date)}
                          </p>
                        </div>
                      </div>

                      {leave.reason && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-500">
                            Reason
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {leave.reason}
                          </p>
                        </div>
                      )}

                      {leave.admin_remarks && (
                        <div className="mt-3 rounded-lg bg-indigo-50 p-3">
                          <p className="text-xs font-semibold text-indigo-600">
                            Admin Remarks
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {leave.admin_remarks}
                          </p>
                        </div>
                      )}

                      {leave.status === "Pending" && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openReview(leave, "Approved")}
                            className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReview(leave, "Rejected")}
                            className="rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {reviewStatus === "Approved"
                    ? "Approve Leave"
                    : "Reject Leave"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {getEmployeeName(selectedLeave)} · {getLeaveType(selectedLeave)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                disabled={reviewing}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-800">
                  {formatDate(selectedLeave.start_date)} –{" "}
                  {formatDate(selectedLeave.end_date)}
                </p>
                <p className="mt-1 text-slate-500">
                  {getDuration(selectedLeave)} day(s)
                </p>
                {selectedLeave.reason && (
                  <p className="mt-3 whitespace-pre-wrap text-slate-600">
                    {selectedLeave.reason}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-remarks"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <MessageSquare size={15} />
                  Admin Remarks (Optional)
                </label>
                <textarea
                  id="admin-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Add a note for the employee..."
                  className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {remarks.length}/2000
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setSelectedLeave(null)}
                  disabled={reviewing}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={reviewing}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                    reviewStatus === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {reviewing
                    ? "Processing..."
                    : reviewStatus === "Approved"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "indigo" | "amber" | "emerald" | "red";
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {label}
        </p>
        <div className={`rounded-xl p-2 ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
