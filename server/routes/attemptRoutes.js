const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { teacherOnly } = require("../middleware/roleMiddleware");
const {
  submitExamAttempt,
  getStudentAttempts,
  getExamAttempts,
  getAttemptById,
  getAttemptStatistics,
} = require("../controllers/attemptController");

// Submit an exam attempt (students only)
router.post("/", auth, submitExamAttempt); //✅

// Get all attempts for the current student
router.get("/student", auth, getStudentAttempts); //✅

// Get all attempts for a specific exam (teachers only)
router.get("/exams/:examId", auth, teacherOnly, getExamAttempts); //✅

// Get a specific attempt by ID
router.get("/:id", auth, getAttemptById); //✅

// Get statistics for an exam's attempts (teachers only)
router.get(
  "/exams/:examId/statistics",
  auth,
  teacherOnly,
  getAttemptStatistics
);

module.exports = router;
