const estimationModel = require("../models/estimationModel");

const SQFT_DIVISOR = 92903.04;
const RFT_DIVISOR = 304.8;
const SHEET_SQFT = 32.0; // 8ft x 4ft

/**
 * Calculates raw dimension metrics for an item
 */
const calculateSpatialMetrics = ({
  lengthMm = 1200,
  widthMm = 600,
  heightMm = 750,
  quantity = 1,
  wastagePercent = 8,
  edges = { e1: true, e2: true, e3: true, e4: false },
}) => {
  const L = Math.max(0, Number(lengthMm));
  const W = Math.max(0, Number(widthMm));
  const H = Math.max(0, Number(heightMm));
  const qty = Math.max(1, Number(quantity));
  const wastage = Math.max(0, Number(wastagePercent));

  // Area Calculations
  const unitSqft = (L * W) / SQFT_DIVISOR;
  const totalSqft = unitSqft * qty;
  const procurementSqft = totalSqft * (1 + wastage / 100);
  const sheetsRequired = Math.ceil(procurementSqft / SHEET_SQFT);

  // Edge Band Perimeter in RFT
  const bandedPerimeterMm =
    (edges.e1 ? L : 0) +
    (edges.e2 ? W : 0) +
    (edges.e3 ? L : 0) +
    (edges.e4 ? W : 0);
  const edgeBandRft = (bandedPerimeterMm / RFT_DIVISOR) * qty;

  return {
    L,
    W,
    H,
    qty,
    unitSqft: Number(unitSqft.toFixed(2)),
    totalSqft: Number(totalSqft.toFixed(2)),
    wastagePercent: wastage,
    procurementSqft: Number(procurementSqft.toFixed(2)),
    sheetsRequired,
    edgeBandRft: Number(edgeBandRft.toFixed(2)),
    edges,
  };
};

/**
 * Calculates selling price given cost and markup/margin method
 */
const calculateSellingPrice = (primeCost, percent = 25, method = "markup") => {
  const cost = Math.max(0, Number(primeCost));
  const p = Math.max(0, Math.min(99.99, Number(percent))) / 100;

  if (method === "margin") {
    return cost / (1 - p);
  }
  // Default to markup
  return cost * (1 + p);
};

/**
 * Generates automated BOQ lines for standard modular furniture if not manually supplied
 */
const generateDefaultBOQ = (itemMetrics, materialsMaster = []) => {
  const { L, W, qty, procurementSqft, edgeBandRft } = itemMetrics;

  const findMat = (code) => materialsMaster.find((m) => m.code === code) || null;

  const plb25 = findMat("MAT-PLB-25") || { rate: 65, id: null, unit: "Sq.Ft" };
  const plb18 = findMat("MAT-PLB-18") || { rate: 52, id: null, unit: "Sq.Ft" };
  const eb2mm = findMat("MAT-EB-2MM") || { rate: 9.5, id: null, unit: "RFT" };
  const eb08mm = findMat("MAT-EB-08MM") || { rate: 4.8, id: null, unit: "RFT" };
  const legLoop = findMat("MAT-LEG-LOOP") || { rate: 1450, id: null, unit: "Pair" };
  const camSet = findMat("MAT-HW-CAM") || { rate: 25, id: null, unit: "Set" };
  const grommet = findMat("MAT-ELEC-GROMMET") || { rate: 45, id: null, unit: "Nos" };
  const labSizing = findMat("MAT-LAB-SIZING") || { rate: 12, id: null, unit: "Sq.Ft" };
  const labAssembly = findMat("MAT-LAB-ASSEMBLY") || { rate: 250, id: null, unit: "Seat" };

  const boq = [];

  // 1. Table Top 25mm Board
  boq.push({
    materialId: plb25.id,
    lineCategory: "Sheet Material",
    description: "25mm Pre-Lam Particle Board (Table Top)",
    baseQty: Number((procurementSqft * 0.45).toFixed(2)),
    wastagePercent: 10,
    procurementQty: Number((procurementSqft * 0.45).toFixed(2)),
    unit: "Sq.Ft",
    unitCost: Number(plb25.rate),
    totalCost: Number((procurementSqft * 0.45 * Number(plb25.rate)).toFixed(2)),
  });

  // 2. Modesty / Gable 18mm Board
  boq.push({
    materialId: plb18.id,
    lineCategory: "Sheet Material",
    description: "18mm Pre-Lam Board (Modesty & Understructure)",
    baseQty: Number((procurementSqft * 0.55).toFixed(2)),
    wastagePercent: 10,
    procurementQty: Number((procurementSqft * 0.55).toFixed(2)),
    unit: "Sq.Ft",
    unitCost: Number(plb18.rate),
    totalCost: Number((procurementSqft * 0.55 * Number(plb18.rate)).toFixed(2)),
  });

  // 3. Edge Banding 2mm
  boq.push({
    materialId: eb2mm.id,
    lineCategory: "Edge Band",
    description: "2mm PVC Edge Banding Tape (Table Top Outer Edge)",
    baseQty: Number(edgeBandRft.toFixed(2)),
    wastagePercent: 5,
    procurementQty: Number((edgeBandRft * 1.05).toFixed(2)),
    unit: "RFT",
    unitCost: Number(eb2mm.rate),
    totalCost: Number((edgeBandRft * 1.05 * Number(eb2mm.rate)).toFixed(2)),
  });

  // 4. Hardware Fittings
  boq.push({
    materialId: camSet.id,
    lineCategory: "Hardware",
    description: "Knockdown Cam & Minifix Hardware Pack",
    baseQty: qty * 4,
    wastagePercent: 0,
    procurementQty: qty * 4,
    unit: "Set",
    unitCost: Number(camSet.rate),
    totalCost: Number((qty * 4 * Number(camSet.rate)).toFixed(2)),
  });

  // 5. Wire Cutout Grommets
  boq.push({
    materialId: grommet.id,
    lineCategory: "Electrical",
    description: "60mm Wire Cutout Cable Grommet",
    baseQty: qty,
    wastagePercent: 0,
    procurementQty: qty,
    unit: "Nos",
    unitCost: Number(grommet.rate),
    totalCost: Number((qty * Number(grommet.rate)).toFixed(2)),
  });

  // 6. Labour Sizing & Edge Banding
  boq.push({
    materialId: labSizing.id,
    lineCategory: "Labour",
    description: "Factory Sizing, Cutting & Edge Banding Labour",
    baseQty: Number(procurementSqft.toFixed(2)),
    wastagePercent: 0,
    procurementQty: Number(procurementSqft.toFixed(2)),
    unit: "Sq.Ft",
    unitCost: Number(labSizing.rate),
    totalCost: Number((procurementSqft * Number(labSizing.rate)).toFixed(2)),
  });

  return boq;
};

/**
 * Service Methods
 */
const getAllEstimations = async (filters) => {
  return await estimationModel.getAllEstimations(filters);
};

const getEstimationById = async (id) => {
  return await estimationModel.getEstimationById(id);
};

const createEstimation = async (rawPayload) => {
  const materials = await estimationModel.getAllMaterials();

  // Normalize pricing methods & calculate full totals
  const pricingMethod = rawPayload.pricingMethod || "markup";
  const markupPercent = Number(rawPayload.markupPercent || 25);
  const marginPercent = Number(rawPayload.marginPercent || 20);
  const taxRate = Number(rawPayload.taxRate || 18);

  const processedItems = (rawPayload.items || []).map((item) => {
    const metrics = calculateSpatialMetrics(item);

    // If item already has custom BOQ lines, recalculate totals
    let boqLines = item.boqLines;
    if (!Array.isArray(boqLines) || boqLines.length === 0) {
      boqLines = generateDefaultBOQ(metrics, materials);
    }

    // Subtotal costs by category
    let materialCost = 0;
    let hardwareCost = 0;
    let labourCost = 0;
    let otherCost = 0;

    boqLines.forEach((line) => {
      const lineTotal = Number(line.procurementQty || line.baseQty || 0) * Number(line.unitCost || 0);
      line.totalCost = Number(lineTotal.toFixed(2));

      const cat = (line.lineCategory || "").toLowerCase();
      if (cat.includes("sheet") || cat.includes("board") || cat.includes("edge")) {
        materialCost += line.totalCost;
      } else if (cat.includes("hardware") || cat.includes("metal") || cat.includes("electrical")) {
        hardwareCost += line.totalCost;
      } else if (cat.includes("labour")) {
        labourCost += line.totalCost;
      } else {
        otherCost += line.totalCost;
      }
    });

    const totalPrimeCost = materialCost + hardwareCost + labourCost + otherCost;
    const unitPrimeCost = totalPrimeCost / Math.max(1, metrics.qty);

    const unitSellingPrice = calculateSellingPrice(
      unitPrimeCost,
      pricingMethod === "markup" ? markupPercent : marginPercent,
      pricingMethod
    );
    const totalSellingPrice = unitSellingPrice * metrics.qty;

    return {
      ...item,
      ...metrics,
      materialCost: Number(materialCost.toFixed(2)),
      hardwareCost: Number(hardwareCost.toFixed(2)),
      labourCost: Number(labourCost.toFixed(2)),
      otherCost: Number(otherCost.toFixed(2)),
      unitPrimeCost: Number(unitPrimeCost.toFixed(2)),
      totalPrimeCost: Number(totalPrimeCost.toFixed(2)),
      unitSellingPrice: Number(unitSellingPrice.toFixed(2)),
      totalSellingPrice: Number(totalSellingPrice.toFixed(2)),
      boqLines,
    };
  });

  const totalPrimeCost = processedItems.reduce((sum, item) => sum + item.totalPrimeCost, 0);
  const totalSellingPrice = processedItems.reduce((sum, item) => sum + item.totalSellingPrice, 0);
  const taxAmount = (totalSellingPrice * taxRate) / 100;
  const grandTotal = totalSellingPrice + taxAmount;

  const payload = {
    ...rawPayload,
    items: processedItems,
    totalPrimeCost: Number(totalPrimeCost.toFixed(2)),
    totalSellingPrice: Number(totalSellingPrice.toFixed(2)),
    taxRate,
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };

  return await estimationModel.createEstimation(payload);
};

const updateEstimation = async (id, rawPayload) => {
  return await estimationModel.updateEstimation(id, rawPayload);
};

const deleteEstimation = async (id) => {
  return await estimationModel.deleteEstimation(id);
};

const getAllMaterials = async (category) => {
  return await estimationModel.getAllMaterials(category);
};

module.exports = {
  calculateSpatialMetrics,
  calculateSellingPrice,
  generateDefaultBOQ,
  getAllEstimations,
  getEstimationById,
  createEstimation,
  updateEstimation,
  deleteEstimation,
  getAllMaterials,
};
