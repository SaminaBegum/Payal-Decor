import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  MapPin,
  Download,
  Upload,
  CheckCircle2,
  Filter,
  Layers,
  FileSpreadsheet,
  Eye,
  AlertCircle,
  FileText,
  Check,
  ExternalLink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { toastService } from "@/services/toastService";

const API_BASE = (
  import.meta.env["VITE_API_URL"] || "http://localhost:5000/api"
).replace(/\/+$/, "");

type VendorStatus = "Active" | "Inactive";

interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  category: string;
  city: string;
  status: VendorStatus;
  gstin: string;
  address: string;
  state: string;
  pincode: string;
  contactPerson: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm: Omit<Vendor, "id"> = {
  name: "",
  company: "",
  phone: "",
  email: "",
  category: "Plywood",
  city: "",
  status: "Active",
  gstin: "",
  address: "",
  state: "Maharashtra",
  pincode: "",
  contactPerson: "",
  notes: "",
};

const DEFAULT_CATEGORIES = [
  "Plywood",
  "Laminates",
  "Hardware",
  "Edge Band",
  "Glass",
  "Fabric",
  "Other",
];

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

function getCategoryBadgeClass(category: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("plywood")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (cat.includes("laminate")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-800";
  }
  if (cat.includes("hardware")) {
    return "border-slate-300 bg-slate-100 text-slate-800";
  }
  if (cat.includes("edge")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (cat.includes("glass")) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (cat.includes("fabric")) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmVendor, setDeleteConfirmVendor] = useState<Vendor | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/vendors`);
      const data = await readResponse(response);
      const rows = Array.isArray(data) ? data : data.vendors ?? data.data ?? [];
      setVendors(rows);

      // Also fetch dynamic categories
      try {
        const catRes = await fetch(`${API_BASE}/vendors/categories`);
        const catData = await readResponse(catRes);
        const dynamicCats = catData.categories ?? catData.data ?? [];
        if (Array.isArray(dynamicCats) && dynamicCats.length > 0) {
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...dynamicCats]));
          setCategories(merged);
        }
      } catch {
        // Fallback to default categories
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  // Filtered vendors based on search, category and status
  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vendors.filter((vendor) => {
      // Category filter
      if (selectedCategory !== "All" && vendor.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "All" && vendor.status !== selectedStatus) {
        return false;
      }

      // Query filter
      if (!query) return true;

      return [
        vendor.name,
        vendor.company,
        vendor.phone,
        vendor.email,
        vendor.category,
        vendor.city,
        vendor.state,
        vendor.gstin,
        vendor.contactPerson,
        vendor.notes,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query));
    });
  }, [vendors, search, selectedCategory, selectedStatus]);

  // Category counts for quick filter ribbon
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: vendors.length };
    for (const v of vendors) {
      const cat = v.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [vendors]);

  // Executive KPI summary counts
  const kpi = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.status === "Active").length;
    const inactive = vendors.filter((v) => v.status === "Inactive").length;
    const gstinCount = vendors.filter((v) => v.gstin && v.gstin.trim().length > 0).length;
    const categoryCount = Object.keys(categoryCounts).length - 1;

    return { total, active, inactive, gstinCount, categoryCount: Math.max(categoryCount, 0) };
  }, [vendors, categoryCounts]);

  function updateField<K extends keyof typeof emptyForm>(
    field: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setIsSaved(false);
    setShowForm(true);
  }

  function openEditForm(vendor: Vendor) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name ?? "",
      company: vendor.company ?? "",
      phone: vendor.phone ?? "",
      email: vendor.email ?? "",
      category: vendor.category ?? "Other",
      city: vendor.city ?? "",
      status: vendor.status ?? "Active",
      gstin: vendor.gstin ?? "",
      address: vendor.address ?? "",
      state: vendor.state ?? "Maharashtra",
      pincode: vendor.pincode ?? "",
      contactPerson: vendor.contactPerson ?? "",
      notes: vendor.notes ?? "",
    });

    setError("");
    setSuccess("");
    setIsSaved(false);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = editingId
        ? `${API_BASE}/vendors/${encodeURIComponent(editingId)}`
        : `${API_BASE}/vendors`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      await readResponse(response);

      // Trigger "Saved" interactive state
      setIsSaved(true);
      const vendorLabel = form.company || form.name || "Vendor";
      setSuccess(
        editingId
          ? "Vendor details updated successfully."
          : "New vendor saved successfully.",
      );
      toastService.success(
        editingId ? "Vendor Updated" : "Vendor Registered",
        `"${vendorLabel}" has been saved successfully.`
      );

      // Hold "Saved" feedback for 1.2 seconds before closing
      setTimeout(async () => {
        setShowForm(false);
        setEditingId(null);
        setIsSaved(false);
        setForm({ ...emptyForm });
        await loadVendors();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save vendor.";
      setError(msg);
      toastService.error("Save Failed", msg);
      setSaving(false);
    }
  }

  async function confirmDeleteVendor() {
    if (!deleteConfirmVendor) return;

    setError("");
    setSuccess("");
    const vendorLabel = deleteConfirmVendor.company || deleteConfirmVendor.name || "Vendor";

    try {
      const response = await fetch(
        `${API_BASE}/vendors/${encodeURIComponent(deleteConfirmVendor.id)}`,
        { method: "DELETE" },
      );

      await readResponse(response);
      setSuccess(`Vendor "${vendorLabel}" removed successfully.`);
      toastService.success("Vendor Deleted", `"${vendorLabel}" was removed successfully.`);
      setDeleteConfirmVendor(null);
      await loadVendors();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete vendor.";
      setError(msg);
      toastService.error("Delete Failed", msg);
    }
  }

  // Copy GSTIN or Phone to clipboard
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toastService.info("Copied to Clipboard", text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export vendors to CSV
  const handleExportCSV = () => {
    const exportList = filteredVendors.length > 0 ? filteredVendors : vendors;
    if (exportList.length === 0) {
      alert("No vendor records to export.");
      toastService.info("Export Info", "No vendor records to export.");
      return;
    }

    const headers = [
      "Vendor ID",
      "Vendor Name",
      "Company Name",
      "Contact Person",
      "Category",
      "Phone",
      "Email",
      "GSTIN",
      "City",
      "State",
      "Pincode",
      "Address",
      "Status",
      "Notes",
    ];

    const rows = exportList.map((v) => [
      `"${(v.id || "").replace(/"/g, '""')}"`,
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${(v.company || "").replace(/"/g, '""')}"`,
      `"${(v.contactPerson || "").replace(/"/g, '""')}"`,
      `"${(v.category || "").replace(/"/g, '""')}"`,
      `"${(v.phone || "").replace(/"/g, '""')}"`,
      `"${(v.email || "").replace(/"/g, '""')}"`,
      `"${(v.gstin || "").replace(/"/g, '""')}"`,
      `"${(v.city || "").replace(/"/g, '""')}"`,
      `"${(v.state || "").replace(/"/g, '""')}"`,
      `"${(v.pincode || "").replace(/"/g, '""')}"`,
      `"${(v.address || "").replace(/"/g, '""')}"`,
      `"${(v.status || "Active").replace(/"/g, '""')}"`,
      `"${(v.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `payal_decor_vendors_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastService.success("Export Complete", `Exported ${exportList.length} vendors to CSV.`);
  };

  // Download Sample CSV Import Template
  const handleDownloadTemplate = () => {
    const headers = [
      "Vendor Name",
      "Company Name",
      "Contact Person",
      "Category",
      "Phone",
      "Email",
      "GSTIN",
      "City",
      "State",
      "Pincode",
      "Address",
      "Status",
      "Notes",
    ];

    const sample = [
      "Rajesh Sharma",
      "Supreme Plywood Corp",
      "Amit Sharma",
      "Plywood",
      "9876543210",
      "sales@supremeply.com",
      "27AAAAA0000A1Z5",
      "Pune",
      "Maharashtra",
      "411038",
      "Plot 45 Timber Market",
      "Active",
      "Commercial BWR & Marine Ply",
    ];

    const csv = [headers.join(","), sample.map((s) => `"${s}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "payal_decor_vendor_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastService.info("Template Downloaded", "Sample CSV template downloaded.");
  };

  // Parse CSV helper for bulk import
  const parseVendorCSV = (csvText: string): Array<Omit<Vendor, "id">> => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const row: string[] = [];
      let inQuotes = false;
      let cur = "";
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === "," && !inQuotes) {
          row.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      row.push(cur.trim());
      return row;
    };

    const headerRow = parseLine(lines[0] || "").map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    const parsed: Array<Omit<Vendor, "id">> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseLine(lines[i] || "");
      if (row.length === 0 || row.every((c) => !c)) continue;

      const obj: Record<string, string> = {};
      headerRow.forEach((col, idx) => {
        obj[col] = row[idx] || "";
      });

      const name = obj["vendorname"] || obj["name"] || "";
      const company = obj["companyname"] || obj["company"] || name || "";
      const phone = obj["phone"] || obj["phonenumber"] || obj["mobile"] || "";

      if (!name && !company) continue;

      parsed.push({
        name: name || company,
        company: company || name,
        contactPerson: obj["contactperson"] || "",
        category: obj["category"] || "Other",
        phone: phone,
        email: obj["email"] || "",
        gstin: obj["gstin"] || "",
        city: obj["city"] || "",
        state: obj["state"] || "Maharashtra",
        pincode: obj["pincode"] || "",
        address: obj["address"] || "",
        status: (obj["status"] && obj["status"].toLowerCase() === "inactive") ? "Inactive" : "Active",
        notes: obj["notes"] || "",
      });
    }

    return parsed;
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content || "");
      setImportError("");
      setImportSuccess("");
    };
    reader.readAsText(file);
  };

  // Submit bulk import
  const handleBulkImportSubmit = async () => {
    setImportError("");
    setImportSuccess("");

    if (!importText.trim()) {
      setImportError("Please provide CSV text or upload a CSV file.");
      return;
    }

    try {
      setImporting(true);
      const parsedVendors = parseVendorCSV(importText);

      if (parsedVendors.length === 0) {
        throw new Error("No valid vendor records could be parsed. Check headers or format.");
      }

      const response = await fetch(`${API_BASE}/vendors/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendors: parsedVendors }),
      });

      const resData = await readResponse(response);
      const count = resData.data?.insertedCount || parsedVendors.length;

      setImportSuccess(`Successfully imported ${count} vendor(s)!`);
      setImportText("");
      setTimeout(async () => {
        setShowImportModal(false);
        setImportSuccess("");
        await loadVendors();
      }, 1500);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import vendors.");
    } finally {
      setImporting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100 transition-colors";

  return (
    <AppShell title="Vendors & Suppliers">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* TOP HEADER & ACTION BUTTONS                               */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Vendor Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Enterprise supplier catalog, material categories, and GST directories.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadVendors()}
              title="Refresh database"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export records to CSV"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <Download className="h-3.5 w-3.5 text-gray-500" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setImportText("");
                setImportError("");
                setImportSuccess("");
                setShowImportModal(true);
              }}
              title="Bulk import vendors from CSV"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <Upload className="h-3.5 w-3.5 text-gray-500" />
              Import CSV
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-amber-900 transition"
            >
              <Plus className="h-4 w-4" />
              Add Vendor
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FEEDBACK NOTIFICATION BANNERS                             */}
        {/* ========================================================= */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded p-1 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXECUTIVE KPI SUMMARY CARDS                               */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Total Vendors</span>
              <Truck className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.total}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Registered suppliers</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600">Active Vendors</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{kpi.active}</p>
            <p className="mt-0.5 text-[11px] text-emerald-600/70">Ready for procurement</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Inactive</span>
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{kpi.inactive}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Dormant suppliers</p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-600">Categories</span>
              <Layers className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-900">{kpi.categoryCount}</p>
            <p className="mt-0.5 text-[11px] text-indigo-600/70">Raw materials</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">GST Registered</span>
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">{kpi.gstinCount}</p>
            <p className="mt-0.5 text-[11px] text-amber-700/70">Verified tax invoices</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE CATEGORY PILLS FILTER                         */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-gray-500 shrink-0">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {["All", ...categories].map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
                  isSelected
                    ? "bg-amber-800 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected ? "bg-amber-900/60 text-amber-100" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* ADD / EDIT VENDOR MODAL DRAWER                            */}
        {/* ========================================================= */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingId ? "Edit Vendor Details" : "Register New Vendor"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {editingId
                        ? "Update company information and material capabilities"
                        : "Enter supplier details, contact persons, and taxation info"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Section 1: Business Details */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                    1. Supplier & Contact Information
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Company / Firm Name *</span>
                      <input
                        className={inputClass}
                        required
                        placeholder="e.g. Shree Plywood Traders"
                        value={form.company}
                        onChange={(e) => updateField("company", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Primary Contact Name *</span>
                      <input
                        className={inputClass}
                        required
                        placeholder="e.g. Ramesh Patel"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Contact Person (Sales/Accounts)</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. Sneha (Accountant)"
                        value={form.contactPerson}
                        onChange={(e) => updateField("contactPerson", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Phone Number *</span>
                      <input
                        className={inputClass}
                        required
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Email Address</span>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="e.g. supplier@domain.com"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Material Category *</span>
                      <select
                        className={inputClass}
                        value={form.category}
                        onChange={(e) => updateField("category", e.target.value)}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Status *</span>
                      <select
                        className={inputClass}
                        value={form.status}
                        onChange={(e) =>
                          updateField("status", e.target.value as VendorStatus)
                        }
                      >
                        <option value="Active">Active (Procurement ready)</option>
                        <option value="Inactive">Inactive (Paused)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Section 2: Taxation & Location */}
                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                    2. Taxation & Address Details
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <label className="space-y-1 text-xs font-medium text-gray-700 sm:col-span-2">
                      <span>GSTIN (15 Digits)</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        value={form.gstin}
                        onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>City</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. Pune"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>State</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. Maharashtra"
                        value={form.state}
                        onChange={(e) => updateField("state", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Pincode</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. 411038"
                        value={form.pincode}
                        onChange={(e) => updateField("pincode", e.target.value)}
                      />
                    </label>

                    <label className="space-y-1 text-xs font-medium text-gray-700 sm:col-span-3">
                      <span>Street Address / Shop Details</span>
                      <input
                        className={inputClass}
                        placeholder="Shop / Unit number, street, timber market..."
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="space-y-1 text-xs font-medium text-gray-700">
                      <span>Internal Notes / Terms</span>
                      <textarea
                        className={inputClass}
                        rows={2}
                        placeholder="Credit period (e.g. 30 days), delivery terms, discounts..."
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* Form Action Buttons with Interactive Saved state */}
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || isSaved}
                    className={`inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white shadow-xs transition ${
                      isSaved
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-amber-800 hover:bg-amber-900 disabled:opacity-60"
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved!
                      </>
                    ) : saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? (
                      "Update Vendor"
                    ) : (
                      "Save Vendor"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VENDOR DETAILS VIEW MODAL                                 */}
        {/* ========================================================= */}
        {viewingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryBadgeClass(
                      viewingVendor.category,
                    )}`}
                  >
                    {viewingVendor.category || "General"}
                  </span>
                  <h3 className="mt-1 text-xl font-bold text-gray-900">
                    {viewingVendor.company || viewingVendor.name}
                  </h3>
                  <p className="text-xs text-gray-500">Contact: {viewingVendor.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingVendor(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-400 block font-medium">Phone</span>
                  <a
                    href={`tel:${viewingVendor.phone}`}
                    className="font-semibold text-amber-900 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="h-3 w-3" />
                    {viewingVendor.phone || "—"}
                  </a>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-400 block font-medium">Email</span>
                  {viewingVendor.email ? (
                    <a
                      href={`mailto:${viewingVendor.email}`}
                      className="font-semibold text-amber-900 hover:underline truncate block mt-0.5"
                    >
                      {viewingVendor.email}
                    </a>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-400 block font-medium">GSTIN</span>
                  <span className="font-semibold text-gray-900 block mt-0.5">
                    {viewingVendor.gstin || "Unregistered"}
                  </span>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-400 block font-medium">Status</span>
                  <span
                    className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      viewingVendor.status === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {viewingVendor.status}
                  </span>
                </div>

                <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-400 block font-medium">Location & Address</span>
                  <p className="font-medium text-gray-800 mt-0.5">
                    {[
                      viewingVendor.address,
                      viewingVendor.city,
                      viewingVendor.state,
                      viewingVendor.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No address recorded."}
                  </p>
                </div>

                {viewingVendor.notes && (
                  <div className="col-span-2 rounded-lg bg-amber-50/60 p-3 border border-amber-100">
                    <span className="text-amber-800 block font-medium">Notes & Terms</span>
                    <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">
                      {viewingVendor.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingVendor;
                    setViewingVendor(null);
                    openEditForm(toEdit);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit Vendor
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVendor(null)}
                  className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DELETE CONFIRMATION DIALOG                                */}
        {/* ========================================================= */}
        {deleteConfirmVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Vendor?</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-gray-900">
                  "{deleteConfirmVendor.company || deleteConfirmVendor.name}"
                </span>{" "}
                from the vendor directory?
              </p>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmVendor(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVendor}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CSV BULK IMPORT MODAL                                     */}
        {/* ========================================================= */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Bulk Import Vendors</h3>
                    <p className="text-xs text-gray-500">
                      Upload a CSV file or paste formatted CSV records
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-3 border border-gray-200">
                  <div className="text-xs text-gray-600">
                    Need the expected format? Download the ready-to-use template:
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                  >
                    <Download className="h-3 w-3" />
                    Download Sample CSV
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select CSV File:
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-xs file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Or Paste CSV Content:
                  </label>
                  <textarea
                    rows={6}
                    className="w-full font-mono text-xs rounded-lg border border-gray-300 p-3 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
                    placeholder="Vendor Name,Company Name,Contact Person,Category,Phone,Email,GSTIN,City,State,Pincode,Address,Status,Notes&#10;Rajesh Patel,Supreme Ply,Amit,Plywood,9876543210,patel@ply.com,,Pune,Maharashtra,411038,Timber Mkt,Active,"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleBulkImportSubmit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-amber-900 disabled:opacity-60 transition"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Import Records
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VENDORS TABLE & SEARCH BAR                                */}
        {/* ========================================================= */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">Suppliers Directory</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {filteredVendors.length} of {vendors.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter dropdown */}
              <select
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  className={`${inputClass} pl-8 py-1.5 text-xs`}
                  placeholder="Search name, phone, city, GSTIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
              <span>Loading suppliers from database...</span>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                <Truck className="h-6 w-6" />
              </div>
              <p className="font-medium text-gray-900">No matching vendor records found</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {search || selectedCategory !== "All" || selectedStatus !== "All"
                  ? "Try resetting your search query or filters to see all vendors."
                  : "Get started by clicking Add Vendor or importing from a CSV spreadsheet."}
              </p>
              {(search || selectedCategory !== "All" || selectedStatus !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("All");
                    setSelectedStatus("All");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3.5 font-semibold">Vendor & Company</th>
                    <th className="p-3.5 font-semibold">Category</th>
                    <th className="p-3.5 font-semibold">Contact Info</th>
                    <th className="p-3.5 font-semibold">City & State</th>
                    <th className="p-3.5 font-semibold">GSTIN</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Vendor & Company */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-900 text-xs">
                            {(vendor.company || vendor.name || "V").charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs sm:text-sm">
                              {vendor.company || vendor.name}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {vendor.name}
                              {vendor.contactPerson ? ` (${vendor.contactPerson})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${getCategoryBadgeClass(
                            vendor.category,
                          )}`}
                        >
                          {vendor.category || "Other"}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {vendor.phone ? (
                            <a
                              href={`tel:${vendor.phone}`}
                              className="flex items-center gap-1 font-medium text-gray-700 hover:text-amber-800 transition"
                            >
                              <Phone className="h-3 w-3 text-gray-400" />
                              {vendor.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}

                          {vendor.email && (
                            <a
                              href={`mailto:${vendor.email}`}
                              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-amber-800 transition truncate max-w-[170px]"
                            >
                              <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate">{vendor.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* City & State */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-gray-700">
                          <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                          <span>
                            {[vendor.city, vendor.state].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </td>

                      {/* GSTIN */}
                      <td className="p-3.5">
                        {vendor.gstin ? (
                          <div className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-800">
                            <span>{vendor.gstin}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(vendor.gstin, vendor.id)}
                              title="Copy GSTIN"
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {copiedId === vendor.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <ExternalLink className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            vendor.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              vendor.status === "Active" ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {vendor.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingVendor(vendor)}
                            title="View vendor details"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditForm(vendor)}
                            title="Edit vendor"
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmVendor(vendor)}
                            title="Delete vendor"
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
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
      </div>
    </AppShell>
  );
}

export default VendorsPage;
