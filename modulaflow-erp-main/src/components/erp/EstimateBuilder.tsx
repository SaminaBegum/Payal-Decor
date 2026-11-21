import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Save,
  Eye,
  Pencil,
  RefreshCw,
  Calculator,
  X,
  Printer,
  FileText,
  Search,
  CheckCircle2,
  Building2,
  RotateCcw,
} from "lucide-react";
import {
  EstimateDocument,
  DEFAULT_TERMS,
  amountInWords,
  calcEstimate,
  type EstimateData,
  type EstimateItem,
} from "@/components/erp/EstimateDocument";

const API_BASE = (
  import.meta.env["VITE_API_URL"] || "http://localhost:5000/api"
).replace(/\/+$/, "");

const UNITS = ["Nos", "Sqf", "Sqm", "Rft", "Trip", "Lot", "Set"];

interface CustomerLite {
  id: string;
  name: string;
  company?: string;
  address?: string;
}

interface SavedEstimate {
  id: string;
  estimateNo: string;
  estimateDate: string;
  customerId: string | null;
  customerName: string;
  customerAddress: string | null;
  projectName: string | null;
  placeOfSupply: string;
  items: EstimateItem[];
  taxRate: number;
  total: number;
  terms: string[] | null;
  status?: string;
}

interface Props {
  customer?: CustomerLite;
  projectName: string;
  panel: { sizes: string; qty: number; price: number };
}

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

const blankItem = (): EstimateItem => ({
  name: "",
  description: "",
  hsn: "9403",
  sizes: "",
  qty: 1,
  unit: "Nos",
  price: 0,
});

const todayString = () => new Date().toISOString().slice(0, 10);

const inr = (value: number) =>
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

      lastError = new Error(
        data.message || `API request failed (${response.status})`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to communicate with API server");
}

function recordToData(rec: SavedEstimate): EstimateData {
  return {
    estimateNo: rec.estimateNo,
    date: rec.estimateDate.slice(0, 10),
    customerName: rec.customerName,
    customerAddress: rec.customerAddress ?? undefined,
    placeOfSupply: rec.placeOfSupply,
    items: rec.items,
    taxRate: rec.taxRate,
    terms: rec.terms?.length ? rec.terms : undefined,
  };
}

export function EstimateBuilder({ customer, projectName, panel }: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<EstimateItem[]>([blankItem()]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [estCustomer, setEstCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");
  const [estDate, setEstDate] = useState(todayString());
  const [taxRate, setTaxRate] = useState(18);
  const [termsText, setTermsText] = useState(DEFAULT_TERMS.join("\n"));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedEstimate[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<EstimateData | null>(null);

  // Auto-populate when CRM customer changes
  useEffect(() => {
    if (!customer || editingId) return;
    setCustomerId(customer.id);
    setEstCustomer(customer.company || customer.name);
    setAddress(customer.address ?? "");
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSaved = useCallback(async () => {
    setLoadingList(true);
    setError("");

    try {
      const data = await apiRequest<{ success: boolean; estimates?: SavedEstimate[]; data?: SavedEstimate[] }>(
        "/estimate-docs",
      );
      setSaved(data.estimates || data.data || []);
    } catch (err) {
      console.error("Could not load estimate documents:", err);
      setError(
        err instanceof Error
          ? `Saved estimates could not load: ${err.message}`
          : "Saved estimates could not load.",
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const cleanItems = useMemo(
    () => items.filter((item) => item.name.trim()),
    [items],
  );

  const totals = useMemo(
    () => calcEstimate(cleanItems, taxRate),
    [cleanItems, taxRate],
  );

  function updateItem(index: number, patch: Partial<EstimateItem>) {
    setItems((previous) =>
      previous.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addPanelItem() {
    const row: EstimateItem = {
      name: projectName.trim() || "Modular Panel",
      description: `Dimensions: ${panel.sizes} mm | Qty: ${panel.qty} Nos`,
      hsn: "9403",
      sizes: panel.sizes,
      qty: panel.qty > 0 ? panel.qty : 1,
      unit: "Nos",
      price: Math.round(panel.price * 100) / 100,
    };

    setItems((previous) => {
      if (previous.length === 1 && !previous[0].name.trim()) return [row];
      return [...previous, row];
    });
  }

  function termsList() {
    return termsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function draftData(estimateNo: string): EstimateData {
    return {
      estimateNo,
      date: estDate,
      customerName: estCustomer,
      customerAddress: address || undefined,
      placeOfSupply,
      items: cleanItems,
      taxRate,
      terms: termsList(),
    };
  }

  function resetForm() {
    setEditingId(null);
    setItems([blankItem()]);
    setEstCustomer(customer?.company || customer?.name || "");
    setAddress(customer?.address ?? "");
    setEstDate(todayString());
    setTermsText(DEFAULT_TERMS.join("\n"));
    setError("");
    setSuccess("");
    setIsSaved(false);
  }

  async function save() {
    setError("");
    setSuccess("");

    if (!estCustomer.trim()) {
      setError("'Estimate For' (customer name) is required.");
      return;
    }

    if (cleanItems.length === 0) {
      setError("Add at least one item with a valid name.");
      return;
    }

    setSaving(true);
    setIsSaved(false);

    try {
      const endpoint = editingId
        ? `/estimate-docs/${encodeURIComponent(editingId)}`
        : "/estimate-docs";

      const data = await apiRequest<{ success: boolean; estimate?: SavedEstimate }>(
        endpoint,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            customerId,
            customerName: estCustomer.trim(),
            customerAddress: address.trim() || null,
            projectName: projectName.trim() || null,
            placeOfSupply,
            estimateDate: estDate,
            items: cleanItems,
            taxRate,
            terms: termsList(),
          }),
        },
      );

      setIsSaved(true);
      setSuccess(
        `Estimate document #${data.estimate?.estimateNo ?? ""} saved directly to PostgreSQL.`,
      );
      await loadSaved();

      setTimeout(() => {
        setIsSaved(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setIsSaved(false);
      setError(
        err instanceof Error ? err.message : "Estimate could not be saved to database.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rec: SavedEstimate) {
    setEditingId(rec.id);
    setCustomerId(rec.customerId);
    setEstCustomer(rec.customerName);
    setAddress(rec.customerAddress ?? "");
    setPlaceOfSupply(rec.placeOfSupply);
    setEstDate(rec.estimateDate.slice(0, 10));
    setTaxRate(rec.taxRate);
    setItems(rec.items.length ? rec.items : [blankItem()]);
    setTermsText((rec.terms?.length ? rec.terms : DEFAULT_TERMS).join("\n"));
    setError("");
    setSuccess("");
    setIsSaved(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function remove(rec: SavedEstimate) {
    if (!window.confirm(`Delete estimate "${rec.estimateNo}" from database?`)) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/estimate-docs/${encodeURIComponent(rec.id)}`, {
        method: "DELETE",
      });
      setSuccess(`Estimate ${rec.estimateNo} deleted successfully.`);
      if (editingId === rec.id) resetForm();
      await loadSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Estimate could not be deleted.",
      );
    }
  }

  const filteredSaved = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter((s) =>
      [s.estimateNo, s.customerName, s.projectName, s.placeOfSupply].some(
        (v) => String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [saved, search]);

  const editingNo = saved.find((s) => s.id === editingId)?.estimateNo;

  return (
    <div className="space-y-6">
      {/* 1. BUILDER FORM SECTION */}
      <section
        ref={topRef}
        className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {editingId
                  ? `Estimate Document (Print/PDF) — Editing ${editingNo ?? ""}`
                  : "Estimate Document Builder (Client-Facing Print/PDF)"}
              </h2>
              <p className="text-xs text-gray-500">
                Formal commercial quotation format with company header, terms, bank details & signatory.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            {editingId ? `Editing: ${editingNo}` : "Auto-sequence: YYYY-YY/XXX"}
          </span>
        </header>

        <div className="space-y-5 p-5">
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 animate-in fade-in">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-600 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 animate-in fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {success}
              </span>
              <button
                type="button"
                onClick={() => setSuccess("")}
                className="text-emerald-700 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form Header Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block space-y-1 text-xs font-medium text-gray-700">
              <span>Estimate For (Customer / Client Name) *</span>
              <input
                className={inputClass}
                value={estCustomer}
                onChange={(e) => setEstCustomer(e.target.value)}
                placeholder="e.g. Wipro Limited / Mr. Vijay Patil"
              />
            </label>

            <label className="block space-y-1 text-xs font-medium text-gray-700">
              <span>Estimate Date</span>
              <input
                type="date"
                className={inputClass}
                value={estDate}
                onChange={(e) => setEstDate(e.target.value)}
              />
            </label>

            <label className="block space-y-1 text-xs font-medium text-gray-700">
              <span>Place of Supply</span>
              <select
                className={inputClass}
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
              >
                <option value="27-Maharashtra">27 - Maharashtra (CGST + SGST)</option>
                <option value="29-Karnataka">29 - Karnataka (IGST)</option>
                <option value="24-Gujarat">24 - Gujarat (IGST)</option>
                <option value="36-Telangana">36 - Telangana (IGST)</option>
                <option value="07-Delhi">07 - Delhi (IGST)</option>
              </select>
            </label>

            <label className="block space-y-1 text-xs font-medium text-gray-700 md:col-span-2">
              <span>Customer Address / Site Location</span>
              <input
                className={inputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Complete billing / delivery address"
              />
            </label>

            <label className="block space-y-1 text-xs font-medium text-gray-700">
              <span>GST Tax Rate (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                className={inputClass}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Document Line Items ({cleanItems.length})
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addPanelItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-all"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Import from Studio Calculation
                </button>

                <button
                  type="button"
                  onClick={() => setItems((p) => [...p, blankItem()])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-all shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Line Item
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const lineAmount = (item.qty || 0) * (item.price || 0);

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 transition-all hover:border-gray-300"
                  >
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-12 items-start">
                      <div className="col-span-2 md:col-span-4 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          {index + 1}. Item Description *
                        </span>
                        <input
                          className={inputClass}
                          value={item.name}
                          onChange={(e) =>
                            updateItem(index, { name: e.target.value })
                          }
                          placeholder="e.g. Modular Linear Workstation 1200x600"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          HSN
                        </span>
                        <input
                          className={inputClass}
                          value={item.hsn ?? ""}
                          onChange={(e) =>
                            updateItem(index, { hsn: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-span-2 md:col-span-2 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Sizes / Specs
                        </span>
                        <input
                          className={inputClass}
                          value={item.sizes ?? ""}
                          onChange={(e) =>
                            updateItem(index, { sizes: e.target.value })
                          }
                          placeholder="1200 X 600 mm"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Qty
                        </span>
                        <input
                          type="number"
                          min="1"
                          className={inputClass}
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, {
                              qty: Math.max(1, Number(e.target.value)),
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Unit
                        </span>
                        <select
                          className={inputClass}
                          value={item.unit ?? "Nos"}
                          onChange={(e) =>
                            updateItem(index, { unit: e.target.value })
                          }
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Rate (₹)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(index, {
                              price: Number(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="col-span-2 md:col-span-2 flex items-center justify-between gap-2 pt-5">
                        <div className="text-right flex-1">
                          <span className="text-[11px] text-gray-400 block">Amount</span>
                          <span className="text-xs font-bold text-gray-900 tabular-nums">
                            ₹ {inr(lineAmount)}
                          </span>
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setItems((p) => p.filter((_, i) => i !== index))
                            }
                            title="Remove item"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals & Terms Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 pt-3 border-t border-gray-100">
            {/* Terms and conditions */}
            <div className="md:col-span-7 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Commercial Terms & Conditions</span>
                <button
                  type="button"
                  onClick={() => setTermsText(DEFAULT_TERMS.join("\n"))}
                  className="text-[11px] text-amber-700 hover:underline font-semibold"
                >
                  Reset Default Terms
                </button>
              </div>
              <textarea
                rows={5}
                className={`${inputClass} font-mono text-xs`}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
              />
            </div>

            {/* Financial Summary */}
            <div className="md:col-span-5 rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Sub Total (Excl. Tax)</span>
                <span className="font-semibold text-gray-900 tabular-nums">₹ {inr(totals.subTotal)}</span>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>GST @ {taxRate}%</span>
                <span className="font-semibold text-gray-900 tabular-nums">₹ {inr(totals.taxAmount)}</span>
              </div>

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Round Off</span>
                  <span className="tabular-nums">₹ {inr(totals.roundOff)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Grand Total</span>
                <span className="text-amber-800 tabular-nums">₹ {inr(totals.total)}</span>
              </div>

              <p className="text-[10px] text-gray-500 italic pt-1">
                Amount in words: {amountInWords(totals.total)}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Form
            </button>

            <button
              type="button"
              onClick={() => {
                if (!estCustomer.trim()) {
                  setError("Please enter customer name to preview.");
                  return;
                }
                setError("");
                setPreview(draftData(editingNo ?? "(Draft Estimate)"));
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview / Print PDF
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || isSaved}
              className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-90 ${
                isSaved
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving to Database..." : editingId ? "Update Estimate" : "Save Estimate Document"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. SAVED ESTIMATE DOCUMENTS REGISTRY */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900">
              Saved Estimate Documents ({saved.length})
            </h2>
            <span className="text-xs text-gray-400">Stored in public.estimate_documents</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-52 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                className={`${inputClass} pl-8 py-1.5 text-xs`}
                placeholder="Search estimate no, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => void loadSaved()}
              disabled={loadingList}
              title="Refresh list"
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin text-amber-600" : ""}`} />
            </button>
          </div>
        </header>

        {loadingList ? (
          <div className="p-8 text-center text-xs text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-amber-600 mb-2" />
            Loading saved estimate documents...
          </div>
        ) : filteredSaved.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-500">
            No saved estimate documents found. Create one above to save and print.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/70 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Estimate No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Place of Supply</th>
                  <th className="p-3.5 text-right">Items</th>
                  <th className="p-3.5 text-right">Total (Inc. GST)</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSaved.map((rec) => (
                  <tr key={rec.id} className="hover:bg-amber-50/30 transition-all">
                    <td className="p-3.5 font-bold text-amber-800">{rec.estimateNo}</td>
                    <td className="p-3.5 text-gray-600">
                      {new Date(rec.estimateDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3.5 font-semibold text-gray-900">{rec.customerName}</td>
                    <td className="p-3.5 text-gray-500">{rec.placeOfSupply || "27-Maharashtra"}</td>
                    <td className="p-3.5 text-right text-gray-600 tabular-nums">
                      {rec.items?.length || 0}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-700 tabular-nums text-sm">
                      ₹ {inr(rec.total)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreview(recordToData(rec))}
                          title="View / Print PDF Document"
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View / Print
                        </button>

                        <button
                          type="button"
                          onClick={() => startEdit(rec)}
                          title="Edit estimate"
                          className="rounded-lg border border-gray-200 p-1.5 text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void remove(rec)}
                          title="Delete estimate from database"
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. FULLSCREEN CLIENT-FACING PRINT / PDF PREVIEW MODAL */}
      {preview &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="est-portal est-overlay"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(4px)",
              overflow: "auto",
              padding: "20px 16px",
            }}
          >
            <style>{PRINT_FIX}</style>

            {/* Preview Toolbar */}
            <div
              className="est-noprint"
              style={{
                maxWidth: "210mm",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
                padding: "12px 20px",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#111827" }}>
                  Estimate Document Preview: {preview.estimateNo}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6b7280" }}>
                  Prepared for {preview.customerName} · {preview.date}
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#b45309",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            {/* The Print Sheet */}
            <EstimateDocument data={preview} />
          </div>,
          document.body,
        )}
    </div>
  );
}