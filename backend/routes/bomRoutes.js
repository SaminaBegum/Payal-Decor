const express = require("express");
const router = express.Router();
const { getBOMs } = require("../controllers/bomController");

router.get("/", getBOMs);

module.exports = router;
