
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Flag,
} from "lucide-react";

import { EmployeeShell } from "@/components/erp/EmployeeShell";
import { getAuthToken } from "@/lib/auth";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

type OperationTask = {
  id: string | number;
  taskId: string;
  workstream: string;
  taskActivity: string;
  priority: string;
  employee: string;
  primaryResponsible: string;
  expectedDeliverable: string;
  targetDate: string;
  status: string;
  remarks?: string;
};

const STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Blocked",
  "Pending",
  "Under Review",
];

function formatDate(value?: string | null) {
  if (!value) return "--";

  const dateValue = String(value);
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

function statusStyle(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-600";
    case "In Progress":
      return "bg-blue-500/10 text-blue-600";
    case "Blocked":
      return "bg-red-500/10 text-red-600";
    case "On Hold":
      return "bg-amber-500/10 text-amber-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function EmployeeTasks() {
  const [tasks, setTasks] = useState<OperationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState<string | number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/operations");
      setTasks(data.tasks || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const updateTaskStatus = async (
    task: OperationTask,
    newStatus: string,
  ) => {
    setBusyTask(task.id);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/operations/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: newStatus } : item,
        ),
      );

      setSuccess(data.message || `Task ${task.taskId} status updated.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update task status.",
      );
    } finally {
      setBusyTask(null);
    }
  };

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        [task.taskId, task.taskActivity, task.workstream]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const completedCount = tasks.filter(
    (task) => task.status === "Completed",
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.status === "In Progress",
  ).length;

  return (
    <EmployeeShell title="My Tasks">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Employee Workspace / My Tasks
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              My Assigned Tasks
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View your assigned work and update task progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="mt-2 text-2xl font-bold">{tasks.length}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="mt-2 text-2xl font-bold">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-2 text-2xl font-bold">{completedCount}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
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

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <ClipboardList className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Assigned Work</h3>
              <p className="text-sm text-muted-foreground">
                {filteredTasks.length} of {tasks.length} tasks
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search task ID, activity or workstream..."
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading your tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <ClipboardList className="mx-auto mb-3 size-9 text-muted-foreground" />
              <p className="font-medium">
                {tasks.length === 0
                  ? "No tasks assigned to you yet."
                  : "No matching tasks found."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tasks.length === 0
                  ? "Your manager's assigned tasks will appear here."
                  : "Try changing your search or status filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-border p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {task.taskId}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                          {task.workstream || "General"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h4 className="mt-3 font-semibold">
                        {task.taskActivity}
                      </h4>

                      {task.expectedDeliverable && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Expected Deliverable:
                          </span>{" "}
                          {task.expectedDeliverable}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Flag className="size-3.5" />
                          Priority: {task.priority || "--"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          Target: {formatDate(task.targetDate)}
                        </span>
                      </div>

                      {task.remarks && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Remarks: {task.remarks}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 lg:min-w-48 lg:justify-end">
                      {busyTask === task.id && (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      )}

                      <select
                        aria-label={`Update status for ${task.taskId}`}
                        value={task.status}
                        disabled={busyTask === task.id}
                        onChange={(event) =>
                          updateTaskStatus(task, event.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </EmployeeShell>
  );
}
