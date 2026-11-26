const Installation = require("../models/installationModel");

const STATUSES = ["Pending", "Scheduled", "In Progress", "Completed", "Cancelled"];

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

function normalize(body) {
  return {
    dispatchNo: clean(body.dispatchNo),
    workOrderNo: clean(body.workOrderNo),
    customerId: clean(body.customerId),
    customerName: clean(body.customerName),
    projectName: clean(body.projectName),
    siteAddress: clean(body.siteAddress),
    installerName: clean(body.installerName),
    installerPhone: clean(body.installerPhone),
    scheduledDate: clean(body.scheduledDate),
    completedDate: clean(body.completedDate),
    signedOffBy: clean(body.signedOffBy),
    status: clean(body.status) || "Pending",
    notes: clean(body.notes),
  };
}

function validate(d) {
  if (!d.customerName) return "Customer name is required.";
  if (!d.siteAddress) return "Site address is required.";
  if (!STATUSES.includes(d.status)) return "Invalid status.";
  return null;
}

const fail = (res, err, fallback) => {
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

exports.getInstallations = async (req, res) => {
  try {
    const installations = await Installation.getAll();
    res.json({ success: true, installations });
  } catch (err) {
    fail(res, err, "Installations could not be loaded.");
  }
};

exports.createInstallation = async (req, res) => {
  try {
    const data = normalize(req.body);
    const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const installation = await Installation.create(data);
    res.status(201).json({ success: true, installation });
  } catch (err) {
    fail(res, err, "Installation could not be saved.");
  }
};

exports.updateInstallation = async (req, res) => {
  try {
    const data = normalize(req.body);
    const problem = validate(data);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const installation = await Installation.update(req.params.id, data);
    if (!installation) {
      return res.status(404).json({ success: false, message: "Installation not found." });
    }
    res.json({ success: true, installation });
  } catch (err) {
    fail(res, err, "Installation could not be updated.");
  }
};

exports.updateInstallationStatus = async (req, res) => {
  try {
    const status = clean(req.body.status);
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const installation = await Installation.updateStatus(req.params.id, status);
    if (!installation) {
      return res.status(404).json({ success: false, message: "Installation not found." });
    }
    res.json({ success: true, installation });
  } catch (err) {
    fail(res, err, "Status could not be updated.");
  }
};

exports.deleteInstallation = async (req, res) => {
  try {
    const deleted = await Installation.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Installation not found." });
    }
    res.json({ success: true });
  } catch (err) {
    fail(res, err, "Installation could not be deleted.");
  }
};