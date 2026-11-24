const reportsModel = require("../models/reportsModel");

/**
 * Controller to fetch module-wise or executive reports
 */
async function getReport(req, res) {
  try {
    const { module = "all", timeRange, startDate, endDate } = req.query;
    const filters = { timeRange, startDate, endDate };

    let reportData = null;

    switch (module.toLowerCase().replace(/_/g, "-")) {
      case "purchase":
      case "procurement":
        reportData = await reportsModel.getPurchaseReport(filters);
        break;
      case "vendors":
      case "suppliers":
        reportData = await reportsModel.getVendorsReport(filters);
        break;
      case "quotations":
      case "quotes":
        reportData = await reportsModel.getQuotationsReport(filters);
        break;
      case "estimation":
      case "estimations":
      case "boq":
        reportData = await reportsModel.getEstimationsReport(filters);
        break;
      case "leads":
      case "crm":
        reportData = await reportsModel.getLeadsReport(filters);
        break;
      case "production":
      case "workshop":
        reportData = await reportsModel.getProductionReport(filters);
        break;
      case "operations":
        reportData = await reportsModel.getOperationsReport(filters);
        break;
      case "projects":
        reportData = await reportsModel.getProjectsReport(filters);
        break;
      case "sales-orders":
      case "salesorders":
        reportData = await reportsModel.getSalesOrdersReport(filters);
        break;
      case "work-orders":
      case "workorders":
        reportData = await reportsModel.getWorkOrdersReport(filters);
        break;
      case "inventory":
        reportData = await reportsModel.getInventoryReport(filters);
        break;
      case "dispatch":
        reportData = await reportsModel.getDispatchReport(filters);
        break;
      case "installation":
        reportData = await reportsModel.getInstallationReport(filters);
        break;
      case "invoicing":
        reportData = await reportsModel.getInvoicingReport(filters);
        break;
      case "finance":
      case "financial":
      case "gst":
        reportData = await reportsModel.getFinancialReport(filters);
        break;
      case "payments":
        reportData = reportsModel.getInProgressModuleReport("payments", "Payments");
        break;
      case "accounts":
        reportData = reportsModel.getInProgressModuleReport("accounts", "Accounts");
        break;
      case "bom":
        reportData = reportsModel.getInProgressModuleReport("bom", "BOM & Material Requirement");
        break;
      case "masters":
        reportData = reportsModel.getInProgressModuleReport("masters", "Masters");
        break;
      case "admin":
        reportData = reportsModel.getInProgressModuleReport("admin", "Admin");
        break;
      case "all":
      default:
        reportData = await reportsModel.getExecutiveOverview(filters);
        break;
    }

    return res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error("Error generating business report: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate business report",
      error: error.message
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
    { id: "admin", label: "Admin", category: "Management", icon: "Settings" }
  ];

  return res.status(200).json({
    success: true,
    modules
  });
}

module.exports = {
  getReport,
  getReportModules
};
