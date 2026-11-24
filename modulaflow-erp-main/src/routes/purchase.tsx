import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Truck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Download,
  CheckCircle2,
  Filter,
  Eye,
  Printer,
  Calendar,
  IndianRupee,
  PackageCheck,
  AlertCircle,
  Clock,
  Check,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { generateId } from "@/lib/utils";
import { toastService } from "@/services/toastService";

const API_BASE = (
  import.meta.env["VITE_API_URL"] ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? "/api"
    : "http://localhost:5000/api")
).replace(/\/+$/, "");

export type POStatus =
  | "Draft"
  | "Pending"
  | "Approved"
  | "Ordered"
  | "Received"
  | "Cancelled";

export interface PurchaseItem {
  id: string;
  description: string;
  category: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendorId?: string;
  vendor: string; // Company / Supplier Name
  vendorName: string; // Contact Person
  vendorPhone: string;
  vendorEmail: string;
  vendorGstin: string;
  vendorAddress: string;
  date: string;
  expectedDeliveryDate: string;
  deliveryAddress: string;
  paymentTerms: string;
  notes: string;
  status: POStatus;
  items: PurchaseItem[];
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  transportCharges: number;
  roundOff: number;
  grandTotal: number;
  createdAt?: string;
}

interface VendorOption {
  id: string;
  name: string;
  company: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  category?: string;
}

interface MaterialCatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  rate: number;
  hsnCode?: string;
  gstRate?: number;
}

const UNIT_OPTIONS = [
  "Sheets",
  "Nos",
  "RFT",
  "Sq.Ft",
  "Kg",
  "Boxes",
  "Pairs",
  "Sets",
  "Liters",
  "Bundles",
];

const GST_RATES = [0, 5, 12, 18, 28];

const DEFAULT_TERMS = [
  "1. Prices are inclusive of packaging & loading unless specified otherwise.",
  "2. Quality inspection upon delivery; damaged/substandard materials will be returned at supplier's cost.",
  "3. Invoice & E-Way Bill must mention this Purchase Order number.",
  "4. Payment terms: 30 days from date of verified goods receipt note (GRN).",
];

const STANDARD_MATERIALS: MaterialCatalogItem[] = [
  { id: "mat-1", name: "18mm BWR Marine Plywood (8x4)", category: "Plywood", unit: "Sheets", rate: 2850, hsnCode: "4412", gstRate: 18 },
  { id: "mat-2", name: "25mm Pre-Lam Particle Board (8x4)", category: "Plywood", unit: "Sheets", rate: 2400, hsnCode: "4410", gstRate: 18 },
  { id: "mat-3", name: "18mm Interior Grade MDF (8x4)", category: "Plywood", unit: "Sheets", rate: 2100, hsnCode: "4411", gstRate: 18 },
  { id: "mat-4", name: "1mm Decorative Laminate (8x4)", category: "Laminates", unit: "Sheets", rate: 1450, hsnCode: "4823", gstRate: 18 },
  { id: "mat-5", name: "2mm PVC Edge Banding Tape (Walnut)", category: "Edge Band", unit: "RFT", rate: 8.5, hsnCode: "3920", gstRate: 18 },
  { id: "mat-6", name: "0.8mm PVC Edge Banding Tape", category: "Edge Band", unit: "RFT", rate: 4.5, hsnCode: "3920", gstRate: 18 },
  { id: "mat-7", name: "Soft-Close Hydraulic Hinges (0 Crank)", category: "Hardware", unit: "Pairs", rate: 320, hsnCode: "8302", gstRate: 18 },
  { id: "mat-8", name: "18\" Telescopic Ball Bearing Slides (45kg)", category: "Hardware", unit: "Sets", rate: 480, hsnCode: "8302", gstRate: 18 },
  { id: "mat-9", name: "Minifix Cam & Dowel Connectors (100 pcs)", category: "Hardware", unit: "Boxes", rate: 450, hsnCode: "7318", gstRate: 18 },
  { id: "mat-10", name: "MS Loop Legs 50x50mm Powder Coated", category: "Hardware", unit: "Nos", rate: 1450, hsnCode: "9403", gstRate: 18 },
  { id: "mat-11", name: "12mm Toughened Glass Partition Panel", category: "Glass", unit: "Sq.Ft", rate: 195, hsnCode: "7007", gstRate: 18 },
  { id: "mat-12", name: "Acoustic Fabric Pin-up Tile (600x600)", category: "Fabric", unit: "Nos", rate: 380, hsnCode: "5907", gstRate: 12 },
];

const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-seed-001",
    poNo: "PO-2026-27/001",
    vendor: "Shree Ganesh Timber & Plywood",
    vendorName: "Ramesh Patel",
    vendorPhone: "9876543210",
    vendorEmail: "sales@shreetimber.com",
    vendorGstin: "27AAAAA0000A1Z5",
    vendorAddress: "Plot 45, Timber Market, Pune 411038",
    date: "2026-11-15",
    expectedDeliveryDate: "2026-11-20",
    deliveryAddress: "Payal Decor Central Works, Timber Market, Pune",
    paymentTerms: "30 Days Credit",
    notes: "Commercial Marine grade with ISI mark certification",
    status: "Received",
    items: [
      {
        id: "item-1",
        description: "18mm BWR Marine Plywood (8x4)",
        category: "Plywood",
        hsnCode: "4412",
        quantity: 100,
        unit: "Sheets",
        rate: 2850,
        discountPct: 5,
        gstRate: 18,
        taxableAmount: 270750,
        gstAmount: 48735,
        total: 319485,
      },
    ],
    subtotal: 285000,
    discountTotal: 14250,
    taxableTotal: 270750,
    cgst: 24367.5,
    sgst: 24367.5,
    igst: 0,
    transportCharges: 2500,
    roundOff: 0,
    grandTotal: 321985,
  },
  {
    id: "po-seed-002",
    poNo: "PO-2026-27/002",
    vendor: "Supreme Hardware & Fittings",
    vendorName: "Kavya Yadav",
    vendorPhone: "9112903532",
    vendorEmail: "yadavkavya@gmail.com",
    vendorGstin: "27BBBPS1234B1Z2",
    vendorAddress: "Shop 12, Industrial Area, Pune 411026",
    date: "2026-11-18",
    expectedDeliveryDate: "2026-11-25",
    deliveryAddress: "Payal Decor Project Site, Hinjawadi Phase 2, Pune",
    paymentTerms: "50% Advance, 50% on Delivery",
    notes: "SS 304 Soft close hinges with mounting screws",
    status: "Ordered",
    items: [
      {
        id: "item-2",
        description: "Soft-Close Hydraulic Hinges (0 Crank)",
        category: "Hardware",
        hsnCode: "8302",
        quantity: 150,
        unit: "Pairs",
        rate: 320,
        discountPct: 0,
        gstRate: 18,
        taxableAmount: 48000,
        gstAmount: 8640,
        total: 56640,
      },
      {
        id: "item-3",
        description: "18\" Telescopic Ball Bearing Slides (45kg)",
        category: "Hardware",
        hsnCode: "8302",
        quantity: 80,
        unit: "Sets",
        rate: 480,
        discountPct: 5,
        gstRate: 18,
        taxableAmount: 36480,
        gstAmount: 6566.4,
        total: 43046.4,
      },
    ],
    subtotal: 86400,
    discountTotal: 1920,
    taxableTotal: 84480,
    cgst: 7603.2,
    sgst: 7603.2,
    igst: 0,
    transportCharges: 800,
    roundOff: 0.6,
    grandTotal: 100487,
  },
  {
    id: "po-seed-003",
    poNo: "PO-2026-27/003",
    vendor: "Global Edge Bands & Polymers",
    vendorName: "Vijay Patil",
    vendorPhone: "9112134193",
    vendorEmail: "patilvijay@gmail.com",
    vendorGstin: "27CDEPG5678C1Z8",
    vendorAddress: "MIDC Kupwad, Sangli 416436",
    date: "2026-11-21",
    expectedDeliveryDate: "2026-11-28",
    deliveryAddress: "Payal Decor Central Works, Timber Market, Pune",
    paymentTerms: "Immediate on Receipt",
    notes: "High gloss 2mm edge band rolls (50m per roll)",
    status: "Pending",
    items: [
      {
        id: "item-4",
        description: "2mm PVC Edge Banding Tape (Walnut)",
        category: "Edge Band",
        hsnCode: "3920",
        quantity: 2500,
        unit: "RFT",
        rate: 8.5,
        discountPct: 2,
        gstRate: 18,
        taxableAmount: 20825,
        gstAmount: 3748.5,
        total: 24573.5,
      },
    ],
    subtotal: 21250,
    discountTotal: 425,
    taxableTotal: 20825,
    cgst: 1874.25,
    sgst: 1874.25,
    igst: 0,
    transportCharges: 600,
    roundOff: 0.25,
    grandTotal: 25174,
  },
];

function createEmptyItem(): PurchaseItem {
  return {
    id: generateId("item"),
    description: "",
    category: "Plywood",
    hsnCode: "9403",
    quantity: 1,
    unit: "Sheets",
    rate: 0,
    discountPct: 0,
    gstRate: 18,
    taxableAmount: 0,
    gstAmount: 0,
    total: 0,
  };
}

function calculateItem(item: PurchaseItem): PurchaseItem {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const gross = qty * rate;
  const discount = gross * ((Number(item.discountPct) || 0) / 100);
  const taxable = Math.max(0, gross - discount);
  const gst = taxable * ((Number(item.gstRate) || 0) / 100);
  const total = taxable + gst;

  return {
    ...item,
    taxableAmount: Math.round(taxable * 100) / 100,
    gstAmount: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

function getStatusBadgeClass(status: POStatus) {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Approved":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "Ordered":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "Received":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "Cancelled":
      return "bg-red-50 text-red-800 border-red-200";
    case "Draft":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function Purchase() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    if (typeof window === "undefined") return SEED_PURCHASE_ORDERS;
    const local = localStorage.getItem("payal_decor_purchase_orders_v2");
    if (!local) return SEED_PURCHASE_ORDERS;
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_PURCHASE_ORDERS;
    } catch {
      return SEED_PURCHASE_ORDERS;
    }
  });

  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [materialCatalog, setMaterialCatalog] = useState<MaterialCatalogItem[]>(STANDARD_MATERIALS);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Fields
  const [poNo, setPoNo] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorCompany, setVendorCompany] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("Payal Decor Central Works, Timber Market, Pune 411038");
  const [paymentTerms, setPaymentTerms] = useState("30 Days Credit");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<POStatus>("Pending");
  const [transportCharges, setTransportCharges] = useState<number>(0);
  const [items, setItems] = useState<PurchaseItem[]>([createEmptyItem()]);

  // Modal Preview / Print
  const [previewPO, setPreviewPO] = useState<PurchaseOrder | null>(null);
  const [deleteConfirmPO, setDeleteConfirmPO] = useState<PurchaseOrder | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("payal_decor_purchase_orders_v2", JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  // Load registered vendors from Vendors Module
  const loadVendors = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/vendors`);
      if (response.ok) {
        const data = await response.json();
        const rows: VendorOption[] = Array.isArray(data) ? data : data.vendors ?? data.data ?? [];
        setVendorOptions(rows.filter((v) => v.status === "Active" || !v.status));
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Load raw materials from Master Catalog
  const loadMaterials = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/estimation/materials`);
      if (response.ok) {
        const data = await response.json();
        const rows = data.materials || data.data || [];
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: MaterialCatalogItem[] = rows.map((r: MaterialCatalogItem) => ({
            id: r.id,
            name: r.name,
            category: r.category || "General",
            unit: r.unit || "Sheets",
            rate: Number(r.rate) || 0,
            hsnCode: r.hsnCode || "9403",
            gstRate: Number(r.gstRate) || 18,
          }));
          setMaterialCatalog([...STANDARD_MATERIALS, ...mapped]);
        }
      }
    } catch {
      // Fallback to standard presets
    }
  }, []);

  // Fetch purchase orders directly from PostgreSQL database via API
  const loadPurchaseOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/purchase`);
      if (response.ok) {
        const data = await response.json();
        const rows = data.purchaseOrders || data.data || [];
        if (Array.isArray(rows) && rows.length > 0) {
          setPurchaseOrders(rows);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not load purchase orders from database API, using cache:", err);
    }
  }, []);

  useEffect(() => {
    void loadPurchaseOrders();
    void loadVendors();
    void loadMaterials();
  }, [loadPurchaseOrders, loadVendors, loadMaterials]);

  // Auto-generate sequential PO Number
  const generateNextPoNumber = useCallback((): string => {
    const currentYear = new Date().getFullYear();
    const nextYearSuffix = String((currentYear + 1) % 100).padStart(2, "0");
    const prefix = `PO-${currentYear}-${nextYearSuffix}/`;

    const matchingNumbers = purchaseOrders
      .map((p) => {
        if (p.poNo && p.poNo.includes(prefix)) {
          const num = parseInt(p.poNo.replace(prefix, ""), 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((n) => n > 0);

    const max = matchingNumbers.length > 0 ? Math.max(...matchingNumbers) : purchaseOrders.length;
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }, [purchaseOrders]);

  // Handle vendor select change
  const handleVendorSelect = (companyName: string) => {
    setVendorCompany(companyName);
    const found = vendorOptions.find((v) => v.company === companyName || v.name === companyName);
    if (found) {
      setSelectedVendorId(found.id);
      setVendorName(found.name || "");
      setVendorPhone(found.phone || "");
      setVendorEmail(found.email || "");
      setVendorGstin(found.gstin || "");
      setVendorAddress([found.address, found.city, found.state].filter(Boolean).join(", "));
    }
  };

  // Quick Pick Material for a line item
  const handleSelectPresetMaterial = (index: number, matId: string) => {
    const found = materialCatalog.find((m) => m.id === matId);
    if (!found) return;

    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      if (!cur) return prev;
      copy[index] = calculateItem({
        ...cur,
        description: found.name,
        category: found.category,
        unit: found.unit,
        rate: found.rate,
        hsnCode: found.hsnCode || cur.hsnCode || "9403",
        gstRate: found.gstRate || 18,
      });
      return copy;
    });
  };

  // Update item field
  const updateItemField = <K extends keyof PurchaseItem>(index: number, field: K, val: PurchaseItem[K]) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      if (!cur) return prev;
      const updated = { ...cur, [field]: val };
      copy[index] = calculateItem(updated);
      return copy;
    });
  };

  const addLineItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeLineItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // Cost & Tax Calculations
  const calculatedTotals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let taxable = 0;
    let gst = 0;

    for (const item of items) {
      const gross = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      const discount = gross * ((Number(item.discountPct) || 0) / 100);
      sub += gross;
      disc += discount;
      taxable += item.taxableAmount;
      gst += item.gstAmount;
    }

    // Determine inter-state (IGST) vs intra-state (CGST + SGST)
    // Default to Maharashtra (state code 27)
    const isInterstate = vendorGstin.trim().length >= 2 && !vendorGstin.startsWith("27");
    const cgst = isInterstate ? 0 : Math.round((gst / 2) * 100) / 100;
    const sgst = isInterstate ? 0 : Math.round((gst / 2) * 100) / 100;
    const igst = isInterstate ? Math.round(gst * 100) / 100 : 0;

    const transport = Number(transportCharges) || 0;
    const rawGrandTotal = taxable + gst + transport;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

    return {
      subtotal: Math.round(sub * 100) / 100,
      discountTotal: Math.round(disc * 100) / 100,
      taxableTotal: Math.round(taxable * 100) / 100,
      cgst,
      sgst,
      igst,
      gstTotal: Math.round(gst * 100) / 100,
      transportCharges: transport,
      roundOff,
      grandTotal: roundedGrandTotal,
    };
  }, [items, transportCharges, vendorGstin]);

  // Executive KPI ribbon metrics
  const kpi = useMemo(() => {
    const total = purchaseOrders.length;
    const pending = purchaseOrders.filter((p) => p.status === "Pending").length;
    const active = purchaseOrders.filter((p) => p.status === "Approved" || p.status === "Ordered").length;
    const received = purchaseOrders.filter((p) => p.status === "Received").length;
    const totalSpend = purchaseOrders
      .filter((p) => p.status !== "Cancelled")
      .reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    return { total, pending, active, received, totalSpend };
  }, [purchaseOrders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      if (statusFilter !== "All" && po.status !== statusFilter) return false;
      if (!q) return true;
      return (
        po.poNo.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q) ||
        po.vendorName.toLowerCase().includes(q) ||
        po.items.some((i) => i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      );
    });
  }, [purchaseOrders, search, statusFilter]);

  // Open Create Form
  const openCreate = () => {
    setEditingId(null);
    setPoNo(generateNextPoNumber());
    setSelectedVendorId("");
    setVendorCompany("");
    setVendorName("");
    setVendorPhone("");
    setVendorEmail("");
    setVendorGstin("");
    setVendorAddress("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDate("");
    setDeliveryAddress("Payal Decor Central Works, Timber Market, Pune 411038");
    setPaymentTerms("30 Days Credit");
    setNotes("");
    setStatus("Pending");
    setTransportCharges(0);
    setItems([createEmptyItem()]);
    setError("");
    setSuccess("");
    setIsSaved(false);
    setShowForm(true);
  };

  // Open Edit Form
  const openEdit = (po: PurchaseOrder) => {
    setEditingId(po.id);
    setPoNo(po.poNo);
    setSelectedVendorId(po.vendorId || "");
    setVendorCompany(po.vendor);
    setVendorName(po.vendorName || "");
    setVendorPhone(po.vendorPhone || "");
    setVendorEmail(po.vendorEmail || "");
    setVendorGstin(po.vendorGstin || "");
    setVendorAddress(po.vendorAddress || "");
    setOrderDate(po.date);
    setExpectedDate(po.expectedDeliveryDate || "");
    setDeliveryAddress(po.deliveryAddress || "Payal Decor Central Works, Timber Market, Pune 411038");
    setPaymentTerms(po.paymentTerms || "30 Days Credit");
    setNotes(po.notes || "");
    setStatus(po.status);
    setTransportCharges(po.transportCharges || 0);
    setItems(po.items.length > 0 ? po.items.map((i) => calculateItem(i)) : [createEmptyItem()]);
    setError("");
    setSuccess("");
    setIsSaved(false);
    setShowForm(true);
  };

  // Save / Update PO Handler
  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorCompany.trim()) {
      setError("Please select or enter a supplier company name.");
      toastService.warning("Supplier Required", "Please select or enter a supplier company name.");
      return;
    }

    if (items.some((i) => !i.description.trim() || i.quantity <= 0 || i.rate <= 0)) {
      setError("Please ensure all items have a description, positive quantity, and rate.");
      toastService.warning("Invalid Line Items", "Please ensure all items have a description, positive quantity, and rate.");
      return;
    }

    setSaving(true);
    setError("");

    const newPO: PurchaseOrder = {
      id: editingId || `po-${Date.now()}`,
      poNo: poNo.trim(),
      vendorId: selectedVendorId,
      vendor: vendorCompany.trim(),
      vendorName: vendorName.trim(),
      vendorPhone: vendorPhone.trim(),
      vendorEmail: vendorEmail.trim(),
      vendorGstin: vendorGstin.trim(),
      vendorAddress: vendorAddress.trim(),
      date: orderDate,
      expectedDeliveryDate: expectedDate,
      deliveryAddress: deliveryAddress.trim(),
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim(),
      status,
      items,
      subtotal: calculatedTotals.subtotal,
      discountTotal: calculatedTotals.discountTotal,
      taxableTotal: calculatedTotals.taxableTotal,
      cgst: calculatedTotals.cgst,
      sgst: calculatedTotals.sgst,
      igst: calculatedTotals.igst,
      transportCharges: calculatedTotals.transportCharges,
      roundOff: calculatedTotals.roundOff,
      grandTotal: calculatedTotals.grandTotal,
      createdAt: new Date().toISOString(),
    };

    // Save to PostgreSQL Backend via API
    try {
      const url = editingId ? `${API_BASE}/purchase/${editingId}` : `${API_BASE}/purchase`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPO),
      });

      if (res.ok) {
        const payload = await res.json();
        const savedOrder = payload.data || payload.purchaseOrder;
        if (savedOrder) {
          setPurchaseOrders((prev) => {
            if (editingId) {
              return prev.map((p) => (p.id === editingId ? savedOrder : p));
            }
            return [savedOrder, ...prev];
          });
        } else {
          setPurchaseOrders((prev) => {
            if (editingId) {
              return prev.map((p) => (p.id === editingId ? newPO : p));
            }
            return [newPO, ...prev];
          });
        }
        toastService.success(
          editingId ? "Purchase Order Updated" : "Purchase Order Created",
          `PO ${newPO.poNo} saved to database with ${newPO.items.length} items.`
        );
      } else {
        // Fallback to local state if server returned an error
        setPurchaseOrders((prev) => {
          if (editingId) {
            return prev.map((p) => (p.id === editingId ? newPO : p));
          }
          return [newPO, ...prev];
        });
        toastService.info("Saved to Local Cache", `PO ${newPO.poNo} saved locally.`);
      }
    } catch (err) {
      console.warn("Could not sync PO with database server, saving locally:", err);
      setPurchaseOrders((prev) => {
        if (editingId) {
          return prev.map((p) => (p.id === editingId ? newPO : p));
        }
        return [newPO, ...prev];
      });
      toastService.info("Saved Locally", `PO ${newPO.poNo} cached while database reconnects.`);
    }

    // Trigger Interactive Saved state feedback
    setIsSaved(true);
    setSuccess(editingId ? "Purchase Order updated successfully." : "New Purchase Order registered successfully.");

    // Hold saved feedback for 1.2s before closing modal
    setTimeout(() => {
      setShowForm(false);
      setEditingId(null);
      setIsSaved(false);
      setSaving(false);
    }, 1200);
  };

  // Fast status update from table dropdown (persists to DB)
  const handleQuickStatusChange = async (id: string, newStatus: POStatus) => {
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    toastService.success("Status Updated", `Order status changed to "${newStatus}".`);

    try {
      await fetch(`${API_BASE}/purchase/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn("Failed to patch PO status on database:", err);
    }
  };

  // Delete PO (persists to DB with cascading line items)
  const confirmDeletePO = async () => {
    if (!deleteConfirmPO) return;
    const targetId = deleteConfirmPO.id;
    const targetPoNo = deleteConfirmPO.poNo;
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== targetId));
    setDeleteConfirmPO(null);
    setSuccess("Purchase Order removed successfully.");
    toastService.success("Purchase Order Deleted", `PO ${targetPoNo} removed successfully.`);

    try {
      await fetch(`${API_BASE}/purchase/${targetId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Failed to delete PO on database:", err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const list = filteredOrders.length > 0 ? filteredOrders : purchaseOrders;
    if (list.length === 0) {
      alert("No purchase orders to export.");
      toastService.info("Export Info", "No purchase orders to export.");
      return;
    }

    const headers = [
      "PO Number",
      "Supplier",
      "Contact Person",
      "Phone",
      "GSTIN",
      "Order Date",
      "Delivery Date",
      "Status",
      "Items Count",
      "Subtotal",
      "CGST",
      "SGST",
      "IGST",
      "Freight",
      "Grand Total",
    ];

    const rows = list.map((p) => [
      `"${p.poNo}"`,
      `"${p.vendor}"`,
      `"${p.vendorName}"`,
      `"${p.vendorPhone}"`,
      `"${p.vendorGstin}"`,
      `"${p.date}"`,
      `"${p.expectedDeliveryDate || ""}"`,
      `"${p.status}"`,
      `"${p.items.length}"`,
      `"${p.subtotal}"`,
      `"${p.cgst}"`,
      `"${p.sgst}"`,
      `"${p.igst}"`,
      `"${p.transportCharges}"`,
      `"${p.grandTotal}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payal_decor_purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastService.success("Export Complete", `Exported ${list.length} purchase orders to CSV.`);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-200 transition-colors";

  return (
    <AppShell title="Purchase Management">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* TOP HEADER & ACTION BUTTONS                               */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Purchase Orders
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Procure raw materials, manage supplier orders, and track GST input taxes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadVendors();
                void loadMaterials();
              }}
              title="Refresh suppliers and materials"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export POs to CSV"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <Download className="h-3.5 w-3.5 text-gray-500" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-amber-900 transition"
            >
              <Plus className="h-4 w-4" />
              Create Purchase Order
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* NOTIFICATION BANNERS                                      */}
        {/* ========================================================= */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")} className="rounded p-1 hover:bg-red-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3 text-xs sm:text-sm text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess("")} className="rounded p-1 hover:bg-green-100">
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
              <span className="text-xs font-medium text-gray-500">Total Orders</span>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.total}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">All procurement orders</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">Pending Approval</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-900">{kpi.pending}</p>
            <p className="mt-0.5 text-[11px] text-amber-700/70">Awaiting sign-off</p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700">Active / Ordered</span>
              <Truck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-900">{kpi.active}</p>
            <p className="mt-0.5 text-[11px] text-indigo-700/70">In transit / processing</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Goods Received</span>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{kpi.received}</p>
            <p className="mt-0.5 text-[11px] text-emerald-700/70">In warehouse inventory</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">Procurement Value</span>
              <IndianRupee className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatINR(kpi.totalSpend)}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">Gross purchase spend</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STATUS FILTER TABS                                        */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-gray-500 shrink-0">
            <Filter className="h-3 w-3" /> Status:
          </span>
          {["All", "Pending", "Approved", "Ordered", "Received", "Cancelled"].map((st) => {
            const count =
              st === "All"
                ? purchaseOrders.length
                : purchaseOrders.filter((p) => p.status === st).length;
            const isSelected = statusFilter === st;

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
                  isSelected
                    ? "bg-amber-800 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{st}</span>
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
        {/* CREATE / EDIT PURCHASE ORDER MODAL STUDIO                 */}
        {/* ========================================================= */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100">
              {/* Modal Top Bar */}
              <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingId ? `Edit Purchase Order (${poNo})` : "Create Purchase Order"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Generate official PO for raw materials with itemized GST breakdown.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500">PO No:</span>
                    <input
                      className="rounded border border-gray-300 px-2 py-1 font-mono text-xs font-bold text-gray-900 bg-gray-50 outline-none w-36"
                      value={poNo}
                      onChange={(e) => setPoNo(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSavePO} className="p-6 space-y-6">
                {/* Section 1: Supplier & Logistics Info */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Truck className="h-4 w-4" /> 1. Supplier & Logistics Information
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      Connected with Vendors Module ({vendorOptions.length} registered suppliers)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {/* Supplier Select */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Supplier / Vendor *
                      </label>
                      <select
                        className={inputClass}
                        required
                        value={vendorCompany}
                        onChange={(e) => handleVendorSelect(e.target.value)}
                      >
                        <option value="">Select registered supplier...</option>
                        {vendorOptions.map((v) => (
                          <option key={v.id} value={v.company || v.name}>
                            {v.company || v.name} {v.city ? `(${v.city})` : ""} — {v.category || "General"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Contact Person</label>
                      <input
                        className={inputClass}
                        placeholder="Sales representative..."
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Phone</label>
                      <input
                        className={inputClass}
                        placeholder="e.g. 9876543210"
                        value={vendorPhone}
                        onChange={(e) => setVendorPhone(e.target.value)}
                      />
                    </div>

                    {/* GSTIN */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Vendor GSTIN</label>
                      <input
                        className={inputClass}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        value={vendorGstin}
                        onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                      />
                    </div>

                    {/* Order Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Order Date *</label>
                      <input
                        type="date"
                        required
                        className={inputClass}
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </div>

                    {/* Expected Delivery Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Expected Delivery</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                      />
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Payment Terms</label>
                      <input
                        className={inputClass}
                        placeholder="e.g. 30 Days Credit"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                      />
                    </div>

                    {/* Delivery Site Address */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Delivery Address</label>
                      <input
                        className={inputClass}
                        placeholder="Factory / site delivery destination..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </div>

                    {/* PO Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Order Status</label>
                      <select
                        className={inputClass}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as POStatus)}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Ordered">Ordered (Sent to Supplier)</option>
                        <option value="Received">Received (In Stock)</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Line Items Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Layers className="h-4 w-4" /> 2. Items & Raw Materials Specifications
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Pick standard interior materials or enter custom procurement specifications.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addLineItem}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full min-w-[850px] text-xs">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 text-left w-6">#</th>
                          <th className="p-2.5 text-left">Quick Pick Material</th>
                          <th className="p-2.5 text-left">Item Description *</th>
                          <th className="p-2.5 text-left w-24">HSN</th>
                          <th className="p-2.5 text-right w-20">Qty *</th>
                          <th className="p-2.5 text-left w-24">Unit</th>
                          <th className="p-2.5 text-right w-24">Rate (₹) *</th>
                          <th className="p-2.5 text-right w-16">Disc %</th>
                          <th className="p-2.5 text-right w-16">GST %</th>
                          <th className="p-2.5 text-right w-28">Total (₹)</th>
                          <th className="p-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-amber-50/20">
                            <td className="p-2.5 text-gray-400 font-medium">{idx + 1}</td>

                            {/* Preset Material Selector */}
                            <td className="p-2">
                              <select
                                className="w-36 rounded border border-gray-200 bg-white p-1 text-[11px] outline-none"
                                onChange={(e) => handleSelectPresetMaterial(idx, e.target.value)}
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Choose Preset...
                                </option>
                                {materialCatalog.map((mat) => (
                                  <option key={mat.id} value={mat.id}>
                                    {mat.name} (₹{mat.rate})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Item Description */}
                            <td className="p-2">
                              <input
                                required
                                className="w-full rounded border border-gray-200 p-1 text-xs outline-none focus:border-amber-600"
                                placeholder="Material / item specification..."
                                value={item.description}
                                onChange={(e) => updateItemField(idx, "description", e.target.value)}
                              />
                            </td>

                            {/* HSN */}
                            <td className="p-2">
                              <input
                                className="w-full rounded border border-gray-200 p-1 text-xs font-mono outline-none"
                                value={item.hsnCode}
                                onChange={(e) => updateItemField(idx, "hsnCode", e.target.value)}
                              />
                            </td>

                            {/* Quantity */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                required
                                className="w-full rounded border border-gray-200 p-1 text-xs text-right outline-none font-semibold"
                                value={item.quantity}
                                onChange={(e) => updateItemField(idx, "quantity", parseFloat(e.target.value) || 0)}
                              />
                            </td>

                            {/* Unit */}
                            <td className="p-2">
                              <select
                                className="w-full rounded border border-gray-200 p-1 text-xs outline-none"
                                value={item.unit}
                                onChange={(e) => updateItemField(idx, "unit", e.target.value)}
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Rate */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                className="w-full rounded border border-gray-200 p-1 text-xs text-right outline-none font-semibold"
                                value={item.rate}
                                onChange={(e) => updateItemField(idx, "rate", parseFloat(e.target.value) || 0)}
                              />
                            </td>

                            {/* Discount % */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full rounded border border-gray-200 p-1 text-xs text-right outline-none"
                                value={item.discountPct}
                                onChange={(e) => updateItemField(idx, "discountPct", parseFloat(e.target.value) || 0)}
                              />
                            </td>

                            {/* GST Rate */}
                            <td className="p-2">
                              <select
                                className="w-full rounded border border-gray-200 p-1 text-xs text-right outline-none"
                                value={item.gstRate}
                                onChange={(e) => updateItemField(idx, "gstRate", parseInt(e.target.value, 10) || 0)}
                              >
                                {GST_RATES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}%
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Total Line Amount */}
                            <td className="p-2 text-right font-bold text-gray-900">
                              ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Remove button */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                disabled={items.length <= 1}
                                className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 3: Cost Summary & Taxation */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 border-t pt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Purchase Order Terms & Quality Notes
                    </label>
                    <textarea
                      rows={4}
                      className={inputClass}
                      placeholder="Special instructions, warranty requirements, delivery timings..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="mt-2 text-[11px] text-gray-500">
                      Standard Payal Decor terms will be appended automatically on the PDF.
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal (Gross Item Total):</span>
                      <span className="font-semibold text-gray-900">₹{calculatedTotals.subtotal.toFixed(2)}</span>
                    </div>

                    {calculatedTotals.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Less Discount:</span>
                        <span>-₹{calculatedTotals.discountTotal.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Amount:</span>
                      <span className="font-semibold text-gray-900">₹{calculatedTotals.taxableTotal.toFixed(2)}</span>
                    </div>

                    {calculatedTotals.igst > 0 ? (
                      <div className="flex justify-between text-gray-600">
                        <span>Integrated GST (IGST 18%):</span>
                        <span className="font-semibold text-gray-900">₹{calculatedTotals.igst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-600">
                          <span>Central GST (CGST 9%):</span>
                          <span className="font-semibold text-gray-900">₹{calculatedTotals.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>State GST (SGST 9%):</span>
                          <span className="font-semibold text-gray-900">₹{calculatedTotals.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between text-gray-600 pt-1">
                      <span>Transport / Freight Charges:</span>
                      <input
                        type="number"
                        min="0"
                        className="w-28 rounded border border-gray-300 px-2 py-0.5 text-right text-xs font-semibold"
                        value={transportCharges}
                        onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {calculatedTotals.roundOff !== 0 && (
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>Round Off:</span>
                        <span>{calculatedTotals.roundOff > 0 ? `+₹${calculatedTotals.roundOff}` : `-₹${Math.abs(calculatedTotals.roundOff)}`}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-gray-300 pt-2 text-sm font-bold text-gray-900">
                      <span>Grand Total (Payable):</span>
                      <span className="text-amber-900 text-base">₹{calculatedTotals.grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons with Interactive Saved state */}
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || isSaved}
                    className={`inline-flex items-center gap-2 rounded-lg px-6 py-2 text-xs font-bold text-white shadow-xs transition ${
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
                        Saving PO...
                      </>
                    ) : editingId ? (
                      "Update Purchase Order"
                    ) : (
                      "Save Purchase Order"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PURCHASE ORDERS DIRECTORY TABLE                           */}
        {/* ========================================================= */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">Purchase Orders Directory</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                {filteredOrders.length} of {purchaseOrders.length}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                className={`${inputClass} pl-8 py-1.5`}
                placeholder="Search PO#, supplier, material..."
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

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                <FileText className="h-6 w-6" />
              </div>
              <p className="font-medium text-gray-900">No purchase orders found</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {search || statusFilter !== "All"
                  ? "Try adjusting your search keywords or status filter."
                  : "Click 'Create Purchase Order' above to generate your first supplier procurement order."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3.5 font-semibold">PO Number & Date</th>
                    <th className="p-3.5 font-semibold">Supplier / Vendor</th>
                    <th className="p-3.5 font-semibold">Items & Materials</th>
                    <th className="p-3.5 font-semibold text-right">Order Value</th>
                    <th className="p-3.5 font-semibold">Delivery Target</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {filteredOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* PO Number & Date */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-gray-900">{po.poNo}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {po.date}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{po.vendor}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          {po.vendorName && <span>{po.vendorName}</span>}
                          {po.vendorGstin && (
                            <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.2 rounded">
                              {po.vendorGstin}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items Summary */}
                      <td className="p-3.5 max-w-xs">
                        <div className="truncate font-medium text-gray-800">
                          {po.items[0]?.description || "—"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {po.items.length === 1
                            ? `${po.items[0]?.quantity} ${po.items[0]?.unit}`
                            : `${po.items[0]?.quantity} ${po.items[0]?.unit} + ${po.items.length - 1} more line(s)`}
                        </div>
                      </td>

                      {/* Order Value */}
                      <td className="p-3.5 text-right">
                        <div className="font-bold text-gray-900 text-sm">
                          ₹{po.grandTotal.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          GST: ₹{(po.cgst + po.sgst + po.igst).toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Delivery Date */}
                      <td className="p-3.5 text-gray-600">
                        {po.expectedDeliveryDate ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-600" />
                            {po.expectedDeliveryDate}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Standard (7d)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <select
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer ${getStatusBadgeClass(
                            po.status
                          )}`}
                          value={po.status}
                          onChange={(e) => handleQuickStatusChange(po.id, e.target.value as POStatus)}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Ordered">Ordered</option>
                          <option value="Received">Received</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPO(po)}
                            title="Print / View Purchase Order"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(po)}
                            title="Edit Purchase Order"
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPO(po)}
                            title="Delete Purchase Order"
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

        {/* ========================================================= */}
        {/* FORMAL PURCHASE ORDER PRINT / VIEW MODAL                  */}
        {/* ========================================================= */}
        {previewPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100">
              {/* Sticky Top Toolbar for Printing */}
              <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-gray-900 px-6 py-3 text-white">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold">
                    PURCHASE ORDER PREVIEW
                  </span>
                  <span className="text-sm font-semibold text-gray-200">
                    Ref: {previewPO.poNo} — {previewPO.vendor}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewPO(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable PO Sheet */}
              <div className="p-8 space-y-6 text-gray-900 print:p-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b pb-6 gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-amber-900 tracking-tight">
                      PAYAL DECOR
                    </h1>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mt-0.5">
                      Modular Furniture & Interior Manufacturing
                    </p>
                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      <p>Plot 48/B, Timber Market, Near Swargate, Pune - 411042</p>
                      <p>GSTIN: 27AABCP1234F1Z1 | PAN: AABCP1234F</p>
                      <p>Email: purchase@payaldecor.com | Phone: +91 98765 43210</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded-lg bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 tracking-wider">
                      PURCHASE ORDER
                    </span>
                    <div className="mt-3 text-xs space-y-1">
                      <p>
                        <span className="text-gray-500">PO Number:</span>{" "}
                        <strong className="font-mono text-gray-900">{previewPO.poNo}</strong>
                      </p>
                      <p>
                        <span className="text-gray-500">Date:</span>{" "}
                        <strong>{previewPO.date}</strong>
                      </p>
                      <p>
                        <span className="text-gray-500">Delivery By:</span>{" "}
                        <strong>{previewPO.expectedDeliveryDate || "Within 7 Days"}</strong>
                      </p>
                      <p>
                        <span className="text-gray-500">Status:</span>{" "}
                        <strong className="text-amber-800">{previewPO.status}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vendor and Ship To Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      SUPPLIER / VENDOR (ISSUED TO)
                    </span>
                    <p className="font-bold text-sm text-gray-900">{previewPO.vendor}</p>
                    {previewPO.vendorName && <p className="text-gray-700">Attn: {previewPO.vendorName}</p>}
                    {previewPO.vendorAddress && <p className="text-gray-600">{previewPO.vendorAddress}</p>}
                    {previewPO.vendorGstin && (
                      <p className="font-mono font-semibold text-gray-800">
                        GSTIN: {previewPO.vendorGstin}
                      </p>
                    )}
                    {previewPO.vendorPhone && <p className="text-gray-600">Ph: {previewPO.vendorPhone}</p>}
                    {previewPO.vendorEmail && <p className="text-gray-600">{previewPO.vendorEmail}</p>}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      DISPATCH & DELIVERY DESTINATION
                    </span>
                    <p className="font-bold text-sm text-gray-900">Payal Decor Central Works</p>
                    <p className="text-gray-600">{previewPO.deliveryAddress}</p>
                    <p className="text-gray-700 mt-2">
                      <span className="text-gray-400">Payment Terms:</span>{" "}
                      <strong>{previewPO.paymentTerms || "30 Days Credit"}</strong>
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-8">#</th>
                        <th className="p-3">Material & Specification</th>
                        <th className="p-3 w-20">HSN</th>
                        <th className="p-3 text-right w-20">Qty</th>
                        <th className="p-3 w-16">Unit</th>
                        <th className="p-3 text-right w-24">Unit Rate</th>
                        <th className="p-3 text-right w-16">Disc %</th>
                        <th className="p-3 text-right w-16">GST %</th>
                        <th className="p-3 text-right w-28">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewPO.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-3 text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-medium text-gray-900">{item.description}</td>
                          <td className="p-3 font-mono text-gray-600">{item.hsnCode || "—"}</td>
                          <td className="p-3 text-right font-bold text-gray-900">{item.quantity}</td>
                          <td className="p-3 text-gray-600">{item.unit}</td>
                          <td className="p-3 text-right">₹{item.rate.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-500">
                            {item.discountPct ? `${item.discountPct}%` : "—"}
                          </td>
                          <td className="p-3 text-right text-gray-700">{item.gstRate}%</td>
                          <td className="p-3 text-right font-bold text-gray-900">
                            ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Table & Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="text-xs space-y-2">
                    <span className="font-bold text-gray-800 uppercase tracking-wide text-[11px] block">
                      Terms & Conditions:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                      {DEFAULT_TERMS.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    {previewPO.notes && (
                      <div className="mt-3 rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-amber-900 text-xs">
                        <strong>Special Note:</strong> {previewPO.notes}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-bold text-gray-900">₹{previewPO.subtotal.toFixed(2)}</span>
                    </div>

                    {previewPO.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span>-₹{previewPO.discountTotal.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Value:</span>
                      <span className="font-bold text-gray-900">₹{previewPO.taxableTotal.toFixed(2)}</span>
                    </div>

                    {previewPO.igst > 0 ? (
                      <div className="flex justify-between text-gray-600">
                        <span>Integrated GST (IGST):</span>
                        <span className="font-bold text-gray-900">₹{previewPO.igst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-600">
                          <span>Central GST (CGST 9%):</span>
                          <span className="font-bold text-gray-900">₹{previewPO.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>State GST (SGST 9%):</span>
                          <span className="font-bold text-gray-900">₹{previewPO.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {previewPO.transportCharges > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Freight / Transport:</span>
                        <span>₹{previewPO.transportCharges.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-gray-300 pt-2 text-sm font-bold text-gray-900">
                      <span>Grand Total:</span>
                      <span className="text-amber-900 text-base">
                        ₹{previewPO.grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatory Footer */}
                <div className="border-t pt-8 flex items-end justify-between text-xs text-gray-600">
                  <div>
                    <p>Prepared By: Procurement Desk</p>
                    <p className="text-[11px] text-gray-400">System generated via Payal Decor ERP</p>
                  </div>
                  <div className="text-center">
                    <div className="h-12 border-b border-gray-400 w-48 mb-1" />
                    <p className="font-bold text-gray-900">Authorized Signatory</p>
                    <p className="text-[11px] text-gray-400">For Payal Decor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DELETE CONFIRMATION DIALOG                                */}
        {/* ========================================================= */}
        {deleteConfirmPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Purchase Order?</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to remove Purchase Order{" "}
                <span className="font-semibold text-gray-900">"{deleteConfirmPO.poNo}"</span> issued to{" "}
                <span className="font-semibold text-gray-900">"{deleteConfirmPO.vendor}"</span>?
              </p>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPO(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePO}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Purchase;
