const express = require("express");
const {
  listProducts, productImage, addProduct, editProduct, removeProduct, syncInventory,
} = require("../controllers/inventoryProductController");

const router = express.Router();

router.get("/", listProducts);
router.post("/sync", syncInventory);
router.get("/:srNo/image", productImage);
router.post("/", addProduct);
router.put("/:srNo", editProduct);
router.delete("/:srNo", removeProduct);

module.exports = router;