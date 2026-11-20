import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  RefreshCw,
  Save,
  Search,
  RotateCcw,
  Eye,
  Trash2,
  FileText,
  CheckCircle2,
  Layers,
  Calculator,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Boxes,
  Ruler,
  Wrench,
  Percent,
  Check,
  Copy,
  Printer,
  Sparkles,
  ArrowUpRight,
  Building2,
  User,
  Filter,
  FileCheck,
} from "lucide-react";

import { AppShell } from "@/components/erp/AppShell";
import { EstimateBuilder } from "@/components/erp/EstimateBuilder";

import { workstationBom } from "@/lib/erp/data";
import {
  areaSqft,
  areaSqm,
  edgeBandRft,
  INR2,
  procurementQty,
  rft,
  round,
  ROUNDING,
  sellingPrice,
  sheetsRequired,
  toMm,
  type LengthUnit,
  type PricingMethod,
} from "@/lib/erp/units";

const API_BASE = (
  import.meta.env["VITE_API_URL"] || "http://localhost:5000/api"
).replace(/\/+$/, "");

const UNITS: LengthUnit[] = ["mm", "cm", "inch", "ft", "m"];

type EdgeKey = "e1" | "e2" | "e3" | "e4";

interface Customer {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  address?: string;
  location?: string;
}

interface Lead {
  id: number;
  customerId?: string | null;
  customerName?: string;
  companyName?: string;
  requirement?: string;
  status?: string;
}

interface SiteVisit {
  id: string;
  visitId: string;
  customerId?: string | null;
  leadEnquiryId?: number | null;
  customerName?: string;
  projectName?: string;
  siteAddress?: string;
  visitDate?: string;
  roomType?: string;
  furnitureType?: string;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  unit?: string;
  status?: string;
}

export interface MaterialMaster {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  rate: number | string;
  defaultWastagePct: number | string;
  hsnCode?: string;
  gstRate?: number | string;
}

export interface BoqLine {
  id?: string;
  lineCategory: string;
  description: string;
  baseQty: number;
  wastagePercent?: number;
  procurementQty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface EstimationItem {
  id?: string;
  itemCode?: string;
  itemName: string;
  description?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  quantity: number;
  unit?: string;
  unitSqft?: number;
  totalSqft?: number;
  wastagePercent?: number;
  procurementSqft?: number;
  edgeBandRft?: number;
  sheetsRequired?: number;
  materialCost?: number;
  hardwareCost?: number;
  labourCost?: number;
  otherCost?: number;
  unitPrimeCost?: number;
  totalPrimeCost?: number;
  unitSellingPrice?: number;
  totalSellingPrice?: number;
  boqLines?: BoqLine[];
}

interface EstimationRecord {
  id: string;
  estimationNumber: string;
  customerId?: string;
  customerName?: string;
  leadEnquiryId?: number | null;
  siteMeasurementId?: string | null;
  projectName?: string | null;
  notes?: string | null;
  totalPrimeCost?: number | string;
  pricingMethod?: string;
  markupPercent?: number;
  marginPercent?: number;
  totalSellingPrice?: number | string;
  sellingPricePerUnit?: number | string;
  taxRate?: number;
  taxAmount?: number;
  grandTotal?: number;
  status?: string;
  placeOfSupply?: string;
  createdAt?: string;
  customer?: Customer;
  leadEnquiry?: Lead;
  siteMeasurement?: SiteVisit;
  itemCount?: number;
  items?: EstimationItem[];
  allBoqLines?: BoqLine[];
}

interface FurniturePreset {
  id: string;
  name: string;
  category: string;
  length: number;
  width: number;
  height: number;
  unit: LengthUnit;
  defaultQty: number;
  defaultWastage: number;
  edges: { e1: boolean; e2: boolean; e3: boolean; e4: boolean };
  description: string;
}

const PRESETS: FurniturePreset[] = [
  {
    id: "workstation-linear",
    name: "Linear Workstation (1200 × 600)",
    category: "Office Desking",
    length: 1200,
    width: 600,
    height: 750,
    unit: "mm",
    defaultQty: 10,
    defaultWastage: 8,
    edges: { e1: true, e2: true, e3: true, e4: false },
    description: "Standard modular workstation top with 3 edges exposed and cable cutout allowance.",
  },
  {
    id: "executive-desk",
    name: "Manager Desk (1500 × 750)",
    category: "Executive Cabin",
    length: 1500,
    width: 750,
    height: 750,
    unit: "mm",
    defaultQty: 2,
    defaultWastage: 8,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "Executive desk with full 4-side 2mm PVC edge banding and privacy modesty panel.",
  },
  {
    id: "l-shape-desk",
    name: "Executive L-Desk (1800 × 1500)",
    category: "Executive Cabin",
    length: 1800,
    width: 1500,
    height: 750,
    unit: "mm",
    defaultQty: 1,
    defaultWastage: 10,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "L-shaped managerial desk with integrated side return runner credenza.",
  },
  {
    id: "screen-partition",
    name: "Acoustic Partition (1200 × 2100)",
    category: "Partition System",
    length: 1200,
    width: 2100,
    height: 60,
    unit: "mm",
    defaultQty: 6,
    defaultWastage: 10,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "Full-height modular divider partition with dual-sided pin-up or prelam tile.",
  },
  {
    id: "privacy-divider",
    name: "Desktop Screen (1200 × 450)",
    category: "Accessories",
    length: 1200,
    width: 450,
    height: 25,
    unit: "mm",
    defaultQty: 10,
    defaultWastage: 5,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "Sandwich glass or fabric-wrapped desk mount acoustic divider.",
  },
  {
    id: "mobile-pedestal",
    name: "Mobile Pedestal 3-Drawer (400 × 450)",
    category: "Storage Units",
    length: 400,
    width: 450,
    height: 650,
    unit: "mm",
    defaultQty: 10,
    defaultWastage: 8,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "Under-desk mobile storage with central locking and telescopic runners.",
  },
  {
    id: "conference-table",
    name: "Conference Table 8-Seater (2400 × 1200)",
    category: "Meeting Room",
    length: 2400,
    width: 1200,
    height: 750,
    unit: "mm",
    defaultQty: 1,
    defaultWastage: 12,
    edges: { e1: true, e2: true, e3: true, e4: true },
    description: "Boat-shaped conference table with central power flipper box channel.",
  },
];

const inputClass =
  "w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-xs">
      <div className="flex h-5 items-center justify-between">
        <span className="font-semibold text-gray-700 truncate">{label}</span>
        {hint && (
          <span className="text-[11px] font-normal text-gray-400 shrink-0 ml-1">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-1.5 text-xs last:border-0">
      <span className="text-gray-500">{label}</span>
      <span
        className={`text-right tabular-nums ${
          accent
            ? "font-bold text-amber-800"
            : strong
            ? "font-semibold text-gray-900"
            : "text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("payal_decor_auth_token")
      : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const urlsToTry = [`${API_BASE}${cleanPath}`, `/api${cleanPath}`];

  let lastError: Error | null = null;

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options?.body ? { "Content-Type": "application/json" } : {}),
          ...authHeaders,
          ...options?.headers,
        },
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

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return INR2.format(Number.isFinite(amount) ? amount : 0);
}

export function Estimation() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"studio" | "registry" | "document">("studio");

  // Master Data from DB
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [estimations, setEstimations] = useState<EstimationRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialMaster[]>([]);

  // Loading States
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingEstimations, setLoadingEstimations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State: Linkages
  const [customerName, setCustomerName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [siteVisitId, setSiteVisitId] = useState("");
  const [estimationNumber, setEstimationNumber] = useState(
    `EST-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");
  const [status, setStatus] = useState("Draft");

  // Form State: Preset & Dimensions
  const [activePreset, setActivePreset] = useState<string>("workstation-linear");
  const [length, setLength] = useState(1200);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(750);
  const [unit, setUnit] = useState<LengthUnit>("mm");
  const [qty, setQty] = useState(10);
  const [wastage, setWastage] = useState(8);
  const [edges, setEdges] = useState<{ e1: boolean; e2: boolean; e3: boolean; e4: boolean }>({
    e1: true,
    e2: true,
    e3: true,
    e4: false,
  });

  // Form State: Material Selection
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedEdgeBandId, setSelectedEdgeBandId] = useState<string>("");
  const [rate, setRate] = useState(1450); // Selling rate / sq.ft
  const [cost, setCost] = useState(980); // Unit prime cost

  // Form State: Costing & Pricing
  const [method, setMethod] = useState<PricingMethod>("markup");
  const [percent, setPercent] = useState(25);

  // Search & Filter in Saved Estimations
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRecord, setSelectedRecord] = useState<EstimationRecord | null>(null);

  // Load Leads
  const loadLeads = useCallback(async () => {
    try {
      const response = await apiRequest<unknown>("/lead-enquiries");
      setLeads(unwrapList<Lead>(response, ["leads", "data"]));
    } catch (err) {
      console.warn("Could not load leads:", err);
    }
  }, []);

  // Load Site Visits
  const loadVisits = useCallback(async () => {
    try {
      const response = await apiRequest<unknown>("/site-measurements");
      setVisits(
        unwrapList<SiteVisit>(response, ["measurements", "siteMeasurements", "data"]),
      );
    } catch (err) {
      console.warn("Could not load site visits:", err);
    }
  }, []);

  // Load Materials Catalog
  const loadMaterials = useCallback(async () => {
    try {
      const response = await apiRequest<{ success: boolean; data: MaterialMaster[] }>(
        "/estimation/materials",
      );
      if (response && Array.isArray(response.data)) {
        setMaterials(response.data);
      }
    } catch (err) {
      console.warn("Could not load materials:", err);
    }
  }, []);

  // Load Estimations
  const loadEstimations = useCallback(async () => {
    setLoadingEstimations(true);
    try {
      const response = await apiRequest<unknown>("/estimations");
      setEstimations(unwrapList<EstimationRecord>(response, ["estimations", "data"]));
    } catch (err) {
      console.error("Could not load estimations:", err);
      setError(
        err instanceof Error
          ? `Saved estimations could not load: ${err.message}`
          : "Saved estimations could not load.",
      );
    } finally {
      setLoadingEstimations(false);
    }
  }, []);

  // Unified Refresh
  const refreshLists = useCallback(async () => {
    setLoadingLists(true);
    setError("");
    try {
      await Promise.allSettled([
        loadLeads(),
        loadVisits(),
        loadMaterials(),
        loadEstimations(),
      ]);
    } finally {
      setLoadingLists(false);
    }
  }, [loadLeads, loadVisits, loadMaterials, loadEstimations]);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  // Handle Preset Selection
  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const p = PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setLength(p.length);
    setWidth(p.width);
    setHeight(p.height);
    setUnit(p.unit);
    setQty(p.defaultQty);
    setWastage(p.defaultWastage);
    setEdges(p.edges);
  };

  // Filtered Leads & Visits
  const filteredLeads = useMemo(() => {
    if (!customerName.trim()) return leads;
    const lower = customerName.toLowerCase();
    const matched = leads.filter((lead) =>
      (lead.customerName || lead.companyName || "").toLowerCase().includes(lower),
    );
    return matched.length > 0 ? matched : leads;
  }, [customerName, leads]);

  const filteredVisits = useMemo(() => {
    if (leadId) {
      const matchLead = visits.filter(
        (visit) =>
          String(visit.leadEnquiryId ?? "") === leadId ||
          String(visit.leadId ?? "") === leadId,
      );
      if (matchLead.length > 0) return matchLead;
    }
    return visits;
  }, [leadId, visits]);

  // Real-time spatial and cost calculations
  const calc = useMemo(() => {
    const L = toMm(length, unit);
    const W = toMm(width, unit);
    const H = toMm(height, unit);

    const unitSqft = areaSqft(L, W);
    const unitSqm = areaSqm(L, W);
    const unitRft = rft(L, W);

    const baseSqft = unitSqft * qty;
    const procSqft = procurementQty(baseSqft, wastage);
    const edgeRft = edgeBandRft(L, W, edges) * qty;

    const safeCost = Math.max(0, cost);
    const safePercent = Math.max(0, percent);
    const sell = sellingPrice(safeCost, safePercent, method);
    const totalSellingPrice = sell * qty;
    const totalPrimeCost = safeCost * qty;
    const profit = sell - safeCost;

    const baseAmount = baseSqft * Math.max(0, rate);

    return {
      L,
      W,
      H,
      unitSqft,
      unitSqm,
      unitRft,
      baseSqft,
      procSqft,
      sheets: sheetsRequired(procSqft, 8, 4),
      sheetsRaw: sheetsRequired(procSqft, 8, 4, false),
      edgeRft,
      amount: baseSqft * Math.max(0, rate),
      sell,
      profit,
      totalSellingPrice,
      totalPrimeCost,
      safeCost,
      safePercent,
      baseAmount,
    };
  }, [length, width, height, unit, qty, wastage, edges, rate, cost, percent, method]);

  // Overall Statistics for KPI Banner
  const stats = useMemo(() => {
    const totalCount = estimations.length;
    const pipelineValue = estimations.reduce(
      (sum, item) => sum + Number(item.totalSellingPrice || 0),
      0,
    );
    const avgMargin =
      totalCount > 0
        ? estimations.reduce(
            (sum, item) => sum + Number(item.markupPercent || item.marginPercent || 25),
            0,
          ) / totalCount
        : 25;
    return {
      totalCount,
      pipelineValue,
      avgMargin: Math.round(avgMargin),
    };
  }, [estimations]);

  // Form Interactions
  function chooseLead(id: string) {
    setLeadId(id);
    const lead = leads.find((item) => String(item.id) === id);
    if (lead) {
      if (lead.customerName || lead.companyName) {
        setCustomerName(lead.customerName || lead.companyName || "");
      }
      if (lead.requirement) {
        setProjectName(lead.requirement);
      }
      // Link to site visit if one exists for this lead
      const linkedVisit = visits.find(
        (v) =>
          String(v.leadEnquiryId ?? "") === id ||
          String(v.leadId ?? "") === id ||
          (v.customerName &&
            lead.customerName &&
            v.customerName.toLowerCase() === lead.customerName.toLowerCase()),
      );
      if (linkedVisit) {
        setSiteVisitId(linkedVisit.id);
        if (linkedVisit.lengthMm != null) {
          setLength(Number(linkedVisit.lengthMm));
          setUnit(linkedVisit.unit === "ft" ? "ft" : "mm");
        }
        if (linkedVisit.widthMm != null) {
          setWidth(Number(linkedVisit.widthMm));
          setUnit(linkedVisit.unit === "ft" ? "ft" : "mm");
        }
        if (linkedVisit.heightMm != null) {
          setHeight(Number(linkedVisit.heightMm));
        }
      }
    }
  }

  function chooseVisit(id: string) {
    setSiteVisitId(id);
    const visit = visits.find((item) => item.id === id);
    if (!visit) return;
    if (visit.customerName) {
      setCustomerName((prev) => prev || visit.customerName || "");
    }
    if (visit.projectName) {
      setProjectName((prev) => prev || visit.projectName || "");
    }
    if (visit.leadEnquiryId || visit.leadId) {
      const lid = String(visit.leadEnquiryId || visit.leadId);
      if (leads.some((l) => String(l.id) === lid)) {
        setLeadId(lid);
      }
    }
    if (visit.lengthMm != null) {
      setLength(Number(visit.lengthMm));
      setUnit(visit.unit === "ft" ? "ft" : "mm");
    }
    if (visit.widthMm != null) {
      setWidth(Number(visit.widthMm));
      setUnit(visit.unit === "ft" ? "ft" : "mm");
    }
    if (visit.heightMm != null) {
      setHeight(Number(visit.heightMm));
    }
  }

  function clearForm() {
    setCustomerName("");
    setLeadId("");
    setSiteVisitId("");
    setEstimationNumber(
      `EST-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
    );
    setProjectName("");
    setNotes("");
    applyPreset("workstation-linear");
    setRate(1450);
    setCost(980);
    setMethod("markup");
    setPercent(25);
    setError("");
    setSuccess("");
    setIsSaved(false);
    setSelectedRecord(null);
  }

  // Clone an estimation into form
  function cloneEstimation(rec: EstimationRecord) {
    setCustomerName(rec.customerName || "");
    setProjectName(rec.projectName ? `${rec.projectName} (Copy)` : "");
    setEstimationNumber(
      `EST-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
    );
    setNotes(rec.notes || "");
    if (rec.pricingMethod === "markup" || rec.pricingMethod === "margin") {
      setMethod(rec.pricingMethod);
    }
    if (rec.markupPercent) setPercent(Number(rec.markupPercent));
    setActiveTab("studio");
    setSuccess(`Cloned details from #${rec.estimationNumber} into studio.`);
  }

  //
  async function submitEstimation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!customerName.trim()) {
      setError("Please enter Customer / Client Name.");
      return;
    }

    if (length <= 0 || width <= 0 || qty <= 0) {
      setError("Length, width and quantity must be greater than zero.");
      return;
    }

    const visit = visits.find((item) => item.id === siteVisitId);
    const presetObj = PRESETS.find((p) => p.id === activePreset);

    setSaving(true);
    setIsSaved(false);

    try {
      const payload = {
        estimationNumber: estimationNumber.trim(),
        customerId: null,
        leadEnquiryId: leadId ? Number(leadId) : null,
        siteMeasurementId: siteVisitId || null,
        customerName: customerName.trim(),
        projectName: projectName.trim() || visit?.projectName || "Modular Interior Project",
        notes: notes.trim() || null,
        pricingMethod: method,
        markupPercent: percent,
        marginPercent: percent,
        placeOfSupply,
        taxRate: 18,
        items: [
          {
            itemCode: `WS-${Date.now().toString().slice(-4)}`,
            itemName: projectName
              ? `${projectName} - ${presetObj?.name || "Modular Panel"}`
              : presetObj?.name || "Modular Assembly",
            description: `Size: ${Math.round(calc.L)} x ${Math.round(calc.W)} x ${Math.round(calc.H)} mm | Qty: ${qty} Nos | Wastage: ${wastage}%`,
            lengthMm: calc.L,
            widthMm: calc.W,
            heightMm: calc.H,
            quantity: qty,
            unit: "Nos",
            unitSqft: calc.unitSqft,
            totalSqft: calc.baseSqft,
            wastagePercent: wastage,
            procurementSqft: calc.procSqft,
            edgeBandRft: calc.edgeRft,
            sheetsRequired: calc.sheets,
            edges,
            unitPrimeCost: cost,
            totalPrimeCost: calc.totalPrimeCost,
            unitSellingPrice: calc.sell,
            totalSellingPrice: calc.totalSellingPrice,
          },
        ],
      };

      await apiRequest("/estimations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsSaved(true);
      setSuccess(
        `Estimation #${estimationNumber} and exploded BOQ saved directly to PostgreSQL!`,
      );
      setEstimationNumber(
        `EST-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
      );

      await loadEstimations();

      setTimeout(() => {
        setIsSaved(false);
      }, 2500);
    } catch (err) {
      setIsSaved(false);
      setError(
        err instanceof Error
          ? `Estimation could not be saved: ${err.message}`
          : "Estimation could not be saved to database.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete Estimation
  async function deleteEstimation(id: string, estNum: string) {
    if (
      !window.confirm(
        `Are you sure you want to delete estimation "${estNum}"? This will permanently remove its BOQ lines from the PostgreSQL database.`,
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/estimations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setSuccess(`Estimation "${estNum}" deleted successfully from PostgreSQL.`);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      await loadEstimations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete estimation.");
    }
  }

  // Open Full BOQ Modal
  async function openRecordDetails(record: EstimationRecord) {
    try {
      const full = await apiRequest<{ success: boolean; estimation: EstimationRecord }>(
        `/estimations/${encodeURIComponent(record.id)}`,
      );
      setSelectedRecord(full.estimation || record);
    } catch {
      setSelectedRecord(record);
    }
  }

  // Convert to Formal Quotation
  async function convertToQuotation(id: string) {
    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        quotation: { quotationNo?: string };
      }>(`/estimations/${encodeURIComponent(id)}/convert-to-quotation`, {
        method: "POST",
      });
      setSuccess(
        `Quotation draft #${res.quotation?.quotationNo || "created"} prepared successfully! You can view it in the Quotations module.`,
      );
      await loadEstimations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to convert estimation to quotation.",
      );
    }
  }

  // Copy Estimation No
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Estimations
  const filteredEstimations = useMemo(() => {
    let list = estimations;
    if (statusFilter !== "ALL") {
      list = list.filter(
        (item) => (item.status || "Draft").toUpperCase() === statusFilter.toUpperCase(),
      );
    }
    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((item) =>
      [
        item.estimationNumber,
        item.customerName,
        item.customer?.name,
        item.projectName,
        item.status,
      ].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [estimations, search, statusFilter]);

  return (
    <AppShell title="Estimation & BOQ">
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* ========================================================================= */}
        {/* 1. EXECUTIVE HEADER & CONTROLS */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                  Estimation & BOQ Engine
                </h1>
                <p className="text-xs text-gray-500">
                  Precision spatial calculations, wastage optimization, dynamic BOQ explosion, and live PostgreSQL sync.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshLists()}
              disabled={loadingLists}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-60 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingLists ? "animate-spin text-amber-600" : ""}`} />
              Sync Database
            </button>

            {/* Segmented Mode Selector */}
            <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("studio")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                  activeTab === "studio"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Ruler className="h-3.5 w-3.5 text-amber-600" />
                Estimation Studio
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("registry")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                  activeTab === "registry"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Saved Estimations ({estimations.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("document")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                  activeTab === "document"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                Estimate Print Builder
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. EXECUTIVE KPI SUMMARY RIBBON */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-xs transition-hover hover:border-gray-300">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Estimations</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{stats.totalCount}</p>
            <p className="text-[11px] text-gray-500">Stored in PostgreSQL</p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-xs transition-hover hover:border-gray-300">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline Value</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{money(stats.pipelineValue)}</p>
            <p className="text-[11px] text-gray-500">Total selling quotation value</p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-xs transition-hover hover:border-gray-300">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Target Margin</span>
              <Percent className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700">{stats.avgMargin}%</p>
            <p className="text-[11px] text-gray-500">Average markup across items</p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-xs transition-hover hover:border-gray-300">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Master Materials</span>
              <Boxes className="h-4 w-4 text-purple-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-purple-700">{materials.length || 22}</p>
            <p className="text-[11px] text-gray-500">Seeded in materials_master</p>
          </div>
        </div>

        {/* Global Alert Banners */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800 animate-in fade-in">
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
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-800 animate-in fade-in">
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

        {/* ========================================================================= */}
        {/* TAB 1: ESTIMATION & BOQ STUDIO */}
        {/* ========================================================================= */}
        {activeTab === "studio" && (
          <form onSubmit={submitEstimation} className="space-y-6">
            {/* SECTION 1: CRM LINKAGE & PROJECT CONTEXT */}
            <section className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
              <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">Client & Project Details</h2>
                </div>
                <span className="text-xs text-gray-500">Client, project name & optional lead linkages</span>
              </header>

              <div className="p-5 space-y-4">
                {/* ROW 1: Client & Project Details (4 fields perfectly aligned on the same horizontal row) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                  <Field label="Customer / Client Name *" hint="Client or company">
                    <input
                      required
                      className={inputClass}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Wipro Limited / Vijay Patil"
                    />
                  </Field>

                  <Field label="Project / Site Name" hint="Site or project location">
                    <input
                      className={inputClass}
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Pune Tech Park 4th Floor"
                    />
                  </Field>

                  <Field label="Lead Enquiry (Optional)" hint={`${leads.length} available`}>
                    <select
                      className={inputClass}
                      value={leadId}
                      onChange={(event) => chooseLead(event.target.value)}
                    >
                      <option value="">-- None / Direct Enquiry --</option>
                      {leads.map((l) => (
                        <option key={l.id} value={String(l.id)}>
                          #{l.id} — {l.customerName || l.companyName || "Lead"} {l.requirement ? `(${l.requirement})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Site Measurement (Optional)" hint={`${visits.length} available`}>
                    <select
                      className={inputClass}
                      value={siteVisitId}
                      onChange={(event) => chooseVisit(event.target.value)}
                    >
                      <option value="">-- None / Standard Sizing --</option>
                      {visits.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.visitId} — {v.customerName ? `${v.customerName}: ` : ""}{v.projectName || v.roomType || "Site Visit"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* ROW 2: Estimation & Commercial Parameters (4 fields perfectly aligned on the same horizontal row) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                  <Field label="Estimation Number *" hint="Auto-generated">
                    <div className="relative">
                      <input
                        required
                        className={`${inputClass} pr-10 font-semibold text-amber-800`}
                        value={estimationNumber}
                        onChange={(e) => setEstimationNumber(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEstimationNumber(
                            `EST-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
                          )
                        }
                        title="Generate new number"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </Field>

                  <Field label="Place of Supply" hint="GST tax state">
                    <select
                      className={inputClass}
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                    >
                      <option value="27-Maharashtra">27 - Maharashtra (Local CGST + SGST)</option>
                      <option value="29-Karnataka">29 - Karnataka (IGST)</option>
                      <option value="24-Gujarat">24 - Gujarat (IGST)</option>
                      <option value="36-Telangana">36 - Telangana (IGST)</option>
                      <option value="07-Delhi">07 - Delhi (IGST)</option>
                    </select>
                  </Field>

                  <Field label="Estimation Status" hint="Workflow status">
                    <select
                      className={inputClass}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Draft">Draft (Internal Working)</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Client Approved</option>
                    </select>
                  </Field>

                  <Field label="Notes / Specifications" hint="Specifications">
                    <input
                      className={inputClass}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. 25mm top with wire grommet"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* SECTION 2: FURNITURE ASSEMBLY PRESETS & 2D EDGE BANDING VISUALIZER */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Presets and Dimension Configuration (7 cols) */}
              <section className="lg:col-span-7 rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                        2
                      </span>
                      <h2 className="text-sm font-bold text-gray-900">Assembly Presets & Dimensions</h2>
                    </div>
                    <span className="text-xs text-gray-400">Quick modular templates</span>
                  </header>

                  <div className="p-5 space-y-4">
                    {/* Preset Buttons Grid */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Select Modular Product Preset
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {PRESETS.map((p) => {
                          const isActive = activePreset === p.id;
                          return (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => applyPreset(p.id)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                isActive
                                  ? "border-amber-600 bg-amber-50/70 shadow-xs"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                              }`}
                            >
                              <div className="flex w-full items-center justify-between">
                                <span className={`text-xs font-bold ${isActive ? "text-amber-900" : "text-gray-800"}`}>
                                  {p.name.split("(")[0]}
                                </span>
                                {isActive && <Check className="h-3.5 w-3.5 text-amber-600" />}
                              </div>
                              <span className="text-[11px] text-gray-500 mt-0.5">
                                {p.length} × {p.width} mm
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Numeric Dimension Inputs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                      <Field label="Length">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={length}
                          onChange={(e) => setLength(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Width">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={width}
                          onChange={(e) => setWidth(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Height / Depth">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={height}
                          onChange={(e) => setHeight(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Measurement Unit">
                        <select
                          className={inputClass}
                          value={unit}
                          onChange={(e) => setUnit(e.target.value as LengthUnit)}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Quantity (Nos)">
                        <input
                          type="number"
                          min="1"
                          className={inputClass}
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Wastage %" hint="Factory allowance">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className={inputClass}
                          value={wastage}
                          onChange={(e) => setWastage(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Selling Rate/SqFt (₹)">
                        <input
                          type="number"
                          min="0"
                          className={inputClass}
                          value={rate}
                          onChange={(e) => setRate(Number(e.target.value))}
                        />
                      </Field>

                      <Field label="Prime Cost/Unit (₹)">
                        <input
                          type="number"
                          min="0"
                          className={inputClass}
                          value={cost}
                          onChange={(e) => setCost(Number(e.target.value))}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50/40 p-4">
                  <p className="text-[11px] text-gray-500">
                    💡 Tip: Measurements are automatically converted to master millimeters (mm) for standard sheet cutting and edge banding calculations.
                  </p>
                </div>
              </section>

              {/* Interactive 2D Visualizer & Edge Banding (5 cols) */}
              <section className="lg:col-span-5 rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                        3
                      </span>
                      <h2 className="text-sm font-bold text-gray-900">Interactive 2D Panel Edge Banding</h2>
                    </div>
                    <span className="text-xs text-amber-700 font-semibold">
                      {round(calc.edgeRft, 1)} RFT Total
                    </span>
                  </header>

                  <div className="p-5 flex flex-col items-center">
                    <p className="text-xs text-gray-500 text-center mb-4">
                      Click any edge on the panel below or toggle checkboxes to apply PVC edge banding.
                    </p>

                    {/* 2D Panel Visualizer SVG */}
                    <div className="relative w-full max-w-[280px] h-[190px] flex items-center justify-center bg-gray-50/80 border border-dashed border-gray-300 rounded-xl p-3">
                      {/* Edge 1 (Top) Button */}
                      <button
                        type="button"
                        onClick={() => setEdges((prev) => ({ ...prev, e1: !prev.e1 }))}
                        className={`absolute top-2 inset-x-8 h-4 rounded transition-all text-[10px] font-bold flex items-center justify-center ${
                          edges.e1
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Edge 1 (Top: {Math.round(calc.L)}mm)
                      </button>

                      {/* Edge 4 (Left) Button */}
                      <button
                        type="button"
                        onClick={() => setEdges((prev) => ({ ...prev, e4: !prev.e4 }))}
                        className={`absolute left-2 inset-y-8 w-4 rounded transition-all text-[9px] font-bold flex items-center justify-center [writing-mode:vertical-lr] ${
                          edges.e4
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Edge 4 ({Math.round(calc.W)}mm)
                      </button>

                      {/* Central Wood Panel Representation */}
                      <div className="w-[180px] h-[100px] rounded-lg bg-amber-100/70 border-2 border-amber-300/80 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                        <span className="text-[11px] font-bold text-amber-900">
                          {Math.round(calc.L)} × {Math.round(calc.W)} mm
                        </span>
                        <span className="text-[10px] text-amber-800">
                          {round(calc.unitSqft, 2)} Sq.Ft / Unit
                        </span>
                        <span className="text-[9px] font-semibold text-gray-500 mt-1">
                          {qty} Unit{qty > 1 ? "s" : ""} = {round(calc.baseSqft, 1)} Sq.Ft
                        </span>
                      </div>

                      {/* Edge 2 (Right) Button */}
                      <button
                        type="button"
                        onClick={() => setEdges((prev) => ({ ...prev, e2: !prev.e2 }))}
                        className={`absolute right-2 inset-y-8 w-4 rounded transition-all text-[9px] font-bold flex items-center justify-center [writing-mode:vertical-lr] ${
                          edges.e2
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Edge 2 ({Math.round(calc.W)}mm)
                      </button>

                      {/* Edge 3 (Bottom) Button */}
                      <button
                        type="button"
                        onClick={() => setEdges((prev) => ({ ...prev, e3: !prev.e3 }))}
                        className={`absolute bottom-2 inset-x-8 h-4 rounded transition-all text-[10px] font-bold flex items-center justify-center ${
                          edges.e3
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Edge 3 (Bottom: {Math.round(calc.L)}mm)
                      </button>
                    </div>

                    {/* Edge Checkboxes */}
                    <div className="grid grid-cols-2 gap-2 w-full mt-4">
                      {(["e1", "e2", "e3", "e4"] as EdgeKey[]).map((key, index) => (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-all ${
                            edges[key]
                              ? "border-amber-500/60 bg-amber-50/70 text-amber-900 font-semibold"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>Edge {index + 1} ({index % 2 === 0 ? `${Math.round(calc.L)}mm` : `${Math.round(calc.W)}mm`})</span>
                          <input
                            type="checkbox"
                            checked={edges[key]}
                            onChange={(e) =>
                              setEdges((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50/60 p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Perimeter RFT per unit:</span>
                  <span className="font-bold text-gray-800">
                    {round(edgeBandRft(calc.L, calc.W, edges), 2)} RFT
                  </span>
                </div>
              </section>
            </div>

            {/* SECTION 3: DERIVED METRICS, PRICING & BOQ PREVIEW */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Derived Quantities (4 cols) */}
              <section className="lg:col-span-4 rounded-2xl border border-gray-200/80 bg-white shadow-xs p-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                    4
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">Spatial Requirements</h3>
                </div>

                <div className="space-y-1">
                  <Row label="Master Length" value={`${round(calc.L, 0)} mm`} />
                  <Row label="Master Width" value={`${round(calc.W, 0)} mm`} />
                  <Row label="Unit Area (sq.ft)" value={`${round(calc.unitSqft, 2)} sq.ft`} />
                  <Row label="Unit Area (metric)" value={`${round(calc.unitSqm, 2)} sq.m`} />
                  <Row label="Total Base Area" value={`${round(calc.baseSqft, 2)} sq.ft`} />
                  <Row label={`Wastage @ ${wastage}%`} value={`+ ${round(calc.procSqft - calc.baseSqft, 2)} sq.ft`} />
                  <Row label="Procurement Area" value={`${round(calc.procSqft, 2)} sq.ft`} strong accent />
                  <Row
                    label="8ft × 4ft (32 sqft) Sheets"
                    value={`${round(calc.sheetsRaw, 2)} → ${calc.sheets} Full Sheets`}
                    strong
                    accent
                  />
                  <Row label="PVC Edge Band Total" value={`${round(calc.edgeRft, 1)} RFT`} strong />
                  <Row label="Base Board Amount" value={money(calc.baseAmount)} />
                </div>
              </section>

              {/* Costing & Profit Simulator (4 cols) */}
              <section className="lg:col-span-4 rounded-2xl border border-gray-200/80 bg-white shadow-xs p-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                    5
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">Costing — Markup vs Margin</h3>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Prime Cost (₹)">
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={cost}
                        onChange={(e) => setCost(Number(e.target.value))}
                      />
                    </Field>

                    <Field label="Profit %">
                      <input
                        type="number"
                        min="0"
                        max="99.9"
                        className={inputClass}
                        value={percent}
                        onChange={(e) => setPercent(Number(e.target.value))}
                      />
                    </Field>
                  </div>

                  <Field label="Pricing Formula">
                    <select
                      className={inputClass}
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PricingMethod)}
                    >
                      <option value="markup">Markup: Prime Cost × (1 + %)</option>
                      <option value="margin">Margin: Prime Cost ÷ (1 − %)</option>
                    </select>
                  </Field>

                  {/* Margin Health Pill */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Margin Health:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          percent >= 25
                            ? "bg-emerald-100 text-emerald-800"
                            : percent >= 15
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {percent >= 25 ? "Healthy Margin" : percent >= 15 ? "Standard" : "Tight Margin"}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <Row label="Selling / Unit" value={money(calc.sell)} strong />
                      <Row label="Gross Profit / Unit" value={money(calc.profit)} />
                      <Row label="Total Selling Price" value={money(calc.totalSellingPrice)} strong accent />
                      <Row
                        label="Est. 18% GST"
                        value={money(calc.totalSellingPrice * 0.18)}
                      />
                      <Row
                        label="Grand Total (Inc. GST)"
                        value={money(calc.totalSellingPrice * 1.18)}
                        strong
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Exploded BOQ Live Preview (4 cols) */}
              <section className="lg:col-span-4 rounded-2xl border border-gray-200/80 bg-white shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-800 text-xs font-bold">
                      6
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">Exploded BOQ Breakdown</h3>
                  </div>

                  {/* BOQ Mini Table */}
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
                      <div className="flex justify-between font-semibold text-amber-900">
                        <span>🪵 Sheet Material</span>
                        <span>{calc.sheets} Sheets</span>
                      </div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {round(calc.procSqft, 1)} Sq.Ft with {wastage}% wastage
                      </p>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
                      <div className="flex justify-between font-semibold text-purple-900">
                        <span>📏 PVC Edge Banding</span>
                        <span>{round(calc.edgeRft, 1)} RFT</span>
                      </div>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        2mm / 0.8mm PVC tape for {qty} workstation tops
                      </p>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                      <div className="flex justify-between font-semibold text-blue-900">
                        <span>🔩 Hardware & Metal Legs</span>
                        <span>{qty * 2} Loop Legs</span>
                      </div>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Loop legs, cable trays, wire grommets, minifix
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5">
                      <div className="flex justify-between font-semibold text-rose-900">
                        <span>🛠️ Labour & Processing</span>
                        <span>Sizing & Assembly</span>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        CNC edge banding, panel sizing, factory fitting
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Action Bar */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
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
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        {saving ? "Saving to Database..." : "Save Estimation & BOQ"}
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SAVED ESTIMATIONS */}
        {/* ========================================================================= */}
        {activeTab === "registry" && (
          <section className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
            <header className="border-b border-gray-100 bg-gray-50/70 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  PostgreSQL Estimations & BOQ Registry
                </h2>
                <p className="text-xs text-gray-500">
                  Live records fetched from Express backend /api/estimations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
                  {["ALL", "DRAFT", "APPROVED"].map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        statusFilter === st
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
                    placeholder="Search by ref, customer, project..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void loadEstimations()}
                  disabled={loadingEstimations}
                  title="Reload from database"
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingEstimations ? "animate-spin text-amber-600" : ""}`} />
                </button>
              </div>
            </header>

            {loadingEstimations ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
                Querying PostgreSQL database...
              </div>
            ) : filteredEstimations.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                No saved estimations match your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Ref Number</th>
                      <th className="p-3.5">Customer & Project</th>
                      <th className="p-3.5 text-right">Prime Cost</th>
                      <th className="p-3.5 text-right">Selling Price</th>
                      <th className="p-3.5 text-center">Margin %</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEstimations.map((item) => {
                      const custName =
                        item.customerName ||
                        item.customer?.name ||
                        "Valued Customer";

                      const isApproved = (item.status || "").toLowerCase() === "approved";

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition-all">
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-800">{item.estimationNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.estimationNumber)}
                                title="Copy Ref Number"
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {copiedId === item.estimationNumber ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-gray-400">ID: {item.id.slice(0, 10)}...</span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-gray-900">{custName}</div>
                            <div className="text-[11px] text-gray-500">{item.projectName || "General Interior"}</div>
                          </td>

                          <td className="p-3.5 text-right font-medium text-gray-600 tabular-nums">
                            {money(item.totalPrimeCost)}
                          </td>

                          <td className="p-3.5 text-right font-bold text-emerald-700 tabular-nums text-sm">
                            {money(item.totalSellingPrice)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-800 border border-amber-200">
                              {item.markupPercent || item.marginPercent || 25}%
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {item.status || "Draft"}
                            </span>
                          </td>

                          <td className="p-3.5 text-gray-500 text-[11px]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void openRecordDetails(item)}
                                title="View full exploded BOQ"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View BOQ
                              </button>

                              <button
                                type="button"
                                onClick={() => cloneEstimation(item)}
                                title="Duplicate to Studio"
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100 transition-all"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => void deleteEstimation(item.id, item.estimationNumber)}
                                title="Delete from database"
                                className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 transition-all"
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
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FORMAL ESTIMATE DOCUMENT BUILDER */}
        {/* ========================================================================= */}
        {activeTab === "document" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center justify-between">
              <span>
                📄 <strong>Formal Estimate Document Builder:</strong> Generates client-facing formal PDF / Print quotations with terms, bank details, and signature blocks.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("studio")}
                className="text-xs font-semibold text-emerald-800 underline"
              >
                Back to Estimation Studio
              </button>
            </div>

            <EstimateBuilder
              customer={customerName ? { id: "", name: customerName } : undefined}
              projectName={projectName}
              panel={{
                sizes: `${Math.round(calc.L)} X ${Math.round(calc.W)}`,
                qty,
                price: calc.sell,
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE FULL EXPLODED BOQ MODAL */}
        {/* ========================================================================= */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="mb-5 flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shadow-xs">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Exploded Bill of Quantities (BOQ)
                    </h2>
                    <p className="text-xs text-gray-500">
                      Ref: <span className="font-bold text-amber-800">{selectedRecord.estimationNumber}</span> · Status:{" "}
                      <span className="font-semibold text-emerald-700">{selectedRecord.status || "Draft"}</span> · Supply:{" "}
                      <span className="font-semibold text-gray-700">{selectedRecord.placeOfSupply || "27-Maharashtra"}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Customer</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 truncate">
                    {selectedRecord.customerName || selectedRecord.customer?.name || "Valued Customer"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Project</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 truncate">
                    {selectedRecord.projectName || "Modular Interior"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Prime Factory Cost</p>
                  <p className="mt-1 text-sm font-bold text-gray-700">
                    {money(selectedRecord.totalPrimeCost)}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">Selling Price</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {money(selectedRecord.totalSellingPrice)}
                  </p>
                </div>
              </div>

              {/* Exploded BOQ Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Exploded Material & Labour Components
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {selectedRecord.allBoqLines?.length || 0} Line Items
                  </span>
                </div>

                {selectedRecord.allBoqLines && selectedRecord.allBoqLines.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100/80 text-gray-700 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Component Specification</th>
                          <th className="p-2.5 text-right">Procurement Qty</th>
                          <th className="p-2.5">Unit</th>
                          <th className="p-2.5 text-right">Rate (₹)</th>
                          <th className="p-2.5 text-right">Total Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRecord.allBoqLines.map((line, idx) => (
                          <tr key={line.id || idx} className="hover:bg-gray-50/80">
                            <td className="p-2.5">
                              <span
                                className={`inline-block rounded px-2 py-0.5 font-bold text-[10px] ${
                                  line.lineCategory === "Sheet Material"
                                    ? "bg-amber-100 text-amber-800"
                                    : line.lineCategory === "Edge Band"
                                    ? "bg-purple-100 text-purple-800"
                                    : line.lineCategory === "Hardware"
                                    ? "bg-blue-100 text-blue-800"
                                    : line.lineCategory === "Labour"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                {line.lineCategory}
                              </span>
                            </td>
                            <td className="p-2.5 font-medium text-gray-900">{line.description}</td>
                            <td className="p-2.5 text-right font-bold tabular-nums">
                              {line.procurementQty || line.baseQty}
                            </td>
                            <td className="p-2.5 text-gray-500">{line.unit}</td>
                            <td className="p-2.5 text-right tabular-nums text-gray-600">
                              ₹ {Number(line.unitCost).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold tabular-nums text-gray-900">
                              ₹ {Number(line.totalCost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic p-4 bg-gray-50 rounded-xl text-center">
                    Standard assembly specifications saved with estimation.
                  </p>
                )}
              </div>

              {/* Modal Footer with Actions */}
              <div className="mt-6 border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>
                    Tax: <span className="font-semibold text-gray-700">18% GST (CGST 9% + SGST 9%)</span>
                  </p>
                  <p>
                    Estimated Grand Total:{" "}
                    <span className="font-bold text-gray-900">
                      {money(Number(selectedRecord.totalSellingPrice || 0) * 1.18)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void convertToQuotation(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Convert to Formal Quotation
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Estimation;
