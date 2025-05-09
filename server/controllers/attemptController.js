const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");

/**
 * Submit an exam attempt
 * @route POST /api/attempts
 * @access Private (students only)
 */
exports.submitExamAttempt = async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit exam attempts",
      });
    }

    // Validate required fields
    const { examId, startTime, endTime, coordinates, answers, score } =
      req.body;

    if (!examId || !startTime || !coordinates || !answers) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        requiredFields: ["examId", "startTime", "coordinates", "answers"],
      });
    }

    // Check if the exam exists
    const exam = await Exam.findOne({ id: examId });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if the exam is published
    if (exam.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot submit attempt for an unpublished exam",
      });
    }

    // Check if student already has an in-progress attempt
    const existingAttempt = await Attempt.findOne({
      examId,
      student: req.user.id,
      endTime: null,
    });

    if (existingAttempt) {
      // Update the existing attempt
      existingAttempt.endTime = endTime || new Date();
      existingAttempt.answers = answers;
      existingAttempt.score = score || 0;
      existingAttempt.completed = true;

      await existingAttempt.save();

      return res.status(200).json({
        success: true,
        message: "Exam attempt updated successfully",
        attempt: existingAttempt,
      });
    }

    // Create a new attempt
    const newAttempt = await Attempt.create({
      examId,
      student: req.user.id,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      coordinates,
      answers,
      score: score || 0,
      completed: !!endTime,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "Exam attempt submitted successfully",
      attempt: newAttempt,
    });
  } catch (err) {
    console.error("Error submitting exam attempt:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit exam attempt",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get all attempts for the current student
 * @route GET /api/attempts/student
 * @access Private (students only)
 */
exports.getStudentAttempts = async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their attempts",
      });
    }

    // Find all attempts for this student
    const attempts = await Attempt.find({ student: req.user.id })
      .sort({ startTime: -1 })
      .populate({
        path: "examId",
        select: "title description targetAudience status",
      });

    // Transform the response data
    const formattedAttempts = attempts.map((attempt) => {
      const attemptObj = attempt.toObject();
      // Move exam details to an exam property and clean up
      const exam = attemptObj.examId;
      delete attemptObj.examId;

      return {
        ...attemptObj,
        exam,
      };
    });

    res.status(200).json({
      success: true,
      count: attempts.length,
      attempts: formattedAttempts,
    });
  } catch (err) {
    console.error("Error fetching student attempts:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attempts",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get all attempts for a specific exam
 * @route GET /api/attempts/exams/:examId
 * @access Private (teachers only)
 */
exports.getExamAttempts = async (req, res) => {
  try {
    const { examId } = req.params;

    // Check if the exam exists
    const exam = await Exam.findOne({ id: examId });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if user is the creator of the exam or an admin
    if (
      exam.createdBy.toString() !== req.user.id &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view attempts for this exam",
      });
    }

    // Find all attempts for this exam
    const attempts = await Attempt.find({ examId })
      .sort({ startTime: -1 })
      .populate("student", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (err) {
    console.error("Error fetching exam attempts:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attempts",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get a specific attempt by ID
 * @route GET /api/attempts/:id
 * @access Private
 */
exports.getAttemptById = async (req, res) => {
  try {
    // Add error logging to see the actual MongoDB error
    console.log(`Attempting to fetch attempt with ID: ${req.params.id}`);

    const attempt = await Attempt.findById(req.params.id)
      .populate("student", "firstName lastName email")
      .populate("examId");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Log found attempt (for debugging)
    console.log("Found attempt:", attempt._id);

    // Check if user is authorized to view this attempt
    const isStudent =
      req.user && req.user.id === attempt.student._id.toString();

    // Check if the examId is populated and has the createdBy field
    const isExamCreator =
      attempt.examId &&
      attempt.examId.createdBy &&
      req.user &&
      attempt.examId.createdBy.toString() === req.user.id;

    const isTeacher =
      req.user &&
      (req.user.userType === "teacher" || req.user.userType === "admin");

    // // Enhanced authorization check with better null handling
    // if (
    // !isStudent &&
    //   !(isTeacher && isExamCreator) &&
    //   !(req.user && req.user.userType === "admin")
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not authorized to view this attempt",
    //   });
    // }

    // Format response data
    const attemptObj = attempt.toObject();

    // If you need to transform the response structure, do it here
    // For example, if you want to move examId to exam like in the previous endpoint:
    /*
    const exam = attemptObj.examId;
    delete attemptObj.examId;
    attemptObj.exam = exam;
    */

    res.status(200).json({
      success: true,
      attempt: attemptObj,
    });
  } catch (err) {
    console.error("Error fetching attempt:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attempt",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

/**
 * Get statistics for an exam's attempts
 * @route GET /api/attempts/exams/:examId/statistics
 * @access Private (teachers only)
 */
exports.getAttemptStatistics = async (req, res) => {
  try {
    const { examId } = req.params;

    // Check if the exam exists
    const exam = await Exam.findOne({ id: examId });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if user is the creator of the exam or an admin
    if (
      exam.createdBy.toString() !== req.user.id &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view statistics for this exam",
      });
    }

    // Find all completed attempts for this exam
    const attempts = await Attempt.find({
      examId,
      completed: true,
    });

    if (attempts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No completed attempts found for this exam",
        statistics: {
          totalAttempts: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          medianScore: 0,
          completionRate: 0,
          averageDuration: 0,
        },
      });
    }

    // Calculate statistics
    const scores = attempts
      .map((attempt) => attempt.score)
      .sort((a, b) => a - b);
    const totalAttempts = attempts.length;
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / totalAttempts;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const medianScore =
      totalAttempts % 2 === 0
        ? (scores[totalAttempts / 2 - 1] + scores[totalAttempts / 2]) / 2
        : scores[Math.floor(totalAttempts / 2)];

    // Calculate completion rate
    const allAttempts = await Attempt.countDocuments({ examId });
    const completionRate = (totalAttempts / allAttempts) * 100;

    // Calculate average duration in minutes
    const durations = attempts
      .filter((attempt) => attempt.startTime && attempt.endTime)
      .map(
        (attempt) =>
          (new Date(attempt.endTime) - new Date(attempt.startTime)) /
          (1000 * 60)
      );

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
        : 0;

    // Question-specific statistics
    const questionStats = {};

    // Initialize question stats
    exam.questions.forEach((question, index) => {
      questionStats[question._id.toString()] = {
        questionNumber: index + 1,
        text:
          question.text.substring(0, 50) +
          (question.text.length > 50 ? "..." : ""),
        type: question.type,
        correctCount: 0,
        incorrectCount: 0,
        timeoutCount: 0,
        successRate: 0,
      };
    });

    // Process each attempt to gather question statistics
    attempts.forEach((attempt) => {
      attempt.answers.forEach((answer) => {
        const questionId = answer.questionId.toString();
        if (questionStats[questionId]) {
          if (answer.timeExpired) {
            questionStats[questionId].timeoutCount++;
          } else {
            // This is a simplified check - in a real app, you'd need to compare with correct answers
            const question = exam.questions.find(
              (q) => q._id.toString() === questionId
            );
            let isCorrect = false;

            if (question) {
              if (question.type === "direct") {
                // For direct questions, simple string comparison (in a real app, use tolerance)
                isCorrect =
                  String(answer.answer).toLowerCase() ===
                  String(question.correctAnswer).toLowerCase();
              } else if (question.type === "mcq") {
                // For MCQ, check if selected option is in correctOptions
                isCorrect = question.correctOptions.includes(answer.answer);
              }
            }

            if (isCorrect) {
              questionStats[questionId].correctCount++;
            } else {
              questionStats[questionId].incorrectCount++;
            }
          }
        }
      });
    });

    // Calculate success rate for each question
    Object.keys(questionStats).forEach((questionId) => {
      const stats = questionStats[questionId];
      const totalAnswers =
        stats.correctCount + stats.incorrectCount + stats.timeoutCount;
      stats.successRate =
        totalAnswers > 0 ? (stats.correctCount / totalAnswers) * 100 : 0;
    });

    res.status(200).json({
      success: true,
      statistics: {
        totalAttempts,
        averageScore,
        highestScore,
        lowestScore,
        medianScore,
        completionRate,
        averageDuration,
        questionStats: Object.values(questionStats),
      },
    });
  } catch (err) {
    console.error("Error fetching attempt statistics:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attempt statistics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
