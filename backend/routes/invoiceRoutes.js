const express = require("express");
const router = express.Router();

const {
  listInvoices,
  addInvoice,
  editInvoice,
  removeInvoice,
} = require("../controllers/invoiceController");

router.get("/", listInvoices);
router.post("/", addInvoice);
router.put("/:id", editInvoice);
router.delete("/:id", removeInvoice);

module.exports = router;