const Exam = require("../models/Exam");

/**
 * Create a new exam
 * @route POST /api/exams
 * @access Private (teachers only)
 */
exports.createExam = async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.userType !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can create exams",
      });
    }

    // Validate required fields
    const { id, title, description, targetAudience } = req.body;

    if (!id || !title || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        requiredFields: ["id", "title", "targetAudience"],
      });
    }

    // Check if exam with this ID already exists
    const existingExam = await Exam.findOne({ id });
    if (existingExam) {
      return res.status(400).json({
        success: false,
        message: "An exam with this ID already exists",
      });
    }

    // Create the new exam
    const newExam = await Exam.create({
      ...req.body,
      createdBy: req.user.id,
      status: "draft",
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam: newExam,
    });
  } catch (err) {
    console.error("Error creating exam:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create exam",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get all exams with filters
 * @route GET /api/exams
 * @access Private
 */
exports.getExams = async (req, res) => {
  try {
    let query = {};

    // If user is a teacher, only return their exams
    if (req.user.userType === "teacher") {
      query.createdBy = req.user.id;
    }

    // If user is a student, only return published exams
    if (req.user.userType === "student") {
      query.status = "published";
    }

    // Support filtering by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Support filtering by targetAudience
    if (req.query.targetAudience) {
      query.targetAudience = {
        $regex: req.query.targetAudience,
        $options: "i",
      };
    }

    // Support search by title or description
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const exams = await Exam.find(query)
      .sort({ createdAt: -1 })
      .select("-questions.correctAnswer") // Don't send correct answers to client
      .populate("createdBy", "firstName lastName");

    res.status(200).json({
      success: true,
      count: exams.length,
      exams,
    });
  } catch (err) {
    console.error("Error fetching exams:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get exam by custom ID
 * @route GET /api/exams/:id
 * @access Private
 */
exports.getExamById = async (req, res) => {
  try {
    // Find by custom ID instead of MongoDB _id
    const exam = await Exam.findOne({ id: req.params.id }).populate(
      "createdBy",
      "firstName lastName"
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Hide correct answers if user is a student
    let examData = exam.toObject();
    if (req.user.userType === "student" && exam.status === "published") {
      examData.questions = examData.questions.map((q) => ({
        ...q,
        correctAnswer: undefined,
      }));
    }

    // If user is not creator or admin, prevent access to unpublished exams
    if (req.user.userType === "student" && exam.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "This exam is not available yet",
      });
    }

    res.status(200).json({
      success: true,
      exam: examData,
    });
  } catch (err) {
    console.error("Error fetching exam:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Update exam
 * @route PUT /api/exams/:id
 * @access Private (creator only)
 */
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ id: req.params.id });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if user is the creator of the exam
    if (
      exam.createdBy.toString() !== req.user.id &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this exam",
      });
    }

    // Prevent changing the exam ID
    if (req.body.id && req.body.id !== exam.id) {
      return res.status(400).json({
        success: false,
        message: "Exam ID cannot be changed",
      });
    }

    // Update the exam
    const updatedExam = await Exam.findOneAndUpdate(
      { id: req.params.id },
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      exam: updatedExam,
    });
  } catch (err) {
    console.error("Error updating exam:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update exam",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Delete exam
 * @route DELETE /api/exams/:id
 * @access Private (creator only)
 */
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ id: req.params.id });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if user is the creator of the exam
    if (
      exam.createdBy.toString() !== req.user.id &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this exam",
      });
    }

    await Exam.findOneAndDelete({ id: req.params.id });

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting exam:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete exam",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
