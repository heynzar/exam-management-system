import { fetchExamById } from "../api/exams.js";
import { fetchExamAttempts, fetchExamStatistics } from "../api/attempts.js";
import "../styles/statistics-page.css";

/**
 * Renders the exam statistics page
 * @param {string} examId - The ID of the exam to show statistics for
 */
export async function renderStatisticsPage(examId) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="statistics-page">
      <div class="loading">Loading statistics...</div>
    </div>
  `;

  try {
    // Fetch exam details, attempts, and statistics in parallel
    const [examResponse, attemptsResponse, statisticsResponse] =
      await Promise.all([
        fetchExamById(examId),
        fetchExamAttempts(examId),
        fetchExamStatistics(examId),
      ]);

    // Extract the exam object from the response
    const exam = examResponse.exam || examResponse;

    // Extract the attempts array from the response
    const attempts = attemptsResponse.attempts || attemptsResponse;

    // Extract the statistics object from the response
    const statistics = statisticsResponse.statistics || statisticsResponse;

    // Render the statistics page
    renderStatisticsContent(app, exam, statistics, attempts);
  } catch (error) {
    console.error("Error loading statistics:", error);
    app.querySelector(".statistics-page").innerHTML = `
      <div class="error-message">
        <h3>Error Loading Statistics</h3>
        <p>${
          error.message ||
          "Failed to load exam statistics. Please try again later."
        }</p>
        <button id="back-btn" class="secondary-btn">Back to Exam</button>
      </div>
    `;
    document.getElementById("back-btn").addEventListener("click", () => {
      history.pushState(null, "", `/teacher/exams/${examId}`);
      window.dispatchEvent(new Event("popstate"));
    });
  }
}

/**
 * Renders the statistics content
 * @param {HTMLElement} app - The app container element
 * @param {Object} exam - The exam object
 * @param {Object} statistics - The statistics from the backend
 * @param {Array} attempts - Array of attempt objects
 */
function renderStatisticsContent(app, exam, statistics, attempts) {
  app.innerHTML = `
    <div class="statistics-page">
      <header class="stats-header">
        <div class="breadcrumb">
          <a href="/teacher/exams" id="back-to-dashboard" data-link="spa">Dashboard</a> / 
          <a href="/teacher/exams/${
            exam.id || exam._id
          }" id="back-to-exam" data-link="spa">Exam Editor</a> / 
          <span>Statistics</span>
        </div>
        <h1>Exam Statistics: ${exam.title}</h1>
        <p class="exam-meta">
          <span class="exam-status ${exam.status}">${exam.status}</span>
          <span class="exam-audience">Target: ${exam.targetAudience}</span>
          <span class="exam-questions">Questions: ${
            exam.questions.length
          }</span>
        </p>
      </header>
      
      <main class="stats-content">
        ${statistics.totalAttempts === 0 ? renderNoAttemptsMessage() : ""}
        
        <section class="stats-overview">
          <h2>Overview</h2>
          <div class="stats-cards">
            <div class="stats-card">
              <div class="stats-card-header">Total Attempts</div>
              <div class="stats-card-value">${statistics.totalAttempts}</div>
            </div>
            <div class="stats-card">
              <div class="stats-card-header">Completion Rate</div>
              <div class="stats-card-value">${statistics.completionRate.toFixed(
                1
              )}%</div>
            </div>
            <div class="stats-card">
              <div class="stats-card-header">Average Score</div>
              <div class="stats-card-value">${statistics.averageScore.toFixed(
                1
              )}%</div>
            </div>
            <div class="stats-card">
              <div class="stats-card-header">Highest Score</div>
              <div class="stats-card-value">${statistics.highestScore.toFixed(
                1
              )}%</div>
            </div>
            <div class="stats-card">
              <div class="stats-card-header">Average Duration</div>
              <div class="stats-card-value">${formatDuration(
                statistics.averageDuration
              )}</div>
            </div>
          </div>
        </section>
        
        ${
          statistics.totalAttempts > 0
            ? `
          <section class="stats-distribution">
            <h2>Score Distribution</h2>
            <div class="score-chart">
              <div class="chart-container">
                ${renderScoreDistribution(statistics)}
              </div>
              <div class="chart-labels">
                <div class="chart-label excellent">80-100%</div>
                <div class="chart-label good">60-79%</div>
                <div class="chart-label average">40-59%</div>
                <div class="chart-label poor">0-39%</div>
              </div>
            </div>
          </section>
          
          <section class="stats-questions">
            <h2>Question Analysis</h2>
            <div class="question-filters">
              <button class="filter-btn active" data-filter="success-rate">Success Rate</button>
              <button class="filter-btn" data-filter="time-spent">Time Spent</button>
              <button class="filter-btn" data-filter="question-order">Question Order</button>
            </div>
            <div class="question-stats-container">
              ${renderQuestionStats(statistics.questionStats, exam.questions)}
            </div>
          </section>
          
          <section class="stats-attempts">
            <h2>Student Attempts</h2>
            <div class="attempts-table-container">
              <table class="attempts-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderAttemptsTable(attempts)}
                </tbody>
              </table>
            </div>
          </section>
        `
            : ""
        }
      </main>
    </div>
  `;

  // Set up event listeners
  setupEventListeners(exam);
}

/**
 * Renders the score distribution chart
 * @param {Object} statistics - The statistics object
 * @returns {string} - HTML for the score distribution chart
 */
function renderScoreDistribution(statistics) {
  // Calculate the counts for each score range
  const excellentCount = statistics.scores
    ? statistics.scores.filter((score) => score >= 80).length
    : 0;
  const goodCount = statistics.scores
    ? statistics.scores.filter((score) => score >= 60 && score < 80).length
    : 0;
  const averageCount = statistics.scores
    ? statistics.scores.filter((score) => score >= 40 && score < 60).length
    : 0;
  const poorCount = statistics.scores
    ? statistics.scores.filter((score) => score < 40).length
    : 0;

  const totalCount = statistics.completedAttempts || statistics.totalAttempts;

  return `
    <div class="chart-bar excellent" style="height: ${getPercentage(
      excellentCount,
      totalCount
    )}%">
      <span class="bar-value">${excellentCount}</span>
    </div>
    <div class="chart-bar good" style="height: ${getPercentage(
      goodCount,
      totalCount
    )}%">
      <span class="bar-value">${goodCount}</span>
    </div>
    <div class="chart-bar average" style="height: ${getPercentage(
      averageCount,
      totalCount
    )}%">
      <span class="bar-value">${averageCount}</span>
    </div>
    <div class="chart-bar poor" style="height: ${getPercentage(
      poorCount,
      totalCount
    )}%">
      <span class="bar-value">${poorCount}</span>
    </div>
  `;
}

/**
 * Renders the question statistics
 * @param {Array} questionStats - Array of question statistics from the backend
 * @param {Array} questions - Array of exam questions
 * @returns {string} - HTML string for question statistics
 */
function renderQuestionStats(questionStats, questions) {
  if (!questionStats || questionStats.length === 0) {
    return '<div class="no-data">No question data available</div>';
  }

  return `
    <div class="question-stats-grid">
      ${questionStats
        .map((stat) => {
          // Find the corresponding question to get additional details
          const question = questions.find(
            (q) =>
              q._id === stat.questionId ||
              q.questionNumber === stat.questionNumber
          );

          return `
          <div class="question-stat-card" data-question-id="${stat.questionId}">
            <div class="question-stat-header">
              <span class="question-number">Q${stat.questionNumber}</span>
              <span class="question-type ${stat.type}">${
            stat.type === "direct" ? "Direct" : "MCQ"
          }</span>
              <span class="question-points">${
                question ? question.points || 1 : 1
              } pts</span>
            </div>
            <div class="question-text">${truncateText(stat.text, 100)}</div>
            <div class="question-stat-metrics">
              <div class="metric success-rate">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">${stat.successRate.toFixed(1)}%</div>
                <div class="progress-bar">
                  <div class="progress-fill ${getSuccessRateClass(
                    stat.successRate
                  )}" style="width: ${stat.successRate}%"></div>
                </div>
              </div>
              <div class="metric time-spent">
                <div class="metric-label">Avg. Time</div>
                <div class="metric-value">${formatSeconds(
                  stat.averageTime || 0
                )}</div>
                <div class="time-indicator">
                  <div class="time-fill" style="width: ${getTimePercentage(
                    stat.averageTime || 0,
                    question ? question.timeLimit || 60 : 60
                  )}%"></div>
                </div>
              </div>
            </div>
            <div class="question-stat-details">
              <div class="detail-item">
                <span class="detail-label">Correct:</span>
                <span class="detail-value">${stat.correctCount}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Incorrect:</span>
                <span class="detail-value">${stat.incorrectCount}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Timeout:</span>
                <span class="detail-value">${stat.timeoutCount}</span>
              </div>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

/**
 * Renders a message when there are no attempts
 * @returns {string} - HTML string for no attempts message
 */
function renderNoAttemptsMessage() {
  return `
    <div class="no-attempts-message">
      <div class="message-icon">📊</div>
      <h3>No Exam Attempts Yet</h3>
      <p>Statistics will be available once students start taking the exam.</p>
    </div>
  `;
}

/**
 * Renders the attempts table
 * @param {Array} attempts - Array of attempt objects
 * @returns {string} - HTML string for attempts table
 */
function renderAttemptsTable(attempts) {
  if (!attempts || attempts.length === 0) {
    return '<tr><td colspan="6" class="no-data">No attempts recorded</td></tr>';
  }

  // Sort attempts by start time (newest first)
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.startTime) - new Date(a.startTime)
  );

  return sortedAttempts
    .map((attempt) => {
      const student = attempt.student || {
        firstName: "Unknown",
        lastName: "Student",
      };
      const startTime = new Date(attempt.startTime);
      const endTime = attempt.endTime ? new Date(attempt.endTime) : null;
      const duration = endTime ? (endTime - startTime) / (1000 * 60) : null; // in minutes

      return `
      <tr class="${attempt.completed ? "" : "in-progress"}">
        <td>${student.firstName} ${student.lastName}</td>
        <td>${formatDate(startTime)}</td>
        <td>${duration ? formatDuration(duration) : "In progress"}</td>
        <td class="${getScoreClass(attempt.score)}">${
        attempt.completed ? `${attempt.score}%` : "-"
      }</td>
        <td>${attempt.completed ? "Completed" : "In progress"}</td>
        <td>
          <button class="view-attempt-btn" data-attempt-id="${
            attempt._id
          }">View Details</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

/**
 * Set up event listeners for the statistics page
 * @param {Object} exam - The exam object
 */
function setupEventListeners(exam) {
  // Back to dashboard
  const backToDashboard = document.getElementById("back-to-dashboard");
  if (backToDashboard) {
    backToDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", "/teacher/exams");
      window.dispatchEvent(new Event("popstate"));
    });
  }

  // Back to exam
  const backToExam = document.getElementById("back-to-exam");
  if (backToExam) {
    backToExam.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", `/teacher/exams/${exam.id || exam._id}`);
      window.dispatchEvent(new Event("popstate"));
    });
  }

  // Question filters
  const filterButtons = document.querySelectorAll(".filter-btn");
  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove active class from all buttons
        filterButtons.forEach((b) => b.classList.remove("active"));

        // Add active class to clicked button
        btn.classList.add("active");

        // Get the filter type
        const filterType = btn.dataset.filter;

        // Apply the filter
        applyQuestionFilter(filterType);
      });
    });
  }

  // View attempt details
  const viewAttemptButtons = document.querySelectorAll(".view-attempt-btn");
  if (viewAttemptButtons.length > 0) {
    viewAttemptButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const attemptId = btn.dataset.attemptId;
        showAttemptDetailsModal(attemptId);
      });
    });
  }
}

/**
 * Apply a filter to the question statistics
 * @param {string} filterType - The type of filter to apply
 */
function applyQuestionFilter(filterType) {
  const container = document.querySelector(".question-stats-grid");
  if (!container) return;

  const cards = Array.from(container.querySelectorAll(".question-stat-card"));

  // Sort the cards based on the filter type
  let sortedCards;

  switch (filterType) {
    case "success-rate":
      sortedCards = cards.sort((a, b) => {
        const aRate = parseFloat(
          a.querySelector(".success-rate .metric-value").textContent
        );
        const bRate = parseFloat(
          b.querySelector(".success-rate .metric-value").textContent
        );
        return bRate - aRate; // Highest first
      });
      break;
    case "time-spent":
      sortedCards = cards.sort((a, b) => {
        const aTime = parseTimeString(
          a.querySelector(".time-spent .metric-value").textContent
        );
        const bTime = parseTimeString(
          b.querySelector(".time-spent .metric-value").textContent
        );
        return bTime - aTime; // Longest first
      });
      break;
    case "question-order":
      sortedCards = cards.sort((a, b) => {
        const aNum = parseInt(
          a.querySelector(".question-number").textContent.substring(1)
        );
        const bNum = parseInt(
          b.querySelector(".question-number").textContent.substring(1)
        );
        return aNum - bNum; // Ascending order
      });
      break;
    default:
      sortedCards = cards;
  }

  // Remove all cards from the container
  cards.forEach((card) => card.remove());

  // Add the sorted cards back to the container
  sortedCards.forEach((card) => container.appendChild(card));

  // Add animation class
  container.classList.add("filtered");
  setTimeout(() => {
    container.classList.remove("filtered");
  }, 500);
}

/**
 * Show a modal with attempt details
 * @param {string} attemptId - The ID of the attempt to show
 */
function showAttemptDetailsModal(attemptId) {
  // In a real implementation, you would fetch the attempt details from the API
  // For now, we'll just show a placeholder modal

  const modal = document.createElement("div");
  modal.className = "modal attempt-details-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <h2>Attempt Details</h2>
      <p>Detailed view for attempt ${attemptId} would be shown here.</p>
      <p>This would include:</p>
      <ul>
        <li>Student information</li>
        <li>Detailed answers for each question</li>
        <li>Time spent on each question</li>
        <li>Geolocation data</li>
        <li>Score breakdown</li>
      </ul>
      <div class="modal-actions">
        <button class="close-modal-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Show the modal
  setTimeout(() => {
    modal.classList.add("visible");
  }, 10);

  // Set up event listeners
  const closeBtn = modal.querySelector(".close-btn");
  const closeModalBtn = modal.querySelector(".close-modal-btn");

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("visible");
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    }
  });
}

/**
 * Helper function to get percentage for chart bars
 * @param {number} value - The value
 * @param {number} total - The total
 * @returns {number} - The percentage (max 100)
 */
function getPercentage(value, total) {
  if (total === 0) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

/**
 * Helper function to get time percentage
 * @param {number} timeSpent - Time spent in seconds
 * @param {number} timeLimit - Time limit in seconds
 * @returns {number} - The percentage (max 100)
 */
function getTimePercentage(timeSpent, timeLimit) {
  if (timeLimit === 0) return 0;
  return Math.min(Math.round((timeSpent / timeLimit) * 100), 100);
}

/**
 * Helper function to get success rate class
 * @param {number} rate - The success rate
 * @returns {string} - The CSS class
 */
function getSuccessRateClass(rate) {
  if (rate >= 80) return "excellent";
  if (rate >= 60) return "good";
  if (rate >= 40) return "average";
  return "poor";
}

/**
 * Helper function to get score class
 * @param {number} score - The score
 * @returns {string} - The CSS class
 */
function getScoreClass(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "poor";
}

/**
 * Helper function to format duration in minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration
 */
function formatDuration(minutes) {
  if (minutes < 1) return "Less than a minute";

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} min${mins !== 1 ? "s" : ""}`;
  } else {
    return `${hours} hr${hours !== 1 ? "s" : ""} ${mins} min${
      mins !== 1 ? "s" : ""
    }`;
  }
}

/**
 * Helper function to format seconds
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time
 */
function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins === 0) {
    return `${secs}s`;
  } else {
    return `${mins}m ${secs}s`;
  }
}

/**
 * Helper function to format date
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

/**
 * Helper function to truncate text
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Helper function to parse time string
 * @param {string} timeString - Time string like "2m 30s"
 * @returns {number} - Time in seconds
 */
function parseTimeString(timeString) {
  let seconds = 0;

  // Match minutes
  const minutesMatch = timeString.match(/(\d+)m/);
  if (minutesMatch) {
    seconds += parseInt(minutesMatch[1]) * 60;
  }

  // Match seconds
  const secondsMatch = timeString.match(/(\d+)s/);
  if (secondsMatch) {
    seconds += parseInt(secondsMatch[1]);
  }

  return seconds;
}
