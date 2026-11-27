const {
  getAllProducts,
  getProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
  syncProducts,
} = require("../models/inventoryProductModel");

const validate = (b) => {
  if (!b.srNo || !String(b.srNo).trim()) return "Sr.No is required";
  if (!b.itemName || !String(b.itemName).trim()) return "Item name is required";
  if (b.price === undefined || b.price === "" || Number.isNaN(Number(b.price)) || Number(b.price) < 0)
    return "Price must be a valid number";
  return null;
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);
  if (error.code === "23505") {
    return res.status(409).json({ success: false, message: "This Sr.No already exists" });
  }
  return res.status(500).json({ success: false, message: fallback });
};

// Plain array, which is what the Inventory page expects
const listProducts = async (req, res) => {
  try {
    res.status(200).json(await getAllProducts());
  } catch (error) {
    handleError(res, error, "Failed to load products");
  }
};

// Serves the stored base64 image as a real image (cached by the browser)
const productImage = async (req, res) => {
  try {
    const data = await getProductImage(req.params.srNo);
    const m = data && data.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
    if (!m) return res.status(404).end();
    res.set({
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=31536000, immutable",
      // helmet blocks cross-origin image use by default (5173 -> 5000)
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(Buffer.from(m[2], "base64"));
  } catch (error) {
    handleError(res, error, "Failed to load image");
  }
};

const addProduct = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    res.status(201).json({ success: true, data: await createProduct(req.body) });
  } catch (error) {
    handleError(res, error, "Failed to save product");
  }
};

const editProduct = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const data = await updateProduct(req.params.srNo, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to update product");
  }
};

const removeProduct = async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.srNo);
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    handleError(res, error, "Failed to delete product");
  }
};

const syncInventory = async (req, res) => {
  try {
    const { upserts = [], deletes = [] } = req.body;
    if (!Array.isArray(upserts) || !Array.isArray(deletes)) {
      return res.status(400).json({ success: false, message: "Invalid sync payload" });
    }
    for (const p of upserts) {
      const problem = validate(p);
      if (problem) {
        return res.status(400).json({ success: false, message: `${p.srNo || "?"}: ${problem}` });
      }
    }
    res.status(200).json({ success: true, data: await syncProducts(upserts, deletes) });
  } catch (error) {
    handleError(res, error, "Failed to sync products");
  }
};

module.exports = {
  listProducts,
  productImage,
  addProduct,
  editProduct,
  removeProduct,
  syncInventory,
};