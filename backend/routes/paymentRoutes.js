const express = require("express");
const {
  listPayments,
  addPayment,
  editPayment,
  removePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.get("/", listPayments);
router.post("/", addPayment);
router.put("/:id", editPayment);
router.delete("/:id", removePayment);

module.exports = router;
