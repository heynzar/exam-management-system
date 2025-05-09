const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getQuestionsByExamId,
  uploadAttachment,
} = require("../controllers/questionController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Filter accepted file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "video/mp4",
    "video/webm",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

// IMPORTANT: Route order matters in Express!
// Route for fetching questions by exam ID must come BEFORE the route with :id parameter
router.get("/exams/:examId", authMiddleware, getQuestionsByExamId); //✅ // This must be first

// Question routes with ID parameter
router.get("/:id", authMiddleware, getQuestionById); //✅
router.put("/:id", authMiddleware, updateQuestion);
router.delete("/:id", authMiddleware, deleteQuestion);

// Question creation route
router.post("/", authMiddleware, createQuestion); //✅

// Question attachment upload
router.post(
  "/attachments",
  authMiddleware,
  upload.single("file"),
  uploadAttachment
);

module.exports = router;
