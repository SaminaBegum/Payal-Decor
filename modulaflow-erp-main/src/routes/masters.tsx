import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  Tag,
  IndianRupee,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { toastService } from "@/services/toastService";

const API_BASE = (
  import.meta.env["VITE_API_URL"] ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? "/api"
    : "http://localhost:5000/api")
).replace(/\/+$/, "");

export interface Product {
  id: string;
  name: string;
  code: string;
  sku: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  costPrice?: number;
  cost_price?: number;
  hsnCode?: string;
  hsn_code?: string;
  gstRate?: number;
  gst_rate?: number;
  dimensions?: string;
  status: "Active" | "Inactive" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  categoriesCount: number;
  avgPrice: number;
  totalCatalogValue: number;
  categories: Array<{ name: string; count: number }>;
}

const DEFAULT_CATEGORIES = [
  "Modular Kitchen",
  "Wardrobe",
  "Living & TV Units",
  "Office & Desks",
  "Vanities",
  "Partitions & Paneling",
  "Custom Furniture",
  "Hardware & Accessories",
];

const UNIT_OPTIONS = [
  { value: "NOS", label: "NOS (Numbers / Units)" },
  { value: "SQFT", label: "SQFT (Square Feet)" },
  { value: "SET", label: "SET (Complete Set)" },
  { value: "RFT", label: "RFT (Running Feet)" },
  { value: "MTR", label: "MTR (Meters)" },
  { value: "BOX", label: "BOX (Package Box)" },
];

export function MastersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [submitting, setSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);

  // Form Fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "Modular Kitchen",
    customCategory: "",
    unit: "NOS",
    price: "",
    costPrice: "",
    hsnCode: "9403",
    gstRate: "18",
    dimensions: "",
    description: "",
    status: "Active",
  });

  // Fetch Products & Stats from Backend API
  const fetchProductsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/products/stats`),
      ]);

      if (productsRes.ok) {
        const prodJson = await productsRes.json();
        if (prodJson.success && Array.isArray(prodJson.data)) {
          setProducts(prodJson.data);
        }
      }

      if (statsRes.ok) {
        const statJson = await statsRes.json();
        if (statJson.success && statJson.data) {
          setStats(statJson.data);
        }
      }
    } catch (err) {
      console.warn("Could not load products from backend API:", err);
      toastService.warning("Offline Mode", "Could not load products from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProductsData();
  }, [fetchProductsData]);

  // Handle Refresh
  const handleRefresh = async () => {
    await fetchProductsData(true);
    toastService.success("Refreshed", "Product catalog updated.");
  };

  // Auto-generate SKU from category
  const handleAutoGenerateSku = async (categoryName: string) => {
    try {
      const res = await fetch(`${API_BASE}/products/next-sku?category=${encodeURIComponent(categoryName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sku) {
          setFormData((prev) => ({ ...prev, sku: data.sku }));
          toastService.info("SKU Generated", `Assigned sequential code: ${data.sku}`);
          return;
        }
      }
    } catch {
      // Fallback local SKU generator
      const prefix = categoryName.slice(0, 2).toUpperCase();
      const localSku = `PD-${prefix}-${Date.now().toString().slice(-3)}`;
      setFormData((prev) => ({ ...prev, sku: localSku }));
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    const initialCategory = "Modular Kitchen";
    setFormData({
      name: "",
      sku: "",
      category: initialCategory,
      customCategory: "",
      unit: "NOS",
      price: "",
      costPrice: "",
      hsnCode: "9403",
      gstRate: "18",
      dimensions: "",
      description: "",
      status: "Active",
    });
    void handleAutoGenerateSku(initialCategory);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: Product) => {
    setModalMode("edit");
    setEditingId(p.id);
    const isCustom = !DEFAULT_CATEGORIES.includes(p.category);
    setFormData({
      name: p.name,
      sku: p.sku || p.code,
      category: isCustom ? "Other" : p.category,
      customCategory: isCustom ? p.category : "",
      unit: p.unit || "NOS",
      price: String(p.price || ""),
      costPrice: p.costPrice !== undefined ? String(p.costPrice) : "",
      hsnCode: p.hsnCode || "9403",
      gstRate: p.gstRate !== undefined ? String(p.gstRate) : "18",
      dimensions: p.dimensions || "",
      description: p.description || "",
      status: p.status || "Active",
    });
    setShowModal(true);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toastService.warning("Validation Error", "Please provide a valid product name.");
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toastService.warning("Validation Error", "Please provide a valid selling price.");
      return;
    }

    const resolvedCategory =
      formData.category === "Other"
        ? formData.customCategory.trim() || "General"
        : formData.category;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || `PD-PRD-${Date.now().toString().slice(-4)}`,
        code: formData.sku.trim() || `PD-PRD-${Date.now().toString().slice(-4)}`,
        category: resolvedCategory,
        unit: formData.unit,
        price: priceNum,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        hsnCode: formData.hsnCode.trim() || "9403",
        gstRate: formData.gstRate ? parseFloat(formData.gstRate) : 18,
        dimensions: formData.dimensions.trim() || null,
        description: formData.description.trim() || null,
        status: formData.status,
      };

      const url =
        modalMode === "create"
          ? `${API_BASE}/products`
          : `${API_BASE}/products/${editingId}`;

      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resJson = await res.json();
        if (resJson.success) {
          toastService.success(
            modalMode === "create" ? "Product Created" : "Product Updated",
            `${payload.name} (${payload.sku}) saved to database.`
          );
          setShowModal(false);
          await fetchProductsData(true);
          return;
        }
      }

      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Failed to save product on server.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toastService.error("Operation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    try {
      const res = await fetch(`${API_BASE}/products/${deleteCandidate.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toastService.success("Deleted", `Removed product "${deleteCandidate.name}".`);
        setDeleteCandidate(null);
        await fetchProductsData(true);
      } else {
        throw new Error("Failed to delete product from server.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      toastService.error("Delete Error", msg);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      toastService.warning("Export Unavailable", "No products matching filters to export.");
      return;
    }

    const headers = [
      "Product ID",
      "SKU / Code",
      "Product Name",
      "Category",
      "Dimensions",
      "Unit",
      "Selling Price (INR)",
      "Cost Price (INR)",
      "HSN Code",
      "GST Rate (%)",
      "Status",
      "Description",
    ];

    const rows = filteredProducts.map((p) => [
      `"${p.id}"`,
      `"${p.sku || p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${(p.dimensions || "").replace(/"/g, '""')}"`,
      `"${p.unit}"`,
      p.price,
      p.costPrice || p.cost_price || 0,
      `"${p.hsnCode || p.hsn_code || "9403"}"`,
      p.gstRate || p.gst_rate || 18,
      `"${p.status}"`,
      `"${(p.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `payal_decor_products_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastService.success("Export Complete", `Exported ${filteredProducts.length} products to CSV.`);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.dimensions && p.dimensions.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === "All" ||
        p.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // Unique category list for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  return (
    <AppShell title="Master Products">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* HERO HEADER & ACTION BUTTONS                              */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-white shadow-xs">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Product Master Catalog
                  </h1>
                  <p className="text-xs text-gray-500">
                    Manage Payal Decor finished and modular furniture products, SKUs, specifications, and pricing.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-3.5 w-3.5 text-gray-500" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-amber-900 transition"
              >
                <Plus className="h-4 w-4" />
                Add New Product
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRODUCT KPI SUMMARY RIBBON                                */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Total Catalog Items</span>
              <Boxes className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats?.total ?? products.length}
            </div>
            <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats?.active ?? products.filter((p) => p.status === "Active").length} active offerings
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Product Categories</span>
              <Layers className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats?.categoriesCount ?? availableCategories.length}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Modular furniture lines
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Average Unit Price</span>
              <IndianRupee className="h-4 w-4 text-amber-700" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              ₹{(stats?.avgPrice ?? (products.length > 0 ? Math.round(products.reduce((acc, p) => acc + p.price, 0) / products.length) : 0)).toLocaleString("en-IN")}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Across catalog offerings
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Catalog Gross Value</span>
              <Tag className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              ₹{(stats?.totalCatalogValue ?? products.reduce((acc, p) => acc + p.price, 0)).toLocaleString("en-IN")}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Standard list price sum
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEARCH, FILTER BAR & TABLE CONTAINER                      */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/50">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name, SKU, category, or dimensions..."
                className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-8 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs font-medium text-gray-500">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 outline-none focus:border-amber-700"
                >
                  <option value="All">All Categories ({products.length})</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 outline-none focus:border-amber-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <span className="text-xs font-semibold text-gray-500 ml-1">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {/* Product Records Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-800 mx-auto" />
              <p>Loading Payal Decor product catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 space-y-3">
              <AlertCircle className="h-8 w-8 text-amber-700 mx-auto" />
              <p className="font-semibold text-gray-800">No products found</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {search || categoryFilter !== "All" || statusFilter !== "All"
                  ? "Try adjusting your search query or filters to find products."
                  : "Click '+ Add New Product' above to register your first catalog item."}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-amber-900 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-semibold">SKU / Code</th>
                    <th className="p-3 font-semibold">Product Name & Specs</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Unit</th>
                    <th className="p-3 font-semibold text-right">Selling Price</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition">
                      {/* SKU / Code */}
                      <td className="p-3">
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                          {p.sku || p.code}
                        </span>
                        {p.hsnCode && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            HSN: {p.hsnCode}
                          </div>
                        )}
                      </td>

                      {/* Name & Details */}
                      <td className="p-3 max-w-md">
                        <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                        {p.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        )}
                        {p.dimensions && (
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                            <span>Dim:</span>
                            <span>{p.dimensions}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {p.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="p-3">
                        <span className="font-mono text-gray-600 font-semibold">
                          {p.unit || "NOS"}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-gray-900 text-sm">
                          ₹{p.price.toLocaleString("en-IN")}
                        </div>
                        {p.costPrice !== undefined && p.costPrice > 0 && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Cost: ₹{p.costPrice.toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            p.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {p.status === "Active" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-gray-400" />
                          )}
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Product"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-amber-800 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(p)}
                            title="Delete Product"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
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
        </div>

        {/* ========================================================= */}
        {/* ADD / EDIT PRODUCT MODAL DRAWER                           */}
        {/* ========================================================= */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {modalMode === "create" ? "Add New Product" : "Edit Product Details"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {modalMode === "create"
                      ? "Register a new finished modular offering into Payal Decor product master."
                      : "Modify specifications, pricing, and properties of this product."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
                {/* Product Name & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. L-Shaped Modular Kitchen"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Product Code / SKU <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerateSku(formData.category)}
                        className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Auto SKU
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PD-KT-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-mono font-semibold text-gray-900 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200"
                    />
                  </div>
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, category: val });
                        if (modalMode === "create") {
                          void handleAutoGenerateSku(val);
                        }
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 outline-none focus:border-amber-700"
                    >
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Other">Other / Custom Category...</option>
                    </select>

                    {formData.category === "Other" && (
                      <input
                        type="text"
                        placeholder="Enter custom category name"
                        value={formData.customCategory}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-700"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit of Measure <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 outline-none focus:border-amber-700"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selling Price & Cost Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Selling Price (₹ INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-amber-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cost / Prime Price (₹ INR) (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Internal baseline cost"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-amber-700"
                      />
                    </div>
                  </div>
                </div>

                {/* HSN Code, GST Rate & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      HSN Code
                    </label>
                    <input
                      type="text"
                      placeholder="9403"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      GST Rate (%)
                    </label>
                    <select
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-700"
                    >
                      <option value="18">18% (Standard Furniture)</option>
                      <option value="12">12% (Pre-fabricated)</option>
                      <option value="28">28% (Luxury fittings)</option>
                      <option value="5">5% (Raw materials)</option>
                      <option value="0">0% (Nil)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Catalog Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-amber-700"
                    >
                      <option value="Active">Active (Available)</option>
                      <option value="Inactive">Inactive (Archived)</option>
                    </select>
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Standard Dimensions / Specifications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1800mm (W) x 600mm (D) x 750mm (H)"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-700"
                  />
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Product Description & Technical Specifications
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter core materials, finish details, hardware inclusions, warranty, etc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-700 resize-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-900 transition disabled:opacity-50"
                  >
                    {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {modalMode === "create" ? "Create Product" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DELETE CONFIRMATION MODAL                                 */}
        {/* ========================================================= */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirm Deletion</h3>
                  <p className="text-xs text-gray-500">This action will remove the product from the master catalog.</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-1 text-xs">
                <div className="font-bold text-gray-900">{deleteCandidate.name}</div>
                <div className="text-gray-500 font-mono">SKU: {deleteCandidate.sku || deleteCandidate.code}</div>
                <div className="text-gray-500">Category: {deleteCandidate.category}</div>
                <div className="font-semibold text-amber-900">Price: ₹{deleteCandidate.price.toLocaleString("en-IN")}</div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default MastersPage;
