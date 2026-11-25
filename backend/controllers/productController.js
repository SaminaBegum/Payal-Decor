const productModel = require("../models/productModel");

/**
 * Controller to list all products with optional filters
 */
async function getProducts(req, res) {
  try {
    const { search, category, status, sortBy, sortOrder } = req.query;
    const result = await productModel.getAllProducts({
      search,
      category,
      status,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      data: result.products,
      products: result.products,
      total: result.total
    });
  } catch (error) {
    console.error("Error fetching products: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
}

/**
 * Controller to get product KPI stats
 */
async function getProductStats(req, res) {
  try {
    const stats = await productModel.getProductStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching product statistics: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product statistics",
      error: error.message
    });
  }
}

/**
 * Controller to auto-generate next sequential SKU
 */
async function getNextSku(req, res) {
  try {
    const { category } = req.query;
    const sku = await productModel.generateNextSku(category);
    return res.status(200).json({
      success: true,
      data: { sku, code: sku },
      sku
    });
  } catch (error) {
    console.error("Error generating next product SKU: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate SKU",
      error: error.message
    });
  }
}

/**
 * Controller to retrieve a single product by ID
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await productModel.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
      product
    });
  } catch (error) {
    console.error("Error fetching product by ID (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message
    });
  }
}

/**
 * Controller to create a new product
 */
async function createProduct(req, res) {
  try {
    const { name, category, price } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product category is required"
      });
    }

    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: "Valid product price is required"
      });
    }

    // Auto-generate SKU if not provided
    if (!req.body.sku && !req.body.code) {
      req.body.sku = await productModel.generateNextSku(category);
      req.body.code = req.body.sku;
    }

    const checkCode = req.body.code || req.body.sku;
    const existing = await productModel.getProductByCode(checkCode);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Product with code/SKU "${checkCode}" already exists`
      });
    }

    const newProduct = await productModel.createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
      product: newProduct
    });
  } catch (error) {
    console.error("Error creating product: %s", error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message
    });
  }
}

/**
 * Controller to update an existing product
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const updated = await productModel.updateProduct(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
      product: updated
    });
  } catch (error) {
    console.error("Error updating product (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
}

/**
 * Controller to delete a product
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const deleted = await productModel.deleteProduct(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product (%s): %s", req.params.id, error.message, error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
}

module.exports = {
  getProducts,
  getProductStats,
  getNextSku,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
