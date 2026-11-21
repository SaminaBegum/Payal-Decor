require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");
const estimationService = require("../services/estimationService");

async function seedInitialEstimations() {
  const materials = await estimationService.getAllMaterials();

  const est1 = {
    estimationNumber: "EST-25-26-0001",
    customerId: "5770e8f8-679b-4650-a8cc-69763b3cfd32",
    customerName: "Vijay Patil (Wipro)",
    projectName: "Hinjewadi Office - 4-Seater Linear Workstations",
    estimationDate: new Date().toISOString().slice(0, 10),
    pricingMethod: "markup",
    markupPercent: 25,
    status: "Draft",
    notes: "25mm Pre-Lam Particle Board with MS loop legs and soft close fittings",
    placeOfSupply: "27-Maharashtra",
    items: [
      {
        itemCode: "WS-LIN-4S",
        itemName: "4-Seater Linear Workstation Cluster (1200x600)",
        description: "Includes 25mm table tops, 18mm modesty panels, 2mm edge banding, wire raceway & grommets",
        lengthMm: 1200,
        widthMm: 600,
        heightMm: 750,
        quantity: 4,
        unit: "Nos",
        wastagePercent: 10,
        edges: { e1: true, e2: true, e3: true, e4: false },
      },
    ],
  };

  const est2 = {
    estimationNumber: "EST-25-26-0002",
    customerId: "87c350e4-1c47-485c-8103-aa116c011e07",
    customerName: "Pallavi Patil (Microsoft)",
    projectName: "Magarpatta City - Executive Cabin Storage & Desk",
    estimationDate: new Date().toISOString().slice(0, 10),
    pricingMethod: "markup",
    markupPercent: 30,
    status: "Approved",
    notes: "Executive credenza with soft-close hinges, aluminium handles and telescopic slides",
    placeOfSupply: "27-Maharashtra",
    items: [
      {
        itemCode: "DSK-EXEC-01",
        itemName: "Executive L-Desk with Side Return (1800x900)",
        description: "25mm Pre-Lam Top with 18mm understructure and 3-drawer mobile pedestal",
        lengthMm: 1800,
        widthMm: 900,
        heightMm: 750,
        quantity: 1,
        unit: "Nos",
        wastagePercent: 8,
        edges: { e1: true, e2: true, e3: true, e4: true },
      },
      {
        itemCode: "STR-CRED-02",
        itemName: "Full-Height Storage Credenza (1200x450x1200)",
        description: "18mm Pre-lam casing with soft-close hinges, locks and aluminium D-handles",
        lengthMm: 1200,
        widthMm: 450,
        heightMm: 1200,
        quantity: 2,
        unit: "Nos",
        wastagePercent: 8,
        edges: { e1: true, e2: true, e3: true, e4: false },
      },
    ],
  };

  console.log("Seeding initial estimations into PostgreSQL...");
  const res1 = await estimationService.createEstimation(est1);
  console.log(`Created estimation ${res1.estimationNumber} (ID: ${res1.id}) with total ₹${res1.totalSellingPrice}`);

  const res2 = await estimationService.createEstimation(est2);
  console.log(`Created estimation ${res2.estimationNumber} (ID: ${res2.id}) with total ₹${res2.totalSellingPrice}`);

  await pool.end();
  console.log("Seed completed successfully!");
}

seedInitialEstimations().catch(console.error);
