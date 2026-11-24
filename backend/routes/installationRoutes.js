const express = require("express");
const router = express.Router();
const c = require("../controllers/installationController");

router.get("/", c.getInstallations);
router.post("/", c.createInstallation);
router.put("/:id", c.updateInstallation);
router.patch("/:id/status", c.updateInstallationStatus);
router.delete("/:id", c.deleteInstallation);

module.exports = router;