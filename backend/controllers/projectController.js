const {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../models/projectModel");

const listProjects = async (req, res) => {
  try {
    const projects = await getAllProjects(req.query.status);
    // frontend "projects" key वाचतो
    res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({ success: false, message: "Failed to load projects" });
  }
};

const addProject = async (req, res) => {
  try {
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }
    const project = await createProject(req.body);
    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ success: false, message: "Failed to create project" });
  }
};

const editProject = async (req, res) => {
  try {
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }
    const project = await updateProject(Number(req.params.id), req.body);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ success: false, message: "Failed to update project" });
  }
};

const removeProject = async (req, res) => {
  try {
    const deleted = await deleteProject(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, message: "Project deleted" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ success: false, message: "Failed to delete project" });
  }
};

module.exports = { listProjects, addProject, editProject, removeProject };