const express = require("express");
const router = express.Router();
const {
  listJobs,
  listBoms,
  addJob,
  editJob,
  removeJob,
} = require("../controllers/productionController");

router.get("/boms", listBoms);   // /:id च्या आधी असायला हवा
router.get("/", listJobs);
router.post("/", addJob);
router.put("/:id", editJob);
router.delete("/:id", removeJob);

module.exports = router;