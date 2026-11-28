import { useCallback, useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export type KpiKey = "sales" | "projects" | "quotations" | "invoices" | "outstanding";

export interface DashboardKpi {
  key: KpiKey;
  label: string;
  kind: "money" | "count";
  value: number;
  delta: number | null;
  compare: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  salesTrend: { month: string; sales: number }[];
  salesByCategory: { name: string; value: number; amount: number }[];
  topProjects: {
    name: string;
    customer: string;
    status: "In Progress" | "Completed" | "Pending";
    progress: number;
    value: number;
  }[];
  inventorySummary: { item: string; qty: string; status: "Low Stock" | "In Stock" | null }[];
  outstandingInvoices: { no: string; customer: string; due: string | null; amount: number }[];
  activities: {
    id: string;
    kind: "quotation" | "production" | "invoice" | "payment" | "alert";
    title: string;
    detail: string;
    at: string;
  }[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Your login session has expired. Please log in again.");

      const res = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to load dashboard data.");
      }
      setData(json as DashboardData);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/* ---------------------------- formatters ---------------------------- */

export function formatMoney(n: number): string {
  if (n >= 1e7) return `₹ ${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹ ${(n / 1e5).toFixed(2)} L`;
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Returns text like "5 mins ago", which the existing translator already understands.
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}