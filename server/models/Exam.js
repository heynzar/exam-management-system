const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["image", "audio", "video"],
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["direct", "mcq"],
    required: true,
  },
  points: {
    type: Number,
    default: 1,
    min: 1,
  },
  timeLimit: {
    type: Number,
    default: 60,
    min: 15,
  },
  attachment: {
    type: attachmentSchema,
    default: null,
  },
  // For direct questions
  correctAnswer: {
    type: String,
  },
  tolerance: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
  },
  // For MCQ questions
  options: [
    {
      type: String,
    },
  ],
  correctOptions: [
    {
      type: Number,
    },
  ],
});

const examSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true, // Add index for faster lookups
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetAudience: {
      type: String,
      required: true,
      trim: true,
    },
    questions: [questionSchema],
    scheduledAt: Date,
    durationMinutes: {
      type: Number,
      min: 1,
      max: 480, // Limit to 8 hours
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed", "archived"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for getting the total number of questions
examSchema.virtual("questionCount").get(function () {
  return this.questions.length;
});

// Virtual for getting the total possible points
examSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce(
    (total, question) => total + (question.points || 1),
    0
  );
});

// Pre-save middleware to update the updatedAt field
examSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add validation for embedded questions
examSchema.pre("save", function (next) {
  if (!this.questions || this.questions.length === 0) {
    return next();
  }

  for (const question of this.questions) {
    // Validate direct questions
    if (question.type === "direct" && !question.correctAnswer) {
      return next(new Error("Direct questions must have a correct answer"));
    }

    // Validate MCQ questions
    if (question.type === "mcq") {
      if (!question.options || question.options.length < 2) {
        return next(new Error("MCQ questions must have at least 2 options"));
      }
      if (!question.correctOptions || question.correctOptions.length < 1) {
        return next(
          new Error("MCQ questions must have at least 1 correct option")
        );
      }
      // Validate that all correctOptions are valid indices of options array
      for (const index of question.correctOptions) {
        if (index < 0 || index >= question.options.length) {
          return next(new Error("Invalid correct option index"));
        }
      }
    }
  }

  next();
});

module.exports = mongoose.model("Exam", examSchema);
