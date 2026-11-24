const bomModel = require("../models/bomModel");

const getBOMs = async (req, res) => {
  try {
    const boms = await bomModel.getAllBOMs();
    return res.status(200).json({
      success: true,
      count: boms.length,
      boms,
      data: boms,
    });
  } catch (error) {
    console.error("Error in getBOMs controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch BOMs",
      error: error.message,
    });
  }
};

module.exports = {
  getBOMs,
};
