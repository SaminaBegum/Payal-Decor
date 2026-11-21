import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Eye,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Calculator,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/erp/AppShell";
import {
  EstimateDocument,
  QUOTATION_TERMS,
  amountInWords,
  calcEstimate,
  type EstimateData,
} from "@/components/erp/EstimateDocument";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const UNITS = ["Nos", "Sqf", "Sqm", "Rft", "Trip", "Lot", "Set"];

/** Unified saved estimate item for quotation conversion */
interface SavedEstimateOption {
  id: string;
  source: "studio" | "document";
  estimateNo: string;
  estimateDate?: string;
  customerName: string;
  customerAddress?: string | null;
  projectName?: string | null;
  placeOfSupply?: string;
  taxRate: number;
  total?: number;
  items: QuotationItem[];
  terms?: string[] | null;
}

interface QuotationItem {
  id: string;
  itemName: string;
  description: string;
  hsn: string;
  sizes: string;
  quantity: number;
  unit: string;
  rate: number;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerId?: string | null;
  customerName: string;
  customerAddress: string;
  projectName: string;
  estimateId: string | null;
  quotationDate: string;
  validUntil: string;
  status: string;
  gstRate: number;
  placeOfSupply: string;
  terms: string[];
  notes: string;
  items: QuotationItem[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  createdAt?: string;
}

type QuotationForm = {
  customerName: string;
  customerAddress: string;
  projectName: string;
  estimateId: string;
  quotationDate: string;
  validUntil: string;
  status: string;
  gstRate: string;
  placeOfSupply: string;
  termsText: string;
  notes: string;
  items: QuotationItem[];
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";

const PRINT_FIX = `
@media print {
  body > *:not(.est-portal) { display: none !important; }
  .est-overlay {
    position: static !important;
    overflow: visible !important;
    background: #fff !important;
    padding: 0 !important;
  }
}
`;

const emptyItem = (): QuotationItem => ({
  id: crypto.randomUUID(),
  itemName: "",
  description: "",
  hsn: "9403",
  sizes: "",
  quantity: 1,
  unit: "Nos",
  rate: 0,
});

const createEmptyForm = (): QuotationForm => ({
  customerName: "",
  customerAddress: "",
  projectName: "",
  estimateId: "",
  quotationDate: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: "Draft",
  gstRate: "18",
  placeOfSupply: "27-Maharashtra",
  termsText: QUOTATION_TERMS.join("\n"),
  notes: "",
  items: [emptyItem()],
});

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("payal_decor_auth_token")
      : null;
  const reqHeaders: Record<string, string> = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const urlsToTry = [`${API_BASE}${cleanPath}`, `/api${cleanPath}`];
  let lastError: Error | null = null;

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: reqHeaders,
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        return data as T;
      }
      lastError = new Error(data.message || `Request failed (${response.status})`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to communicate with API server");
}

function unwrapList<T>(response: unknown, keys: string[]): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== "object") return [];

  const object = response as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as T[];
  }
  if (object.data && typeof object.data === "object") {
    return unwrapList<T>(object.data, keys);
  }
  return [];
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getTotals(items: QuotationItem[], gstRate: number) {
  const { subTotal, taxAmount, roundOff, total } = calcEstimate(
    items.map((i) => ({
      name: i.itemName,
      qty: Math.max(0, Number(i.quantity) || 0),
      price: Math.max(0, Number(i.rate) || 0),
    })),
    gstRate,
  );

  return { subtotal: subTotal, gstAmount: taxAmount, roundOff, grandTotal: total };
}

function normalizeItem(row: any): QuotationItem {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    itemName: row.itemName ?? row.name ?? "",
    description: row.description ?? "",
    hsn: row.hsn ?? "9403",
    sizes: row.sizes ?? "",
    quantity: Number(row.quantity ?? row.qty ?? 1),
    unit: row.unit ?? "Nos",
    rate: Number(row.rate ?? row.unitPrice ?? row.price ?? row.unitSellingPrice ?? 0),
  };
}

function normalizeQuotation(row: any): Quotation {
  const items = Array.isArray(row.items) ? row.items.map(normalizeItem) : [];
  const gstRate = Number(row.gstRate ?? 18);
  const totals = getTotals(items, gstRate);

  return {
    id: String(row.id),
    quotationNo: row.quotationNo || row.quotationNumber || "QT-PENDING",
    customerId: row.customerId != null ? String(row.customerId) : null,
    customerName: row.customerName ?? "",
    customerAddress: row.customerAddress ?? "",
    projectName: row.projectName ?? "",
    estimateId: row.estimateId != null ? String(row.estimateId) : null,
    quotationDate: row.quotationDate ? String(row.quotationDate).slice(0, 10) : "",
    validUntil: row.validUntil ? String(row.validUntil).slice(0, 10) : "",
    status: row.status ?? "Draft",
    gstRate,
    placeOfSupply: row.placeOfSupply ?? "27-Maharashtra",
    terms: Array.isArray(row.terms) ? row.terms : [],
    notes: row.notes ?? "",
    items,
    subtotal: Number(row.subtotal ?? totals.subtotal),
    gstAmount: Number(row.gstAmount ?? totals.gstAmount),
    grandTotal: Number(row.grandTotal ?? totals.grandTotal),
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
  };
}

function toDocData(q: Quotation): EstimateData {
  return {
    estimateNo: q.quotationNo,
    date: q.quotationDate || new Date().toISOString().slice(0, 10),
    customerName: q.customerName,
    customerAddress: q.customerAddress || undefined,
    placeOfSupply: q.placeOfSupply || "27-Maharashtra",
    items: q.items.map((i) => ({
      name: i.itemName,
      description: i.description,
      hsn: i.hsn,
      sizes: i.sizes,
      qty: i.quantity,
      unit: i.unit,
      price: i.rate,
    })),
    taxRate: q.gstRate,
    terms: q.terms && q.terms.length
      ? q.terms
      : q.notes
        ? q.notes.split("\n").filter(Boolean)
        : QUOTATION_TERMS,
  };
}

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [estimates, setEstimates] = useState<SavedEstimateOption[]>([]);

  const [form, setForm] = useState<QuotationForm>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Quotation | null>(null);
  const [preview, setPreview] = useState<EstimateData | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load Quotations
  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<unknown>("/quotations");
      const list = unwrapList<any>(response, ["quotations", "data"]).map(normalizeQuotation);
      setQuotations(list);
    } catch (err) {
      console.error("Could not load quotations:", err);
      setError(
        err instanceof Error
          ? `Quotations could not load: ${err.message}`
          : "Quotations could not load from database.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Saved Estimates from BOTH /api/estimate-docs AND /api/estimations
  const loadEstimates = useCallback(async () => {
    const unified: SavedEstimateOption[] = [];

    // 1. Fetch from /api/estimate-docs (Print builder estimates)
    try {
      const docRes = await apiRequest<unknown>("/estimate-docs");
      const docList = unwrapList<any>(docRes, ["estimates", "data"]);
      for (const d of docList) {
        unified.push({
          id: String(d.id),
          source: "document",
          estimateNo: d.estimateNo || "EST-DOC",
          estimateDate: d.estimateDate,
          customerName: d.customerName || "Client",
          customerAddress: d.customerAddress || "",
          projectName: d.projectName || "Custom Interior",
          placeOfSupply: d.placeOfSupply || "27-Maharashtra",
          taxRate: Number(d.taxRate ?? 18),
          total: Number(d.total ?? 0),
          terms: Array.isArray(d.terms) ? d.terms : null,
          items: Array.isArray(d.items) ? d.items.map(normalizeItem) : [],
        });
      }
    } catch (e) {
      console.warn("Could not load estimate documents:", e);
    }

    // 2. Fetch from /api/estimations (Studio estimations)
    try {
      const studioRes = await apiRequest<unknown>("/estimations");
      const studioList = unwrapList<any>(studioRes, ["estimations", "data"]);
      for (const s of studioList) {
        const rawItems = Array.isArray(s.items) ? s.items : [];
        const items = rawItems.map((i: any) => ({
          id: String(i.id ?? crypto.randomUUID()),
          itemName: i.itemName || s.projectName || "Modular Furniture",
          description: i.description || (i.lengthMm ? `Size: ${i.lengthMm} x ${i.widthMm} x ${i.heightMm} mm` : ""),
          hsn: "9403",
          sizes: i.lengthMm ? `${i.lengthMm}X${i.widthMm}` : "",
          quantity: Number(i.quantity ?? 1),
          unit: i.unit || "Nos",
          rate: Number(i.unitSellingPrice ?? i.rate ?? 0),
        }));

        unified.push({
          id: String(s.id),
          source: "studio",
          estimateNo: s.estimationNumber || "EST-STUDIO",
          estimateDate: s.createdAt,
          customerName: s.customerName || "Client",
          projectName: s.projectName || "Modular Interior Project",
          placeOfSupply: s.placeOfSupply || "27-Maharashtra",
          taxRate: Number(s.taxRate ?? 18),
          total: Number(s.totalSellingPrice ?? s.grandTotal ?? 0),
          items,
          terms: QUOTATION_TERMS,
        });
      }
    } catch (e) {
      console.warn("Could not load studio estimations:", e);
    }

    setEstimates(unified);
  }, []);

  useEffect(() => {
    void loadQuotations();
    void loadEstimates();
  }, [loadQuotations, loadEstimates]);

  // Overall Statistics for KPI Banner
  const stats = useMemo(() => {
    const totalCount = quotations.length;
    const draftCount = quotations.filter((q) => q.status === "Draft").length;
    const sentCount = quotations.filter((q) => q.status === "Sent").length;
    const acceptedCount = quotations.filter((q) => q.status === "Accepted").length;
    const pipelineValue = quotations.reduce(
      (sum, item) => sum + Number(item.grandTotal || 0),
      0,
    );

    return {
      totalCount,
      draftCount,
      sentCount,
      acceptedCount,
      pipelineValue,
    };
  }, [quotations]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotations.filter((item) => {
      const matchesSearch = [
        item.quotationNo,
        item.customerName,
        item.projectName,
        item.customerAddress,
        item.status,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  const totals = useMemo(
    () => getTotals(form.items, Number(form.gstRate) || 0),
    [form.items, form.gstRate],
  );

  function setField<K extends keyof QuotationForm>(
    field: K,
    value: QuotationForm[K],
  ) {
    setIsSaved(false);
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // Populate form from selected saved Estimate
  function selectEstimate(estimateId: string) {
    const estimate = estimates.find((item) => item.id === estimateId);

    if (!estimate) {
      setField("estimateId", "");
      return;
    }

    setIsSaved(false);
    setForm((previous) => ({
      ...previous,
      estimateId,
      customerName: estimate.customerName || previous.customerName,
      customerAddress: estimate.customerAddress ?? previous.customerAddress,
      projectName: estimate.projectName || previous.projectName,
      placeOfSupply: estimate.placeOfSupply || previous.placeOfSupply,
      gstRate: String(estimate.taxRate ?? 18),
      termsText: estimate.terms?.length
        ? estimate.terms.map((t) => t.replace("Estimate Valid", "Quotation Valid")).join("\n")
        : previous.termsText,
      items: estimate.items.length
        ? estimate.items.map((i) => ({ ...i, id: crypto.randomUUID() }))
        : previous.items,
    }));

    setSuccess(`Loaded items & pricing from Estimate #${estimate.estimateNo} (${estimate.customerName}).`);
  }

  function openCreate() {
    setEditingId(null);
    setViewing(null);
    setForm(createEmptyForm());
    setIsSaved(false);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(item: Quotation) {
    setEditingId(item.id);
    setViewing(null);
    setIsSaved(false);

    setForm({
      customerName: item.customerName,
      customerAddress: item.customerAddress,
      projectName: item.projectName,
      estimateId: item.estimateId ?? "",
      quotationDate: item.quotationDate,
      validUntil: item.validUntil,
      status: item.status,
      gstRate: String(item.gstRate),
      placeOfSupply: item.placeOfSupply,
      termsText: (item.terms.length ? item.terms : QUOTATION_TERMS).join("\n"),
      notes: item.notes,
      items: item.items.length ? item.items.map((row) => ({ ...row })) : [emptyItem()],
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function addItem() {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, emptyItem()],
    }));
  }

  function removeItem(itemId: string) {
    setForm((previous) => ({
      ...previous,
      items:
        previous.items.length <= 1
          ? previous.items
          : previous.items.filter((item) => item.id !== itemId),
    }));
  }

  function updateItem(
    itemId: string,
    field: keyof QuotationItem,
    value: string | number,
  ) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function validateForm() {
    if (!form.customerName.trim()) {
      setError("Please enter Customer / Client Name.");
      return false;
    }
    if (!form.projectName.trim()) {
      setError("Please enter Project / Site Name.");
      return false;
    }
    if (!form.quotationDate) {
      setError("Please select the Quotation Date.");
      return false;
    }

    for (const item of form.items) {
      if (!item.itemName.trim()) {
        setError("Please enter an Item Name for all line items.");
        return false;
      }
      if (!Number.isFinite(Number(item.quantity)) || item.quantity <= 0) {
        setError("Item quantity must be greater than zero.");
        return false;
      }
      if (!Number.isFinite(Number(item.rate)) || item.rate < 0) {
        setError("Item rate cannot be negative.");
        return false;
      }
    }

    const gstRate = Number(form.gstRate);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      setError("Please enter a valid GST percentage (e.g. 18).");
      return false;
    }

    return true;
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setSaving(true);
    setIsSaved(false);

    try {
      const quotationTotals = getTotals(form.items, Number(form.gstRate) || 0);

      const payload = {
        customerName: form.customerName.trim(),
        customerAddress: form.customerAddress.trim() || null,
        projectName: form.projectName.trim(),
        estimateId: form.estimateId || null,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || null,
        status: form.status,
        gstRate: Number(form.gstRate),
        placeOfSupply: form.placeOfSupply.trim(),
        terms: form.termsText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: form.notes.trim() || null,
        items: form.items.map((item) => ({
          itemName: item.itemName.trim(),
          description: item.description.trim() || null,
          hsn: item.hsn.trim() || "9403",
          sizes: item.sizes.trim() || null,
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
          amount: Number((Number(item.quantity) * Number(item.rate)).toFixed(2)),
        })),
        subtotal: quotationTotals.subtotal,
        gstAmount: quotationTotals.gstAmount,
        grandTotal: quotationTotals.grandTotal,
      };

      const path = editingId ? `/quotations/${encodeURIComponent(editingId)}` : "/quotations";

      await apiRequest(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setIsSaved(true);
      setSuccess(
        editingId
          ? "Quotation updated successfully in PostgreSQL."
          : "Quotation saved directly to PostgreSQL database!",
      );

      await loadQuotations();

      setTimeout(() => {
        setShowForm(false);
        setEditingId(null);
        setForm(createEmptyForm());
        setIsSaved(false);
      }, 1200);
    } catch (err) {
      setIsSaved(false);
      setError(
        err instanceof Error ? err.message : "Quotation could not be saved to database.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuotation(item: Quotation) {
    if (!window.confirm(`Are you sure you want to delete quotation "${item.quotationNo}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/quotations/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setSuccess(`Quotation "${item.quotationNo}" deleted successfully from PostgreSQL.`);

      if (viewing?.id === item.id) setViewing(null);
      if (editingId === item.id) {
        setEditingId(null);
        setShowForm(false);
      }

      await loadQuotations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quotation could not be deleted.");
    }
  }

  function previewDraft() {
    if (!validateForm()) return;

    setPreview(
      toDocData({
        id: editingId ?? "draft",
        quotationNo: editingId ? (quotations.find((q) => q.id === editingId)?.quotationNo ?? "QT-DRAFT") : "(Draft)",
        customerName: form.customerName,
        customerAddress: form.customerAddress,
        projectName: form.projectName,
        estimateId: form.estimateId || null,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil,
        status: form.status,
        gstRate: Number(form.gstRate) || 0,
        placeOfSupply: form.placeOfSupply,
        terms: form.termsText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: form.notes,
        items: form.items,
        ...totals,
      }),
    );
  }

  return (
    <AppShell title="Quotation Management">
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* ========================================================================= */}
        {/* 1. EXECUTIVE HEADER & ACTIONS */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                Quotation Management
              </h1>
              <p className="text-xs text-gray-500">
                Generate formal commercial proposals from saved Estimates with 18% GST, bank details, and instant PDF download.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadQuotations();
                void loadEstimates();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-60 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
              Sync Database
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Quotation
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError("")} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {success && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
            <span>✅ {success}</span>
            <button type="button" onClick={() => setSuccess("")} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. EXECUTIVE KPI CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Proposals</span>
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{stats.totalCount}</p>
            <span className="text-[11px] text-gray-400">Live in PostgreSQL</span>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Draft Quotations</span>
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-800">{stats.draftCount}</p>
            <span className="text-[11px] text-gray-400">Under preparation</span>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent to Clients</span>
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-blue-700">{stats.sentCount}</p>
            <span className="text-[11px] text-gray-400">Awaiting client approval</span>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accepted Deals</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">{stats.acceptedCount}</p>
            <span className="text-[11px] text-gray-400">Ready for sales order</span>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</span>
              <Calculator className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-purple-900 truncate">{money(stats.pipelineValue)}</p>
            <span className="text-[11px] text-gray-400">Inclusive of GST</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CREATE / EDIT FORM */}
        {/* ========================================================================= */}
        {showForm && (
          <section className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
            <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                  {editingId ? "✏️" : "➕"}
                </span>
                <h2 className="text-sm font-bold text-gray-900">
                  {editingId ? "Edit Commercial Quotation" : "Create New Quotation"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={submitForm} className="p-5 space-y-6">
              {/* SAVED ESTIMATES SELECTOR (HERO BAR) */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Load from Saved Estimates & BOQ
                  </label>
                  <span className="text-[11px] text-amber-700">
                    {estimates.length} saved estimates available from database
                  </span>
                </div>

                <select
                  className={`${inputClass} border-amber-300 font-medium`}
                  value={form.estimateId}
                  onChange={(event) => selectEstimate(event.target.value)}
                >
                  <option value="">-- Select a Saved Estimate to Auto-Fill Items & Pricing --</option>
                  {estimates.map((est) => (
                    <option key={est.id} value={est.id}>
                      [{est.source.toUpperCase()}] #{est.estimateNo} — {est.customerName}
                      {est.projectName ? ` (${est.projectName})` : ""}
                      {est.total ? ` — ${money(est.total)}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-amber-800/80">
                  Selecting an estimate will automatically populate the client, project, line items, dimensions, rates, and terms.
                </p>
              </div>

              {/* CLIENT & PROJECT CONTEXT GRID */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Customer / Client Name *</span>
                  <input
                    required
                    className={inputClass}
                    value={form.customerName}
                    onChange={(e) => setField("customerName", e.target.value)}
                    placeholder="e.g. Wipro Limited / Vijay Patil"
                  />
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Project / Site Name *</span>
                  <input
                    required
                    className={inputClass}
                    value={form.projectName}
                    onChange={(e) => setField("projectName", e.target.value)}
                    placeholder="e.g. Pune Tech Park 4th Floor"
                  />
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Customer Site Address</span>
                  <input
                    className={inputClass}
                    value={form.customerAddress}
                    onChange={(e) => setField("customerAddress", e.target.value)}
                    placeholder="e.g. Hinjewadi Phase 2, Pune"
                  />
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Place of Supply</span>
                  <select
                    className={inputClass}
                    value={form.placeOfSupply}
                    onChange={(e) => setField("placeOfSupply", e.target.value)}
                  >
                    <option value="27-Maharashtra">27 - Maharashtra (Local CGST + SGST)</option>
                    <option value="29-Karnataka">29 - Karnataka (IGST)</option>
                    <option value="24-Gujarat">24 - Gujarat (IGST)</option>
                    <option value="36-Telangana">36 - Telangana (IGST)</option>
                    <option value="07-Delhi">07 - Delhi (IGST)</option>
                  </select>
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Quotation Date *</span>
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={form.quotationDate}
                    onChange={(e) => setField("quotationDate", e.target.value)}
                  />
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Valid Until</span>
                  <input
                    type="date"
                    min={form.quotationDate}
                    className={inputClass}
                    value={form.validUntil}
                    onChange={(e) => setField("validUntil", e.target.value)}
                  />
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">Quotation Status</span>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="Draft">Draft (Internal Working)</option>
                    <option value="Sent">Sent to Client</option>
                    <option value="Accepted">Accepted by Client</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Expired">Expired</option>
                  </select>
                </label>

                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-gray-700">GST Tax Rate (%)</span>
                  <select
                    className={inputClass}
                    value={form.gstRate}
                    onChange={(e) => setField("gstRate", e.target.value)}
                  >
                    <option value="18">18% (Standard Modular Furniture)</option>
                    <option value="12">12%</option>
                    <option value="28">28%</option>
                    <option value="5">5%</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </label>
              </div>

              {/* LINE ITEMS TABLE */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    Line Items & Specifications ({form.items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Line Item
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 bg-gray-50/40 p-3.5 hover:bg-white transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-bold text-amber-800">Item #{index + 1}</span>
                        <button
                          type="button"
                          disabled={form.items.length === 1}
                          onClick={() => removeItem(item.id)}
                          className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-end">
                        <label className="lg:col-span-4 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">Item Name *</span>
                          <input
                            required
                            className={inputClass}
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                            placeholder="e.g. Linear Workstation (1200 x 600)"
                          />
                        </label>

                        <label className="lg:col-span-2 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">HSN/SAC</span>
                          <input
                            className={inputClass}
                            value={item.hsn}
                            onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                            placeholder="9403"
                          />
                        </label>

                        <label className="lg:col-span-2 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">Dimensions / Sizes</span>
                          <input
                            className={inputClass}
                            value={item.sizes}
                            onChange={(e) => updateItem(item.id, "sizes", e.target.value)}
                            placeholder="1200 X 600"
                          />
                        </label>

                        <label className="lg:col-span-1 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">Qty *</span>
                          <input
                            required
                            type="number"
                            min="1"
                            className={inputClass}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          />
                        </label>

                        <label className="lg:col-span-1 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">Unit</span>
                          <select
                            className={inputClass}
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </label>

                        <label className="lg:col-span-2 block space-y-1 text-xs">
                          <span className="font-medium text-gray-600">Rate / Unit (₹) *</span>
                          <input
                            required
                            type="number"
                            min="0"
                            step="any"
                            className={inputClass}
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <input
                          className={`${inputClass} text-xs py-1.5`}
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Detailed description (prints in brackets in PDF)..."
                        />
                        <span className="text-xs font-bold text-emerald-700 shrink-0 tabular-nums">
                          Item Total: {money(item.quantity * item.rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALS & COMMERCIAL TERMS */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 pt-2 border-t border-gray-100">
                <div className="lg:col-span-7 space-y-4">
                  <label className="block space-y-1 text-xs">
                    <span className="font-semibold text-gray-700">Commercial Terms & Conditions (One per line)</span>
                    <textarea
                      rows={6}
                      className={inputClass}
                      value={form.termsText}
                      onChange={(e) => setField("termsText", e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <span className="font-semibold text-gray-700">Internal Remarks / Notes</span>
                    <input
                      className={inputClass}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="e.g. Approved by Sales Director, special corporate discount"
                    />
                  </label>
                </div>

                <div className="lg:col-span-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">
                    Commercial Cost Breakdown
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Taxable Subtotal</span>
                    <span className="font-semibold tabular-nums text-gray-900">{money(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>GST ({Number(form.gstRate) || 0}%)</span>
                    <span className="font-semibold tabular-nums text-gray-900">{money(totals.gstAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Round Off</span>
                    <span className="tabular-nums text-gray-500">{money(totals.roundOff)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm">
                    <span className="font-bold text-gray-900">Quotation Grand Total</span>
                    <span className="font-bold text-emerald-700 text-lg tabular-nums">{money(totals.grandTotal)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 italic bg-white p-2 rounded-lg border border-gray-100">
                    {amountInWords(totals.grandTotal)}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={previewDraft}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  <Eye className="h-4 w-4 text-amber-700" />
                  Preview Document
                </button>

                <button
                  type="submit"
                  disabled={saving || isSaved}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-90 ${
                    isSaved
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      Saved
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      {saving ? "Saving to Database..." : editingId ? "Update Quotation" : "Save Quotation"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 4. SAVED QUOTATIONS REGISTRY TABLE */}
        {/* ========================================================================= */}
        <section className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
          <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
               Quotations Registry
              </h2>
              <p className="text-xs text-gray-500">
                Official commercial proposals stored with line items and GST values.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
                {["All", "Draft", "Sent", "Accepted", "Rejected"].map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      statusFilter.toLowerCase() === st.toLowerCase()
                        ? "bg-amber-600 text-white font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  className={`${inputClass} pl-8 py-1.5 text-xs`}
                  placeholder="Search quotation, client, site..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </header>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
              Loading quotations from database...
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 space-y-3">
              <FileText className="h-9 w-9 text-gray-300 mx-auto" />
              <p>No quotations found matching your criteria.</p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Quotation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/70 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Quotation Ref</th>
                    <th className="p-3.5">Client & Site</th>
                    <th className="p-3.5">Date & Validity</th>
                    <th className="p-3.5 text-right">Subtotal</th>
                    <th className="p-3.5 text-right">Grand Total (GST)</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuotations.map((item) => {
                    const isAccepted = item.status.toLowerCase() === "accepted";
                    const isSent = item.status.toLowerCase() === "sent";

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-all">
                        <td className="p-3.5">
                          <span className="font-bold text-amber-800">{item.quotationNo}</span>
                          <div className="text-[10px] text-gray-400">
                            {item.items?.length || 0} item(s) · Supply: {item.placeOfSupply?.split("-")[1] || "MH"}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-gray-900">{item.customerName}</div>
                          <div className="text-[11px] text-gray-500">{item.projectName || "General Project"}</div>
                        </td>

                        <td className="p-3.5 text-gray-600">
                          <div>{item.quotationDate || "—"}</div>
                          <div className="text-[10px] text-gray-400">
                            Valid: {item.validUntil || "30 Days"}
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-medium text-gray-600 tabular-nums">
                          {money(item.subtotal)}
                        </td>

                        <td className="p-3.5 text-right font-bold text-emerald-700 tabular-nums text-sm">
                          {money(item.grandTotal)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              isAccepted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isSent
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* DOWNLOAD / PRINT PDF ACTION */}
                            <button
                              type="button"
                              onClick={() => setPreview(toDocData(item))}
                              title="Download PDF / Print"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
                            >
                              <Printer className="h-3.5 w-3.5 text-emerald-700" />
                              PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              title="Edit Quotation"
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteQuotation(item)}
                              title="Delete Quotation"
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. FORMAL PDF DOCUMENT PREVIEW PORTAL WITH PRINT / DOWNLOAD TOOLBAR */}
      {/* ========================================================================= */}
      {preview &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="est-portal est-overlay"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "#4b5563",
              overflow: "auto",
              padding: 20,
            }}
          >
            <style>{PRINT_FIX}</style>

            {/* STICKY TOP TOOLBAR FOR DOWNLOAD & PRINT */}
            <div
              className="est-noprint"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 100,
                marginBottom: 20,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                backgroundColor: "#1f2937",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 12,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    backgroundColor: "#d97706",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  PDF PREVIEW
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Quotation Ref: {preview.estimateNo} — {preview.customerName}
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  (Tip: Set Destination to &apos;Save as PDF&apos; in Print dialog)
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* PRIMARY PRINT / DOWNLOAD BUTTON */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                  }}
                >
                  <Printer style={{ width: 16, height: 16 }} />
                  Print / Download PDF
                </button>

                {/* CLOSE BUTTON */}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#374151",
                    color: "#f3f4f6",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #4b5563",
                    cursor: "pointer",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                  Close
                </button>
              </div>
            </div>

            {/* RENDER FORMAL PAYAL DECOR QUOTATION DOCUMENT */}
            <EstimateDocument data={preview} title="Quotation" />
          </div>,
          document.body,
        )}
    </AppShell>
  );
}

export default QuotationsPage;
