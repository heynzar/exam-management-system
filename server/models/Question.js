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

const questionSchema = new mongoose.Schema(
  {
    examId: {
      type: String, // Changed from ObjectId to String to support custom exam IDs
      required: true,
    },
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

// Validate that direct questions have correctAnswer set
questionSchema.pre("save", function (next) {
  if (this.type === "direct" && !this.correctAnswer) {
    return next(new Error("Direct questions must have a correct answer"));
  }

  // Validate that MCQ questions have options and correctOptions
  if (this.type === "mcq") {
    if (!this.options || this.options.length < 2) {
      return next(new Error("MCQ questions must have at least 2 options"));
    }
    if (!this.correctOptions || this.correctOptions.length < 1) {
      return next(
        new Error("MCQ questions must have at least 1 correct option")
      );
    }
    // Validate that all correctOptions are valid indices of options array
    for (const index of this.correctOptions) {
      if (index < 0 || index >= this.options.length) {
        return next(new Error("Invalid correct option index"));
      }
    }
  }

  next();
});

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
