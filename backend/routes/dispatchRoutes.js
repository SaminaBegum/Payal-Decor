const express = require("express");
const router = express.Router();
const c = require("../controllers/dispatchController");

router.get("/", c.getDispatches);
router.post("/", c.createDispatch);
router.put("/:id", c.updateDispatch);
router.patch("/:id/status", c.updateDispatchStatus);
router.delete("/:id", c.deleteDispatch);

module.exports = router;