const express = require("express");
const router = express.Router();
const {
  listWorkOrders,
  addWorkOrder,
  editWorkOrder,
  removeWorkOrder,
} = require("../controllers/workOrderController");

router.get("/", listWorkOrders);
router.post("/", addWorkOrder);
router.put("/:id", editWorkOrder);
router.delete("/:id", removeWorkOrder);

module.exports = router;         