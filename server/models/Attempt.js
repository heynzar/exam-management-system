const mongoose = require("mongoose");

// Schema for student answers to questions
const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // Can be string for direct questions or number for MCQ
    default: null,
  },
  timeExpired: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Schema for geolocation coordinates
const coordinatesSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
});

// Main attempt schema
const attemptSchema = new mongoose.Schema(
  {
    examId: {
      type: String, // Using the custom exam ID
      required: true,
      index: true, // Add index for faster lookups
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for faster lookups
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    coordinates: {
      type: coordinatesSchema,
      required: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating duration in minutes
attemptSchema.virtual("durationMinutes").get(function () {
  if (!this.endTime) return null;
  const durationMs = this.endTime - this.startTime;
  return Math.round(durationMs / (1000 * 60));
});

// Virtual for calculating the number of questions answered
attemptSchema.virtual("answeredCount").get(function () {
  return this.answers.filter((answer) => answer.answer !== null).length;
});

// Virtual for calculating the number of questions that timed out
attemptSchema.virtual("timeoutCount").get(function () {
  return this.answers.filter((answer) => answer.timeExpired).length;
});

// Pre-save middleware to set completed flag
attemptSchema.pre("save", function (next) {
  if (this.endTime && !this.completed) {
    this.completed = true;
  }
  next();
});

// Method to check if the attempt is in progress
attemptSchema.methods.isInProgress = function () {
  return !this.endTime;
};

// Method to check if the attempt is completed
attemptSchema.methods.isCompleted = function () {
  return !!this.endTime;
};

module.exports = mongoose.model("Attempt", attemptSchema);
