const Question = require("../models/Question");
const Exam = require("../models/Exam");
const mongoose = require("mongoose");

/**
 * Add a new question to an exam
 */
const createQuestion = async (req, res) => {
  try {
    // Log debugging information
    console.log("Auth header:", req.headers.authorization);
    console.log("User object:", req.user);

    const {
      examId, // This should be the custom string ID
      text,
      type,
      points,
      timeLimit,
      attachment,
      correctAnswer,
      tolerance,
      options,
      correctOptions,
    } = req.body;

    // 1. Find exam by custom ID field
    const exam = await Exam.findOne({ id: examId });
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // 2. Check if req.user exists before comparing
    // This checks for the user ID in the format your JWT middleware provides
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Authentication required",
        debug: {
          userExists: !!req.user,
          headers: req.headers,
        },
      });
    }

    // 3. Compare MongoDB _id references - FIXED to use req.user.id instead of req.user._id
    // Convert both to strings for comparison (important!)
    if (exam.createdBy.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify this exam" });
    }

    // 4. Create new question using the custom examId for reference
    const questionData = {
      examId: examId, // Use the custom examId directly from the request
      text,
      type,
      points,
      timeLimit,
    };

    // Add attachment if it exists
    if (attachment) {
      questionData.attachment = attachment;
    }

    // Handle question type specific data
    if (type === "direct") {
      questionData.correctAnswer = correctAnswer;
      questionData.tolerance = tolerance;
    } else if (type === "mcq") {
      questionData.options = options;
      questionData.correctOptions = correctOptions;
    }

    const newQuestion = new Question(questionData);
    await newQuestion.save();

    res.status(201).json({
      success: true,
      question: newQuestion,
    });
  } catch (err) {
    console.error("Error creating question:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Get a question by ID
 */
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the ID is a valid MongoDB ObjectId
    let question;
    if (mongoose.Types.ObjectId.isValid(id)) {
      question = await Question.findById(id);
    } else {
      // If not a valid ObjectId, return a more specific error
      return res.status(400).json({
        message: "Invalid question ID format",
        detail: "The provided ID is not in the correct format",
      });
    }

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if user has access to this question's exam
    // Use findOne with the string examId
    const exam = await Exam.findOne({ id: question.examId });

    if (!exam) {
      return res.status(404).json({ message: "Associated exam not found" });
    }

    // Ensure both user ID and createdBy are properly compared as strings
    if (!req.user || exam.createdBy.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to access this question" });
    }

    res.status(200).json(question);
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Update an existing question
 */
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid question ID format",
        detail: "The provided ID is not in the correct format",
      });
    }

    const updateData = req.body;

    // Find the question
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if user has permission to modify this question
    // Use findOne with the string examId
    const exam = await Exam.findOne({ id: question.examId });

    if (!exam) {
      return res.status(404).json({ message: "Associated exam not found" });
    }

    if (!req.user || exam.createdBy.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify this question" });
    }

    // Handle type change
    if (updateData.type && updateData.type !== question.type) {
      // If changing from direct to MCQ
      if (updateData.type === "mcq") {
        question.correctAnswer = undefined;
        question.tolerance = undefined;
      }
      // If changing from MCQ to direct
      else if (updateData.type === "direct") {
        question.options = undefined;
        question.correctOptions = undefined;
      }
    }

    // Update the question with the new data
    Object.keys(updateData).forEach((key) => {
      question[key] = updateData[key];
    });

    // Update the timestamp
    question.updatedAt = Date.now();

    await question.save();

    res.status(200).json({
      success: true,
      question,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Error updating question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Delete a question
 */
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid question ID format",
        detail: "The provided ID is not in the correct format",
      });
    }

    // Find the question
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if user has permission to delete this question
    // Use findOne with the string examId
    const exam = await Exam.findOne({ id: question.examId });

    if (!exam) {
      return res.status(404).json({ message: "Associated exam not found" });
    }

    if (!req.user || exam.createdBy.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this question" });
    }

    // Delete the question
    await Question.findByIdAndDelete(id);

    // Update exam questions count (optional)
    exam.questionCount = Math.max((exam.questionCount || 0) - 1, 0);
    await exam.save();

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Get all questions for an exam
 */
const getQuestionsByExamId = async (req, res) => {
  try {
    const { examId } = req.params;

    // FIXED: Use findOne with id field instead of findById
    const exam = await Exam.findOne({ id: examId });
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (!exam.createdBy) {
      return res.status(500).json({ message: "Invalid exam creator data" });
    }

    // Get all questions for this exam using the custom examId
    const questions = await Question.find({ examId: examId }).sort({
      createdAt: 1,
    });

    res.status(200).json(questions);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Handle attachment upload for questions
 */
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // In a real implementation, you would:
    // 1. Process the uploaded file
    // 2. Store it in a storage service (S3, cloud storage, etc.)
    // 3. Return the file URL and metadata

    // For demo purposes, we'll create a placeholder URL
    const fileType = req.file.mimetype.split("/")[0]; // image, audio, video
    const attachmentData = {
      type: fileType,
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`, // This would be your actual stored file path
    };

    res.status(200).json(attachmentData);
  } catch (err) {
    console.error("Error uploading attachment:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getQuestionsByExamId,
  uploadAttachment,
};
