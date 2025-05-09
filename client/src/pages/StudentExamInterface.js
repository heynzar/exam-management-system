import { fetchExamById } from "../api/exams.js";
import { fetchQuestionsByExamId } from "../api/questions.js";
import { submitExamAttempt } from "../api/attempts.js";
import "../styles/student-exam.css";

/**
 * Renders the student exam view
 * @param {string} examId - The ID of the exam to take
 */
export async function renderStudentExam(examId) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="student-exam">
      <div class="loading">Loading exam details...</div>
    </div>
  `;

  try {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      // Redirect to login page with return URL
      const currentPath = window.location.pathname;
      history.pushState(
        null,
        "",
        `/?redirect=${encodeURIComponent(currentPath)}`
      );
      window.dispatchEvent(new Event("popstate"));
      return;
    }

    // Fetch exam details and questions in parallel
    const [examResponse, questionsResponse] = await Promise.all([
      fetchExamById(examId),
      fetchQuestionsByExamId(examId),
    ]);

    // Extract the exam object from the response
    const exam = examResponse.exam || examResponse;

    // Store questions from the separate API call
    exam.questions = Array.isArray(questionsResponse) ? questionsResponse : [];

    // Render the exam intro page
    renderExamIntro(app, exam);
  } catch (error) {
    console.error("Error loading exam:", error);
    app.querySelector(".student-exam").innerHTML = `
      <div class="error-message">
        <h3>Error Loading Exam</h3>
        <p>${
          error.message ||
          "Failed to load exam details. Please try again later."
        }</p>
        <button id="back-btn" class="secondary-btn">Back to Dashboard</button>
      </div>
    `;
    document.getElementById("back-btn").addEventListener("click", () => {
      history.pushState(null, "", "/student/exams");
      window.dispatchEvent(new Event("popstate"));
    });
  }
}

/**
 * Renders the exam introduction page
 * @param {HTMLElement} app - The app container element
 * @param {Object} exam - The exam object with questions
 */
function renderExamIntro(app, exam) {
  app.innerHTML = `
    <div class="student-exam">
      <header class="exam-header">
        <h1>${exam.title}</h1>
        <div class="exam-meta">
          <span class="exam-audience">Target: ${exam.targetAudience}</span>
          <span class="exam-duration">Duration: ${
            exam.durationMinutes
          } minutes</span>
          <span class="exam-questions">Questions: ${
            exam.questions.length
          }</span>
          <span class="exam-points">Total Points: ${calculateTotalPoints(
            exam.questions
          )}</span>
        </div>
        <p class="exam-description">${
          exam.description || "No description provided"
        }</p>
      </header>
      
      <div class="exam-instructions">
        <h2>Instructions</h2>
        <ul>
          <li>This exam contains ${
            exam.questions.length
          } questions and has a time limit of ${
    exam.durationMinutes
  } minutes.</li>
          <li>Once you start the exam, the timer will begin and cannot be paused.</li>
          <li>Each question has its own time limit. If you don't answer within the time limit, the question will be marked as incorrect.</li>
          <li>You must enable location access when prompted to proceed with the exam.</li>
          <li>Do not refresh the page or navigate away during the exam, or your progress may be lost.</li>
          <li>Click the "Start Exam" button when you are ready to begin.</li>
        </ul>
      </div>
      
      <div class="exam-actions">
        <button id="start-exam-btn" class="primary-btn">Start Exam</button>
      </div>
    </div>
  `;

  // Set up event listener for start button
  document.getElementById("start-exam-btn").addEventListener("click", () => {
    requestGeolocation(exam);
  });
}

/**
 * Request geolocation permission before starting the exam
 * @param {Object} exam - The exam object
 */
function requestGeolocation(exam) {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="student-exam">
      <div class="geolocation-request">
        <h2>Location Access Required</h2>
        <p>This exam requires access to your location for verification purposes.</p>
        <p>Please click "Allow" when prompted by your browser.</p>
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - store coordinates
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Start the exam with the coordinates
        startExam(exam, coordinates);
      },
      (error) => {
        // Error - show message
        app.innerHTML = `
          <div class="student-exam">
            <div class="error-message">
              <h3>Location Access Denied</h3>
              <p>You must allow location access to take this exam. Please refresh the page and try again.</p>
              <p>Error: ${error.message}</p>
              <button id="retry-btn" class="primary-btn">Retry</button>
            </div>
          </div>
        `;

        document.getElementById("retry-btn").addEventListener("click", () => {
          requestGeolocation(exam);
        });
      }
    );
  } else {
    // Geolocation not supported
    app.innerHTML = `
      <div class="student-exam">
        <div class="error-message">
          <h3>Geolocation Not Supported</h3>
          <p>Your browser does not support geolocation, which is required for this exam.</p>
          <p>Please try using a different browser or device.</p>
          <button id="back-btn" class="secondary-btn">Back</button>
        </div>
      </div>
    `;

    document.getElementById("back-btn").addEventListener("click", () => {
      renderExamIntro(app, exam);
    });
  }
}

/**
 * Start the exam and show the first question
 * @param {Object} exam - The exam object
 * @param {Object} coordinates - The user's geolocation coordinates
 */
function startExam(exam, coordinates) {
  // Initialize exam state
  const examState = {
    examId: exam._id || exam.id,
    startTime: new Date(),
    endTime: null,
    coordinates: coordinates,
    currentQuestionIndex: 0,
    answers: [],
    timeRemaining: exam.durationMinutes * 60, // in seconds
    examTimer: null,
  };

  // Start the exam timer
  examState.examTimer = setInterval(() => {
    examState.timeRemaining--;
    updateExamTimer(examState.timeRemaining);

    if (examState.timeRemaining <= 0) {
      // Time's up - end the exam
      clearInterval(examState.examTimer);
      finishExam(exam, examState);
    }
  }, 1000);

  // Show the first question
  showQuestion(exam, examState);
}

/**
 * Show a question to the student
 * @param {Object} exam - The exam object
 * @param {Object} examState - The current exam state
 */
function showQuestion(exam, examState) {
  const app = document.getElementById("app");
  const question = exam.questions[examState.currentQuestionIndex];

  if (!question) {
    // No more questions - finish the exam
    finishExam(exam, examState);
    return;
  }

  // Initialize question timer
  let questionTimeRemaining = question.timeLimit;
  let questionTimer;

  // Prepare the question HTML based on type
  let questionContentHTML = "";

  if (question.type === "direct") {
    questionContentHTML = `
      <div class="question-input">
        <input type="text" id="direct-answer" placeholder="Enter your answer" autocomplete="off">
      </div>
    `;
  } else if (question.type === "mcq") {
    questionContentHTML = `
      <div class="question-options">
        ${question.options
          .map(
            (option, index) => `
          <div class="option-item">
            <input type="radio" name="mcq-option" id="option-${index}" value="${index}">
            <label for="option-${index}">${option}</label>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Render the question
  app.innerHTML = `
    <div class="student-exam question-view">
      <header class="exam-header">
        <div class="exam-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${
              (examState.currentQuestionIndex / exam.questions.length) * 100
            }%"></div>
          </div>
          <span class="progress-text">Question ${
            examState.currentQuestionIndex + 1
          } of ${exam.questions.length}</span>
        </div>
        <div class="timers">
          <div class="exam-timer">
            <span>Exam Time: </span>
            <span id="exam-time-remaining">${formatTime(
              examState.timeRemaining
            )}</span>
          </div>
          <div class="question-timer">
            <span>Question Time: </span>
            <span id="question-time-remaining">${formatTime(
              questionTimeRemaining
            )}</span>
          </div>
        </div>
      </header>
      
      <main class="question-container">
        <div class="question-header">
          <span class="question-points">${question.points} points</span>
          <span class="question-type">${
            question.type === "direct" ? "Direct Question" : "Multiple Choice"
          }</span>
        </div>
        
        <div class="question-text">
          <p>${question.text}</p>
        </div>
        
        ${question.attachment ? renderAttachment(question.attachment) : ""}
        
        <div class="question-form">
          ${questionContentHTML}
        </div>
        
        <div class="question-actions">
          <button id="submit-answer-btn" class="primary-btn">Submit Answer</button>
        </div>
      </main>
    </div>
  `;

  // Start question timer
  questionTimer = setInterval(() => {
    questionTimeRemaining--;
    document.getElementById("question-time-remaining").textContent = formatTime(
      questionTimeRemaining
    );

    if (questionTimeRemaining <= 0) {
      // Time's up for this question
      clearInterval(questionTimer);

      // Record a blank answer (time expired)
      recordAnswer(exam, examState, question, null, true);

      // Move to next question
      examState.currentQuestionIndex++;
      showQuestion(exam, examState);
    }
  }, 1000);

  // Set up event listener for submit button
  document.getElementById("submit-answer-btn").addEventListener("click", () => {
    // Stop the question timer
    clearInterval(questionTimer);

    // Get the answer based on question type
    let answer = null;

    if (question.type === "direct") {
      answer = document.getElementById("direct-answer").value.trim();
    } else if (question.type === "mcq") {
      const selectedOption = document.querySelector(
        'input[name="mcq-option"]:checked'
      );
      if (selectedOption) {
        answer = parseInt(selectedOption.value);
      }
    }

    // Record the answer
    recordAnswer(exam, examState, question, answer, false);

    // Move to next question
    examState.currentQuestionIndex++;
    showQuestion(exam, examState);
  });
}

/**
 * Record an answer in the exam state
 * @param {Object} exam - The exam object
 * @param {Object} examState - The current exam state
 * @param {Object} question - The current question
 * @param {*} answer - The student's answer
 * @param {boolean} timeExpired - Whether the time expired before answering
 */
function recordAnswer(exam, examState, question, answer, timeExpired) {
  examState.answers.push({
    questionId: question._id,
    answer: answer,
    timeExpired: timeExpired,
    timestamp: new Date(),
  });
}

/**
 * Finish the exam and calculate the score
 * @param {Object} exam - The exam object
 * @param {Object} examState - The current exam state
 */
function finishExam(exam, examState) {
  // Clear any remaining timers
  if (examState.examTimer) {
    clearInterval(examState.examTimer);
  }

  // Set the end time
  examState.endTime = new Date();

  // Calculate the score
  const score = calculateScore(exam.questions, examState.answers);
  const percentage = Math.round(
    (score.totalScore / score.maxPossibleScore) * 100
  );

  const app = document.getElementById("app");

  // Show the results
  app.innerHTML = `
    <div class="student-exam results-view">
      <header class="exam-header">
        <h1>Exam Completed</h1>
      </header>
      
      <main class="results-container">
        <div class="score-display">
          <div class="score-circle ${getScoreClass(percentage)}">
            <span class="score-percentage">${percentage}%</span>
          </div>
          <div class="score-details">
            <p>You scored ${score.totalScore} out of ${
    score.maxPossibleScore
  } points</p>
            <p>Time taken: ${formatDuration(
              examState.startTime,
              examState.endTime
            )}</p>
          </div>
        </div>
        
        <div class="results-summary">
          <h2>Summary</h2>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">Total Questions:</span>
              <span class="stat-value">${exam.questions.length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Answered:</span>
              <span class="stat-value">${examState.answers.length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Correct:</span>
              <span class="stat-value">${score.correctAnswers}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Incorrect:</span>
              <span class="stat-value">${score.incorrectAnswers}</span>
            </div>
          </div>
        </div>
        
        <div class="results-actions">
          <button id="back-to-dashboard-btn" class="primary-btn">Back to Dashboard</button>
        </div>
      </main>
    </div>
  `;

  // Submit the exam attempt to the server
  submitExamAttempt({
    examId: exam.id,
    startTime: examState.startTime,
    endTime: examState.endTime,
    coordinates: examState.coordinates,
    answers: examState.answers,
    score: percentage,
  }).catch((error) => {
    console.error("Error submitting exam attempt:", error);
    showNotification(
      "Your results have been saved locally, but there was an error submitting them to the server.",
      "error"
    );
  });

  // Set up event listener for back button
  document
    .getElementById("back-to-dashboard-btn")
    .addEventListener("click", () => {
      history.pushState(null, "", "/student/exams");
      window.dispatchEvent(new Event("popstate"));
    });
}

/**
 * Calculate the score for the exam
 * @param {Array} questions - The exam questions
 * @param {Array} answers - The student's answers
 * @returns {Object} - Score details
 */
function calculateScore(questions, answers) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;

  // Create a map of question IDs to answers for easy lookup
  const answerMap = {};
  answers.forEach((answer) => {
    answerMap[answer.questionId] = answer;
  });

  // Calculate score for each question
  questions.forEach((question) => {
    const points = question.points || 1;
    maxPossibleScore += points;

    const studentAnswer = answerMap[question._id];

    // If no answer or time expired, it's incorrect
    if (!studentAnswer || studentAnswer.timeExpired) {
      incorrectAnswers++;
      return;
    }

    let isCorrect = false;

    if (question.type === "direct") {
      // For direct questions, check if the answer matches within tolerance
      const studentValue = studentAnswer.answer.toLowerCase();
      const correctValue = question.correctAnswer.toLowerCase();

      if (isNumeric(studentValue) && isNumeric(correctValue)) {
        // Numeric comparison with tolerance
        const studentNum = parseFloat(studentValue);
        const correctNum = parseFloat(correctValue);
        const tolerance = question.tolerance || 0;

        const percentDiff =
          Math.abs((studentNum - correctNum) / correctNum) * 100;
        isCorrect = percentDiff <= tolerance;
      } else {
        // String comparison
        isCorrect = studentValue === correctValue;
      }
    } else if (question.type === "mcq") {
      // For MCQ, check if the selected option is in the correct options
      isCorrect = question.correctOptions.includes(studentAnswer.answer);
    }

    if (isCorrect) {
      totalScore += points;
      correctAnswers++;
    } else {
      incorrectAnswers++;
    }
  });

  return {
    totalScore,
    maxPossibleScore,
    correctAnswers,
    incorrectAnswers,
  };
}

/**
 * Check if a string is a numeric value
 * @param {string} str - The string to check
 * @returns {boolean} - Whether the string is numeric
 */
function isNumeric(str) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}

/**
 * Get the CSS class for a score percentage
 * @param {number} percentage - The score percentage
 * @returns {string} - The CSS class
 */
function getScoreClass(percentage) {
  if (percentage >= 80) return "excellent";
  if (percentage >= 60) return "good";
  if (percentage >= 40) return "average";
  return "poor";
}

/**
 * Format a time duration between two dates
 * @param {Date} startTime - The start time
 * @param {Date} endTime - The end time
 * @returns {string} - Formatted duration
 */
function formatDuration(startTime, endTime) {
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Update the exam timer display
 * @param {number} timeRemaining - Time remaining in seconds
 */
function updateExamTimer(timeRemaining) {
  const timerElement = document.getElementById("exam-time-remaining");
  if (timerElement) {
    timerElement.textContent = formatTime(timeRemaining);

    // Add warning class when time is running low
    if (timeRemaining <= 300) {
      // 5 minutes
      timerElement.classList.add("time-warning");
    }
    if (timeRemaining <= 60) {
      // 1 minute
      timerElement.classList.add("time-critical");
    }
  }
}

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Calculate total points for the exam questions
 * @param {Array} questions - Array of question objects
 * @returns {number} - Total points
 */
function calculateTotalPoints(questions) {
  if (!questions || !Array.isArray(questions)) return 0;
  return questions.reduce(
    (total, question) => total + (question.points || 1),
    0
  );
}

/**
 * Renders an attachment based on its type
 * @param {Object} attachment - The attachment object
 * @returns {string} - HTML string of the attachment
 */
function renderAttachment(attachment) {
  if (!attachment) return "";

  switch (attachment.type) {
    case "image":
      return `
        <div class="attachment image-attachment">
          <img src="${attachment.url}" alt="Question attachment" class="question-image">
        </div>
      `;
    case "audio":
      return `
        <div class="attachment audio-attachment">
          <audio controls>
            <source src="${attachment.url}" type="audio/mpeg">
            Your browser does not support audio
          </audio>
        </div>
      `;
    case "video":
      return `
        <div class="attachment video-attachment">
          <video controls>
            <source src="${attachment.url}" type="video/mp4">
            Your browser does not support video
          </video>
        </div>
      `;
    default:
      return "";
  }
}

/**
 * Shows a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = "info") {
  // Check if notification container exists, create if not
  let notificationContainer = document.querySelector(".notification-container");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.className = "notification-container";
    document.body.appendChild(notificationContainer);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;

  // Add to container
  notificationContainer.appendChild(notification);

  // Add close button functionality
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        notificationContainer.removeChild(notification);
      }, 300);
    });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentNode) {
          notificationContainer.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}
