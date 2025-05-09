const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { teacherOnly } = require("../middleware/roleMiddleware");
const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/examController");
const { getQuestionsByExamId } = require("../controllers/questionController");

// Create a new exam (teachers only)
router.post("/", auth, teacherOnly, createExam);

// Get all exams (filtered by user role)
router.get("/", auth, getExams);

// Get a specific exam by ID
router.get("/:id", auth, getExamById);

// Update an exam (creator only)
router.put("/:id", auth, updateExam);

// Delete an exam (creator only)
router.delete("/:id", auth, deleteExam);

// Add the route for fetching questions by exam ID
router.get("/:id/questions", auth, getQuestionsByExamId);

module.exports = router;
