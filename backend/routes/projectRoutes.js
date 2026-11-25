const express = require("express");
const router = express.Router();

const {
  listProjects,
  addProject,
  editProject,
  removeProject,
} = require("../controllers/projectController");

router.get("/", listProjects);
router.post("/", addProject);
router.put("/:id", editProject);
router.delete("/:id", removeProject);

module.exports = router;