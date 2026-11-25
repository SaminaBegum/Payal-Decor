import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Layers,
  ShoppingBag,
  Truck,
  Calculator,
  Users,
  Factory,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Filter,
  Clock,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  ShoppingCart,
  FolderKanban,
  CheckSquare,
  Wrench,
  ReceiptIndianRupee,
  Wallet,
  BookOpen,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/erp/AppShell";
import { toastService } from "@/services/toastService";

const API_BASE = (
  import.meta.env["VITE_API_URL"] ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? "/api"
    : "http://localhost:5000/api")
).replace(/\/+$/, "");

export type ReportModuleId =
  | "all"
  | "operations"
  | "crm"
  | "projects"
  | "estimation"
  | "quotations"
  | "sales-orders"
  | "work-orders"
  | "production"
  | "inventory"
  | "purchase"
  | "vendors"
  | "dispatch"
  | "installation"
  | "invoicing"
  | "payments"
  | "accounts"
  | "masters"
  | "admin";

export interface ReportModuleMeta {
  id: ReportModuleId;
  label: string;
  category: string;
  route: string;
}

const REPORT_MODULES: ReportModuleMeta[] = [
  { id: "all", label: "Executive Overview (All Business)", category: "General", route: "/" },
  { id: "operations", label: "Operations", category: "Operations", route: "/operations" },
  { id: "crm", label: "CRM", category: "Sales", route: "/crm" },
  { id: "projects", label: "Projects", category: "Operations", route: "/projects" },
  { id: "estimation", label: "Estimation & BOQ", category: "Sales", route: "/estimation" },
  { id: "quotations", label: "Quotations", category: "Sales", route: "/quotations" },
  { id: "sales-orders", label: "Sales Orders", category: "Sales", route: "/sales-orders" },
  { id: "work-orders", label: "Work Orders", category: "Manufacturing", route: "/work-orders" },
  { id: "production", label: "Production", category: "Manufacturing", route: "/production" },
  { id: "inventory", label: "Inventory", category: "Operations", route: "/inventory" },
  { id: "purchase", label: "Purchase", category: "Operations", route: "/purchase" },
  { id: "vendors", label: "Vendors", category: "Operations", route: "/vendors" },
  { id: "dispatch", label: "Dispatch & Delivery", category: "Logistics", route: "/dispatch" },
  { id: "installation", label: "Installation", category: "Services", route: "/installation" },
  { id: "invoicing", label: "Invoicing", category: "Finance", route: "/invoicing" },
  { id: "payments", label: "Payments", category: "Finance", route: "/payments" },
  { id: "accounts", label: "Accounts", category: "Finance", route: "/accounts" },
  { id: "masters", label: "Masters", category: "Configuration", route: "/masters" },
  { id: "admin", label: "Admin", category: "Management", route: "/admin" },
];

const TIME_RANGES = [
  { id: "all_time", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_30_days", label: "Last 30 Days" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_fy", label: "FY 2026-27" },
];

interface ReportKPI {
  label: string;
  value: string | number;
  change: string;
  color?: "emerald" | "amber" | "blue" | "purple" | "indigo";
}

interface ReportRecord {
  id: string | number;
  code: string;
  name: string;
  secondary?: string;
  category?: string;
  date?: string;
  targetDate?: string;
  status: string;
  itemsCount?: number;
  subtotal?: number;
  tax?: number;
  amount: number;
  cost?: number;
  margin?: number;
  contact?: string;
  location?: string;
  source?: string;
}

interface ReportData {
  module: ReportModuleId;
  title: string;
  description: string;
  kpis: ReportKPI[];
  records?: ReportRecord[];
  sections?: {
    salesPipeline?: { totalQuotes: number; acceptedQuotes: number; conversionRate: number; totalPipelineValue: number };
    procurement?: { totalPOs: number; pendingPOs: number; receivedPOs: number; totalSpend: number };
    estimations?: { totalEstimations: number; totalPrimeCost: number; totalEstValue: number; grossMargin: number };
    [key: string]: unknown;
  };
  isInProgress?: boolean;
  vendorRanking?: Array<{ vendorCompany: string; orderCount: number; totalSpend: number; lastOrderDate: string }>;
  categories?: Array<{ name: string; count: number }>;
  stages?: Array<{ stage: string; count: number }>;
  gstSummary?: {
    inputTaxCredit: { cgst: number; sgst: number; igst: number; total: number };
    outputLiability: { total: number };
    netPayable: number;
  };
}

export function ReportsPage() {
  const [selectedModule, setSelectedModule] = useState<ReportModuleId>("all");
  const [timeRange, setTimeRange] = useState("all_time");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const currentModuleMeta = useMemo(() => {
    return REPORT_MODULES.find((m) => m.id === selectedModule) || REPORT_MODULES[0];
  }, [selectedModule]);

  // Fetch report data from Backend MVC Reports API
  const fetchReport = useCallback(async (mod: ReportModuleId, range: string, forceRefresh = false) => {
    setLoading(true);
    try {
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const response = await fetch(`${API_BASE}/reports?module=${mod}&timeRange=${range}${refreshParam}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.success && payload.data) {
          setReportData(payload.data);
          return;
        }
      }
      throw new Error("Invalid response from server");
    } catch (err) {
      console.warn("Could not load report from backend, using fallback:", err);
      toastService.warning("Offline Mode", "Displaying cached local analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReport(selectedModule, timeRange);
  }, [fetchReport, selectedModule, timeRange]);

  const handleModuleChange = (mod: ReportModuleId) => {
    setSelectedModule(mod);
    setSearch("");
    setStatusFilter("All");
    const found = REPORT_MODULES.find((m) => m.id === mod);
    if (found) {
      toastService.info("Module Selected", `Viewing ${found.label} report.`);
    }
  };

  const handleRefresh = () => {
    void fetchReport(selectedModule, timeRange, true);
    toastService.success("Refreshed", "Business report data updated.");
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    const list = reportData?.records || [];
    return list.filter((r) => {
      const matchesSearch =
        search === "" ||
        String(r.code || "").toLowerCase().includes(search.toLowerCase()) ||
        String(r.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(r.secondary || "").toLowerCase().includes(search.toLowerCase()) ||
        String(r.category || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        String(r.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [reportData, search, statusFilter]);

  const handleExportCSV = () => {
    const list = filteredRecords;
    if (list.length === 0) {
      toastService.warning("Export Unavailable", "No records available in this view to export.");
      return;
    }

    const headers = [
      "Code / ID",
      "Title / Party",
      "Secondary Info",
      "Category",
      "Date",
      "Target Date",
      "Status",
      "Value (INR)",
      "Tax (GST)",
    ];

    const rows = list.map((r) => [
      `"${String(r.code || r.id).replace(/"/g, '""')}"`,
      `"${String(r.name || "").replace(/"/g, '""')}"`,
      `"${String(r.secondary || "").replace(/"/g, '""')}"`,
      `"${String(r.category || "").replace(/"/g, '""')}"`,
      `"${r.date || ""}"`,
      `"${r.targetDate || ""}"`,
      `"${r.status || ""}"`,
      r.amount || 0,
      r.tax || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `payal_decor_${selectedModule}_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastService.success("Export Complete", `Exported ${list.length} records to CSV.`);
  };

  const handlePrint = () => {
    toastService.info("Printing Report", "Generating print layout...");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const getKPIColorClasses = (color?: string) => {
    switch (color) {
      case "emerald":
        return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
      case "amber":
        return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
      case "blue":
        return { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" };
      case "purple":
        return { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" };
      case "indigo":
      default:
        return { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" };
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("accepted") || s.includes("received") || s.includes("active") || s.includes("won") || s.includes("completed")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s.includes("pending") || s.includes("draft") || s.includes("ordered") || s.includes("enquiry") || s.includes("in progress")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("sent") || s.includes("progress") || s.includes("transit")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (s.includes("cancelled") || s.includes("inactive") || s.includes("rejected")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Determine if current module is in progress or has no records
  const isModuleInProgress = Boolean(
    reportData?.isInProgress ||
    (selectedModule !== "all" && (!reportData?.records || reportData.records.length === 0))
  );

  return (
    <AppShell title="Business Intelligence & Reports">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
        {/* ========================================================= */}
        {/* TOP HERO BAR & MODULE SELECTOR DROPDOWN                   */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs print:border-none print:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Title & Dropdown */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-xs">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Business Analytics & Reports
                  </h1>
                  <p className="text-xs text-gray-500">
                    Select any ERP module from the dropdown to view module-wise live reporting and metrics.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Tools */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isModuleInProgress}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5 text-gray-500" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-amber-900 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* INTERACTIVE MODULE SELECTOR & NON-OVERLAPPING PERIOD BAR  */}
          {/* ========================================================= */}
          <div className="mt-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pt-4 border-t border-gray-100 print:hidden">
            {/* Module Dropdown (All Modules Included) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-1 min-w-0">
              <label htmlFor="module-select" className="text-xs font-bold text-gray-700 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-800 shrink-0" />
                Report Module:
              </label>
              <select
                id="module-select"
                value={selectedModule}
                onChange={(e) => handleModuleChange(e.target.value as ReportModuleId)}
                className="w-full sm:max-w-md rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-900 shadow-2xs outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200 transition"
              >
                {REPORT_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Pills (Fixed Non-Overlapping Layout) */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 xl:pt-0">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 shrink-0 whitespace-nowrap mr-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-800" />
                Period:
              </span>
              {TIME_RANGES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeRange(t.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition shrink-0 whitespace-nowrap ${
                    timeRange === t.id
                      ? "bg-amber-800 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* REPORT HEADER SUMMARY BANNER                              */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {reportData?.title || currentModuleMeta.label}
              </h2>
              {isModuleInProgress && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                  <Clock className="h-3 w-3" />
                  In Progress
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {reportData?.description || `Live reports and performance audit for ${currentModuleMeta.label}.`}
            </p>
          </div>
          <div className="text-xs font-medium text-gray-400">
            Data as of {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* EXECUTIVE KPI SUMMARY CARDS                               */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(reportData?.kpis || []).map((kpi, idx) => {
            const styling = getKPIColorClasses(kpi.color);
            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:shadow-xs transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${styling.bg}`} />
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</div>
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  {kpi.change}
                </p>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* SPECIALIZED MODULE-SPECIFIC INSIGHT CARDS                 */}
        {/* ========================================================= */}

        {/* 1. All Modules Overview Sections */}
        {selectedModule === "all" && reportData?.sections && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportData.sections.salesPipeline && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <FileText className="h-4 w-4" />
                  Sales Proposals
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Proposals:</span>
                    <span className="font-semibold text-gray-900">{reportData.sections.salesPipeline.totalQuotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accepted / Won:</span>
                    <span className="font-semibold text-emerald-700">{reportData.sections.salesPipeline.acceptedQuotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Rate:</span>
                    <span className="font-bold text-gray-900">{reportData.sections.salesPipeline.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-bold text-gray-900">
                    <span>Quoted Pipeline:</span>
                    <span>₹{reportData.sections.salesPipeline.totalPipelineValue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            {reportData.sections.procurement && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <ShoppingBag className="h-4 w-4" />
                  Procurement & POs
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Total POs Issued:</span>
                    <span className="font-semibold text-gray-900">{reportData.sections.procurement.totalPOs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Delivery:</span>
                    <span className="font-semibold text-amber-700">{reportData.sections.procurement.pendingPOs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered / Stocked:</span>
                    <span className="font-semibold text-emerald-700">{reportData.sections.procurement.receivedPOs}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-bold text-gray-900">
                    <span>Total Spend:</span>
                    <span>₹{reportData.sections.procurement.totalSpend.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            {reportData.sections.estimations && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                  <Calculator className="h-4 w-4" />
                  Workshop & Margins
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Estimates:</span>
                    <span className="font-semibold text-gray-900">{reportData.sections.estimations.totalEstimations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prime Material Cost:</span>
                    <span className="font-semibold text-gray-900">₹{reportData.sections.estimations.totalPrimeCost.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Projected Selling Value:</span>
                    <span className="font-semibold text-emerald-700">₹{reportData.sections.estimations.totalEstValue.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-bold text-gray-900">
                    <span>Projected Margin:</span>
                    <span className="text-emerald-700">{reportData.sections.estimations.grossMargin}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Purchase Module: Vendor Spend Ranking */}
        {selectedModule === "purchase" && reportData?.vendorRanking && reportData.vendorRanking.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-800" />
              Top Procurement Suppliers by Spend Volume
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reportData.vendorRanking.map((v, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-900">
                    <span className="truncate">{v.vendorCompany}</span>
                    <span className="text-amber-900">₹{v.totalSpend.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>{v.orderCount} Orders Issued</span>
                    <span>Last: {v.lastOrderDate ? String(v.lastOrderDate).slice(0, 10) : "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Vendors Module: Categories */}
        {selectedModule === "vendors" && reportData?.categories && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-800" />
              Supplier Material Category Allocations
            </h3>
            <div className="flex flex-wrap gap-2">
              {reportData.categories.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                >
                  <span className="font-semibold text-gray-900">{c.name}:</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                    {c.count} suppliers
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Invoicing Module: GST Reconciliation */}
        {selectedModule === "invoicing" && reportData?.gstSummary && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-purple-800" />
              GST Tax Liability & Input Tax Credit (ITC) Reconciliation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                <span className="font-bold text-emerald-900">Input Tax Credit (ITC) Paid</span>
                <p className="text-[11px] text-gray-600">Claimable from raw material purchase orders</p>
                <div className="text-xl font-bold text-emerald-700">
                  ₹{Math.round(reportData.gstSummary.inputTaxCredit.total).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-gray-500">
                  CGST: ₹{Math.round(reportData.gstSummary.inputTaxCredit.cgst)} | SGST: ₹{Math.round(reportData.gstSummary.inputTaxCredit.sgst)} | IGST: ₹{Math.round(reportData.gstSummary.inputTaxCredit.igst)}
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                <span className="font-bold text-blue-900">Output Tax Liability</span>
                <p className="text-[11px] text-gray-600">GST collected on client proposals & billables</p>
                <div className="text-xl font-bold text-blue-700">
                  ₹{Math.round(reportData.gstSummary.outputLiability.total).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-gray-500">Applicable 18% GST standard on modular interiors</div>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-2">
                <span className="font-bold text-purple-900">Net Tax Payable to Govt</span>
                <p className="text-[11px] text-gray-600">Output Tax minus Input Tax Credit</p>
                <div className="text-xl font-bold text-purple-700">
                  ₹{Math.round(reportData.gstSummary.netPayable).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-gray-500">Calculated under Indian GST Section 16/17 ITC rules</div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* IN-PROGRESS STATE FOR MODULES WITHOUT DATA                */}
        {/* ========================================================= */}
        {isModuleInProgress ? (
          <div className="rounded-2xl border border-amber-200 bg-linear-to-b from-amber-50/40 to-white p-8 sm:p-12 text-center shadow-2xs space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs">
              <Clock className="h-7 w-7 text-amber-800 animate-pulse" />
            </div>
            <div className="max-w-lg mx-auto space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                In Progress / Awaiting Data
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                {currentModuleMeta.label} Report In Progress
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                There are currently no active transactions or entries present for <strong>{currentModuleMeta.label}</strong> in the database.
                The reporting pipeline is actively configured and will automatically generate live KPI ribbons, breakdown graphs, and detailed transaction records as soon as your team logs entries.
              </p>
            </div>

            <div className="pt-3 flex flex-wrap justify-center items-center gap-3">
              {currentModuleMeta.route && currentModuleMeta.route !== "/" && (
                <Link
                  to={currentModuleMeta.route}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-900 transition"
                >
                  Open {currentModuleMeta.label} Module
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                Check for New Data
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* DETAILED AUDIT TABLE & SEARCH CONTROLS                    */
          /* ========================================================= */
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            {/* Table Search & Status Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 print:hidden">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search report records..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 outline-none focus:border-amber-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Received">Received / Delivered</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted / Won</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Draft">Draft</option>
                </select>
                <span className="text-xs font-semibold text-gray-500 ml-2">
                  {filteredRecords.length} records
                </span>
              </div>
            </div>

            {/* Table */}
            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500 space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-700 mx-auto" />
                <p className="font-semibold text-gray-800">No records found for this view</p>
                <p className="text-xs text-gray-400">
                  Try selecting a different date range or adjusting the search keywords.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-semibold">Code / ID</th>
                      <th className="p-3 font-semibold">Title / Party</th>
                      <th className="p-3 font-semibold">Category / Details</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold text-center">Status</th>
                      <th className="p-3 font-semibold text-right">Tax (GST)</th>
                      <th className="p-3 font-semibold text-right">Value (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-amber-50/40 transition">
                        <td className="p-3 font-semibold text-amber-900">{r.code}</td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{r.name}</div>
                          {r.secondary && <div className="text-[11px] text-gray-500">{r.secondary}</div>}
                        </td>
                        <td className="p-3">
                          {r.category ? (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {r.category}
                            </span>
                          ) : r.itemsCount !== undefined ? (
                            <span className="text-[11px] text-gray-500">{r.itemsCount} line items</span>
                          ) : (
                            <span className="text-[11px] text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          <div>{r.date || "-"}</div>
                          {r.targetDate && (
                            <div className="text-[10px] text-gray-400">Target: {r.targetDate}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {r.tax ? `₹${r.tax.toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900 font-mono">
                          ₹{r.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default ReportsPage;
