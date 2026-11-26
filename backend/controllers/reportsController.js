const reportsModel = require("../models/reportsModel");

// In-Memory High-Performance TTL Cache
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL
const reportCache = new Map();

/**
 * Generates deterministic cache key based on query filters
 */
function getCacheKey(module, filters = {}) {
  const { timeRange = "all", startDate = "", endDate = "" } = filters;
  return `${module}:${timeRange}:${startDate}:${endDate}`;
}

/**
 * Retrieves valid cached report data if not expired
 */
function getFromCache(key) {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    reportCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Stores report data with TTL and basic LRU eviction
 */
function setInCache(key, data, ttl = CACHE_TTL_MS) {
  if (reportCache.size > 150) {
    const oldestKey = reportCache.keys().next().value;
    reportCache.delete(oldestKey);
  }
  reportCache.set(key, { data, expiry: Date.now() + ttl });
}

/**
 * Clears report cache (all or by module prefix)
 */
function clearReportCache(modulePrefix) {
  if (!modulePrefix) {
    reportCache.clear();
    return;
  }
  for (const key of reportCache.keys()) {
    if (key.startsWith(modulePrefix)) {
      reportCache.delete(key);
    }
  }
}

/**
 * Strategy Dispatch Table for O(1) Module Resolution
 */
const REPORT_DISPATCH = {
  // Live business module handlers
  "all": (filters) => reportsModel.getExecutiveOverview(filters),
  "purchase": (filters) => reportsModel.getPurchaseReport(filters),
  "procurement": (filters) => reportsModel.getPurchaseReport(filters),
  "vendors": (filters) => reportsModel.getVendorsReport(filters),
  "suppliers": (filters) => reportsModel.getVendorsReport(filters),
  "quotations": (filters) => reportsModel.getQuotationsReport(filters),
  "quotes": (filters) => reportsModel.getQuotationsReport(filters),
  "estimation": (filters) => reportsModel.getEstimationsReport(filters),
  "estimations": (filters) => reportsModel.getEstimationsReport(filters),
  "boq": (filters) => reportsModel.getEstimationsReport(filters),
  "crm": (filters) => reportsModel.getLeadsReport(filters),
  "leads": (filters) => reportsModel.getLeadsReport(filters),
  "production": (filters) => reportsModel.getProductionReport(filters),
  "workshop": (filters) => reportsModel.getProductionReport(filters),
  "operations": (filters) => reportsModel.getOperationsReport(filters),
  "projects": (filters) => reportsModel.getProjectsReport(filters),
  "sales-orders": (filters) => reportsModel.getSalesOrdersReport(filters),
  "salesorders": (filters) => reportsModel.getSalesOrdersReport(filters),
  "work-orders": (filters) => reportsModel.getWorkOrdersReport(filters),
  "workorders": (filters) => reportsModel.getWorkOrdersReport(filters),
  "inventory": (filters) => reportsModel.getInventoryReport(filters),
  "dispatch": (filters) => reportsModel.getDispatchReport(filters),
  "installation": (filters) => reportsModel.getInstallationReport(filters),
  "invoicing": (filters) => reportsModel.getInvoicingReport(filters),
  "finance": (filters) => reportsModel.getFinancialReport(filters),
  "financial": (filters) => reportsModel.getFinancialReport(filters),
  "gst": (filters) => reportsModel.getFinancialReport(filters),

  // Fast-path in-progress modules (immediate return, zero DB overhead)
  "payments": () => reportsModel.getInProgressModuleReport("payments", "Payments"),
  "accounts": () => reportsModel.getInProgressModuleReport("accounts", "Accounts"),
  "bom": () => reportsModel.getInProgressModuleReport("bom", "BOM & Material Requirement"),
  "masters": (filters) => reportsModel.getMastersReport(filters),
  "admin": () => reportsModel.getInProgressModuleReport("admin", "Admin"),
};

/**
 * Controller to fetch module-wise or executive reports 
 */
async function getReport(req, res) {
  const startTime = Date.now();
  try {
    const { module = "all", timeRange, startDate, endDate, refresh } = req.query;
    const normalizedModule = String(module).toLowerCase().trim().replace(/_/g, "-");
    const filters = { timeRange, startDate, endDate };
    const cacheKey = getCacheKey(normalizedModule, filters);

    // Fast-path cache lookup unless explicitly refreshed or no-cache requested
    const isRefresh = refresh === "true" || req.headers["cache-control"] === "no-cache";
    if (!isRefresh) {
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Response-Time", `${Date.now() - startTime}ms`);
        res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
        return res.status(200).json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }
    }

    // Resolve handler from dispatch registry
    const handler = REPORT_DISPATCH[normalizedModule] || REPORT_DISPATCH["all"];
    const reportData = await handler(filters);

    // Store in cache for subsequent requests
    setInCache(cacheKey, reportData);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Response-Time", `${Date.now() - startTime}ms`);
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");

    return res.status(200).json({
      success: true,
      data: reportData,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating business report: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate business report",
      error: error.message,
    });
  }
}

/**
 * Controller to list available report modules for frontend configuration
 */
function getReportModules(req, res) {
  const modules = [
    { id: "all", label: "Executive Overview (All Business)", category: "General", icon: "LayoutDashboard" },
    { id: "operations", label: "Operations", category: "Operations", icon: "CheckSquare" },
    { id: "crm", label: "CRM", category: "Sales", icon: "Users" },
    { id: "projects", label: "Projects", category: "Operations", icon: "FolderKanban" },
    { id: "estimation", label: "Estimation & BOQ", category: "Sales", icon: "Calculator" },
    { id: "quotations", label: "Quotations", category: "Sales", icon: "FileText" },
    { id: "sales-orders", label: "Sales Orders", category: "Sales", icon: "ShoppingCart" },
    { id: "work-orders", label: "Work Orders", category: "Manufacturing", icon: "ClipboardList" },
    { id: "production", label: "Production", category: "Manufacturing", icon: "Factory" },
    { id: "inventory", label: "Inventory", category: "Operations", icon: "Boxes" },
    { id: "purchase", label: "Purchase", category: "Operations", icon: "ShoppingBag" },
    { id: "vendors", label: "Vendors", category: "Operations", icon: "Truck" },
    { id: "dispatch", label: "Dispatch & Delivery", category: "Logistics", icon: "Truck" },
    { id: "installation", label: "Installation", category: "Services", icon: "Wrench" },
    { id: "invoicing", label: "Invoicing", category: "Finance", icon: "ReceiptIndianRupee" },
    { id: "payments", label: "Payments", category: "Finance", icon: "Wallet" },
    { id: "accounts", label: "Accounts", category: "Finance", icon: "BookOpen" },
    { id: "masters", label: "Masters", category: "Configuration", icon: "Boxes" },
    { id: "admin", label: "Admin", category: "Management", icon: "Settings" },
  ];

  res.setHeader("Cache-Control", "public, max-age=300"); // 5 minutes cache for static module list
  return res.status(200).json({
    success: true,
    modules,
  });
}

module.exports = {
  getReport,
  getReportModules,
  clearReportCache,
};
