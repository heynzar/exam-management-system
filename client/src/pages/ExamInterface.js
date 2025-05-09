import { fetchExamById, deleteExam, updateExam } from "../api/exams.js";
import {
  createQuestion,
  fetchQuestionsByExamId,
  deleteQuestion,
  updateQuestion,
  uploadQuestionAttachment,
  fetchQuestionById,
} from "../api/questions.js";
import "../styles/exam-interface.css";

/**
 * Renders the exam editor interface
 * @param {string} examId - The ID of the exam to edit
 */
export async function renderExamEditor(examId) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="exam-editor">
      <div class="loading">Loading exam details...</div>
    </div>
  `;

  try {
    // Store the original examId for later use
    const originalExamId = examId;

    // Fetch exam details and questions in parallel
    const [examResponse, questionsResponse] = await Promise.all([
      fetchExamById(examId),
      fetchQuestionsByExamId(examId),
    ]);

    // Extract the exam object from the response
    const exam = examResponse.exam || examResponse;

    // Store the original ID to use for API calls
    exam.originalId = originalExamId;

    // Ensure the exam has an ID property
    if (!exam._id && !exam.examId) {
      exam.examId = examId;
    }

    // Store questions from the separate API call
    exam.questions = Array.isArray(questionsResponse) ? questionsResponse : [];

    renderExamDetails(app, exam);
  } catch (error) {
    console.error("Error loading exam:", error);
    app.querySelector(".exam-editor").innerHTML = `
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
      history.pushState(null, "", "/teacher/exams");
      window.dispatchEvent(new Event("popstate"));
    });
  }
}

/**
 * Renders the exam details and questions
 * @param {HTMLElement} app - The app container element
 * @param {Object} exam - The exam object with questions
 */
function renderExamDetails(app, exam) {
  // Make sure we have the examId available - use the original ID that worked with the API
  const examId = exam.originalId || exam._id || exam.examId || exam.id;

  app.innerHTML = `
    <div class="exam-editor">
      <header class="exam-header">
        <div class="breadcrumb">
          <a href="/teacher/exams" id="back-to-dashboard" data-link="spa">Dashboard</a> / <span>Exam Editor</span>
        </div>
        <div class="exam-title-section">
          <h1>${exam.title}</h1>
          <span class="exam-status ${exam.status}">${exam.status}</span>
        </div>
        <div class="exam-meta">
          <span class="exam-audience">Target: ${exam.targetAudience}</span>
          <span class="exam-date">Created: ${new Date(
            exam.createdAt
          ).toLocaleDateString()}</span>
          ${
            exam.scheduledAt
              ? `<span class="exam-scheduled">Scheduled: ${new Date(
                  exam.scheduledAt
                ).toLocaleString()}</span>`
              : ""
          }
        </div>
        <p class="exam-description">${
          exam.description || "No description provided"
        }</p>
        
      

        <div class="exam-actions-header">
          <button id="publish-exam-btn" class="primary-btn ${
            exam.status === "published" ? "published" : ""
          }">
            ${exam.status === "published" ? "Published ✓" : "Publish Exam"}
          </button>
          ${
            exam.status === "published"
              ? `<button id="view-statistics-btn" class="stats-btn">View Statistics</button>`
              : ""
          }
          <button id="delete-exam-btn" class="danger-btn">Delete Exam</button>
        </div>
        
        ${
          exam.status === "published"
            ? `
          <div class="exam-share-link">
            <p>Share this link with your students:</p>
            <div class="link-container">
              <input type="text" readonly value="${
                window.location.origin
              }/exam/${exam.id || exam._id}" id="share-link">
              <button id="copy-link-btn" class="secondary-btn">Copy</button>
            </div>
          </div>
        `
            : ""
        }
      </header>
      
      <main class="exam-content">
        <div class="exam-actions">
          <button id="add-question-btn" class="primary-btn">Add Question</button>
          <div class="exam-stats">
            <span class="question-count">${
              exam.questions.length
            } questions</span>
            <span class="total-points">${calculateTotalPoints(
              exam.questions
            )} total points</span>
            ${
              exam.durationMinutes
                ? `<span class="duration">${exam.durationMinutes} minutes</span>`
                : ""
            }
          </div>
        </div>
        
        <div id="questions-container" class="questions-container">
          ${renderQuestionsList(exam.questions)}
        </div>
      </main>
    </div>
  `;

  // Set up event listeners
  setupEventListeners(exam);
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
 * Renders the list of questions
 * @param {Array} questions - Array of question objects
 * @returns {string} - HTML string of question cards
 */
function renderQuestionsList(questions) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No questions added yet</h3>
        <p>Click the "Add Question" button to create your first question.</p>
      </div>
    `;
  }

  return questions
    .map(
      (question, index) => `
    <div class="question-card" data-id="${question._id}">
      <div class="question-header">
        <span class="question-number">Q${index + 1}</span>
        <span class="question-type ${question.type}">${
        question.type === "direct" ? "Direct" : "MCQ"
      }</span>
        <span class="question-points">${question.points} pts</span>
        <span class="question-time">${question.timeLimit}s</span>
      </div>
      <div class="question-content">
        <p>${question.text}</p>
        ${question.attachment ? renderAttachment(question.attachment) : ""}
        
        ${renderQuestionDetails(question)}
      </div>
      <div class="question-actions">
        <button class="edit-btn" data-id="${question._id}">Edit</button>
        <button class="delete-btn" data-id="${question._id}">Delete</button>
      </div>
    </div>
  `
    )
    .join("");
}

/**
 * Renders question-specific details based on type
 * @param {Object} question - The question object
 * @returns {string} - HTML string of question details
 */
function renderQuestionDetails(question) {
  if (question.type === "direct") {
    return `
      <div class="question-details">
        <div class="answer-preview">
          <strong>Correct Answer:</strong> ${question.correctAnswer}
          ${
            question.tolerance
              ? `<span>(Tolerance: ${question.tolerance}%)</span>`
              : ""
          }
        </div>
      </div>
    `;
  } else if (question.type === "mcq") {
    return `
      <div class="question-details">
        <div class="options-list">
          ${question.options
            .map(
              (option, index) => `
            <div class="option ${
              question.correctOptions.includes(index) ? "correct" : ""
            }">
              <span class="option-marker">${String.fromCharCode(
                65 + index
              )}</span>
              <span class="option-text">${option}</span>
              ${
                question.correctOptions.includes(index)
                  ? '<span class="correct-marker">✓</span>'
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
  return "";
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
 * Sets up all event listeners for the exam interface
 * @param {Object} exam - The exam object
 */
function setupEventListeners(exam) {
  // Store the exam ID that works with the API
  const examId = exam.originalId || exam._id || exam.examId || exam.id;

  // Back to dashboard
  document
    .getElementById("back-to-dashboard")
    .addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", "/teacher/exams");
      window.dispatchEvent(new Event("popstate"));
    });

  // View Statistics button (only for published exams)
  const viewStatsBtn = document.getElementById("view-statistics-btn");
  if (viewStatsBtn) {
    viewStatsBtn.addEventListener("click", () => {
      history.pushState(null, "", `/teacher/exams/${examId}/statistics`);
      window.dispatchEvent(new Event("popstate"));
    });
  }

  // Delete Exam button
  document.getElementById("delete-exam-btn").addEventListener("click", () => {
    showDeleteExamDialog(examId);
  });

  // Publish Exam button
  document
    .getElementById("publish-exam-btn")
    .addEventListener("click", async () => {
      if (exam.status === "published") {
        // Already published, show the share link
        const shareLink = document.querySelector(".exam-share-link");
        if (shareLink) {
          shareLink.classList.add("highlight");
          setTimeout(() => {
            shareLink.classList.remove("highlight");
          }, 1500);
        }
        return;
      }

      // Show confirmation dialog before publishing
      showPublishExamDialog(examId, exam);
    });

  // Copy link button
  const copyLinkBtn = document.getElementById("copy-link-btn");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      const shareLink = document.getElementById("share-link");
      shareLink.select();
      document.execCommand("copy");

      // Change button text temporarily
      const originalText = copyLinkBtn.textContent;
      copyLinkBtn.textContent = "Copied!";
      setTimeout(() => {
        copyLinkBtn.textContent = originalText;
      }, 2000);
    });
  }

  // Add question button
  const addQuestionBtn = document.getElementById("add-question-btn");
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", () => {
      console.log("Add question button clicked");
      openQuestionDialog(null, examId);
    });
  } else {
    console.error("Add question button not found");
  }

  // Edit question buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const questionId = btn.dataset.id;
      try {
        // Fetch the latest question data
        const response = await fetchQuestionById(questionId);
        const question = response.question || response;

        if (question) {
          openQuestionDialog(question, examId);
        } else {
          throw new Error("Question data not found");
        }
      } catch (error) {
        console.error("Error fetching question:", error);
        showNotification(
          "Failed to load question details: " + error.message,
          "error"
        );
      }
    });
  });

  // Delete question buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      // Create a custom confirmation dialog
      const confirmDialog = document.createElement("div");
      confirmDialog.className = "confirm-dialog-overlay";
      confirmDialog.innerHTML = `
        <div class="confirm-dialog">
          <h3>Delete Question</h3>
          <p>Are you sure you want to delete this question? This action cannot be undone.</p>
          <div class="confirm-actions">
            <button class="cancel-delete secondary-btn">Cancel</button>
            <button class="confirm-delete primary-btn">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      // Add event listeners to the dialog buttons
      confirmDialog
        .querySelector(".cancel-delete")
        .addEventListener("click", () => {
          document.body.removeChild(confirmDialog);
        });

      confirmDialog
        .querySelector(".confirm-delete")
        .addEventListener("click", async () => {
          document.body.removeChild(confirmDialog);

          try {
            const questionId = btn.dataset.id;
            await deleteQuestion(questionId);
            showNotification("Question deleted successfully", "success");

            // Use the stored exam ID that works with the API
            await renderExamEditor(examId);
          } catch (error) {
            console.error("Error deleting question:", error);
            showNotification(
              "Failed to delete question: " + error.message,
              "error"
            );
          }
        });
    });
  });

  // Modal close button
  // document.querySelector(".close-btn").addEventListener("click", () => {
  //   closeQuestionDialog()
  // })

  // Close modal when clicking outside
  // document.getElementById("question-dialog").addEventListener("click", (e) => {
  //   if (e.target === document.getElementById("question-dialog")) {
  //     closeQuestionDialog()
  //   }
  // })
}

/**
 * Shows a dialog to confirm exam deletion
 * @param {string} examId - The ID of the exam to delete
 */
function showDeleteExamDialog(examId) {
  const confirmDialog = document.createElement("div");
  confirmDialog.className = "confirm-dialog-overlay";
  confirmDialog.innerHTML = `
    <div class="confirm-dialog delete-exam-dialog">
      <h3>Delete Exam</h3>
      <p>Are you sure you want to delete this entire exam and all its questions? This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="cancel-delete secondary-btn">Cancel</button>
        <button class="confirm-delete danger-btn">Delete Exam</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmDialog);

  // Add event listeners to the dialog buttons
  confirmDialog
    .querySelector(".cancel-delete")
    .addEventListener("click", () => {
      document.body.removeChild(confirmDialog);
    });

  confirmDialog
    .querySelector(".confirm-delete")
    .addEventListener("click", async () => {
      document.body.removeChild(confirmDialog);

      try {
        // Show loading overlay
        const loadingOverlay = document.createElement("div");
        loadingOverlay.className = "loading-overlay";
        loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Deleting exam...</p>
      `;
        // document.body.appendChild(loadingOverlay);

        // Delete the exam
        await deleteExam(examId);

        // Show success notification
        showNotification("Exam deleted successfully", "success");

        // Redirect to dashboard
        history.pushState(null, "", "/teacher/exams");
        window.dispatchEvent(new Event("popstate"));
      } catch (error) {
        console.error("Error deleting exam:", error);
        showNotification("Failed to delete exam: " + error.message, "error");

        // Remove loading overlay if it exists
        const loadingOverlay = document.querySelector(".loading-overlay");
        if (loadingOverlay) {
          document.body.removeChild(loadingOverlay);
        }
      }
    });
}

/**
 * Shows a dialog to confirm exam publication
 * @param {string} examId - The ID of the exam to publish
 * @param {Object} exam - The exam object
 */
function showPublishExamDialog(examId, exam) {
  // Check if the exam has questions
  if (!exam.questions || exam.questions.length === 0) {
    showNotification(
      "Cannot publish an exam with no questions. Add at least one question first.",
      "error"
    );
    return;
  }

  const confirmDialog = document.createElement("div");
  confirmDialog.className = "confirm-dialog-overlay";
  confirmDialog.innerHTML = `
    <div class="confirm-dialog publish-exam-dialog">
      <h3>Publish Exam</h3>
      <p>Are you ready to publish this exam? Once published, students will be able to access it using the provided link.</p>
      <div class="form-group">
        <label for="exam-duration">Exam Duration (minutes)</label>
        <input type="number" id="exam-duration" min="5" value="${
          exam.durationMinutes || 60
        }" required>
      </div>
      <div class="confirm-actions">
        <button class="cancel-publish secondary-btn">Cancel</button>
        <button class="confirm-publish primary-btn">Publish Exam</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmDialog);

  // Add event listeners to the dialog buttons
  confirmDialog
    .querySelector(".cancel-publish")
    .addEventListener("click", () => {
      document.body.removeChild(confirmDialog);
    });

  confirmDialog
    .querySelector(".confirm-publish")
    .addEventListener("click", async () => {
      const durationInput = document.getElementById("exam-duration");
      const durationMinutes = Number.parseInt(durationInput.value);

      if (!durationMinutes || durationMinutes < 5) {
        durationInput.setCustomValidity(
          "Please enter a valid duration (minimum 5 minutes)"
        );
        durationInput.reportValidity();
        return;
      }

      document.body.removeChild(confirmDialog);

      try {
        // Show loading overlay
        const loadingOverlay = document.createElement("div");
        loadingOverlay.className = "loading-overlay";
        loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Publishing exam...</p>
      `;
        document.body.appendChild(loadingOverlay);

        // Update the exam status to published
        const updatedExam = {
          ...exam,
          status: "published",
          durationMinutes: durationMinutes,
        };

        await updateExam(examId, updatedExam);

        // Show success notification
        showNotification("Exam published successfully", "success");

        // Refresh the exam view
        await renderExamEditor(examId);

        // Remove loading overlay
        document.body.removeChild(loadingOverlay);
      } catch (error) {
        console.error("Error publishing exam:", error);
        showNotification("Failed to publish exam: " + error.message, "error");

        // Remove loading overlay if it exists
        const loadingOverlay = document.querySelector(".loading-overlay");
        if (loadingOverlay) {
          document.body.removeChild(loadingOverlay);
        }
      }
    });
}

/**
 * Opens the question dialog for adding or editing a question
 * @param {Object} question - The question object to edit (null for new question)
 * @param {string} examId - The ID of the exam
 */
function openQuestionDialog(question = null, examId) {
  console.log("Opening question dialog with dynamic creation");

  // Create the dialog overlay
  const dialogOverlay = document.createElement("div");
  dialogOverlay.className = "confirm-dialog-overlay question-dialog-overlay";

  // Determine if we're adding or editing
  const isEditing = question !== null;
  const dialogTitle = isEditing ? "Edit Question" : "Add New Question";

  // Create the dialog content
  dialogOverlay.innerHTML = `
    <div class="confirm-dialog question-dialog">
      <div class="dialog-header">
        <h3>${dialogTitle}</h3>
        <button class="close-dialog-btn">&times;</button>
      </div>
      
      <form id="question-form" class="question-form">
        <div class="form-group">
          <label for="question-type">Question Type</label>
          <select id="question-type" required>
            <option value="">Select type</option>
            <option value="direct" ${
              isEditing && question.type === "direct" ? "selected" : ""
            }>Direct Question</option>
            <option value="mcq" ${
              isEditing && question.type === "mcq" ? "selected" : ""
            }>Multiple Choice (MCQ)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="question-text">Question Text</label>
          <textarea id="question-text" required>${
            isEditing ? question.text : ""
          }</textarea>
        </div>
        
        <div class="form-group">
          <label for="question-attachment">Attachment (Optional)</label>
          <input type="file" id="question-attachment" accept="image/*,audio/*,video/*">
          <div id="attachment-preview" class="attachment-preview ${
            isEditing && question.attachment ? "" : "hidden"
          }">
            ${
              isEditing && question.attachment
                ? `
                <div class="attachment-info">
                  <span class="attachment-name">${
                    question.attachment.filename || "Attachment"
                  }</span>
                  <span class="attachment-type">(${
                    question.attachment.type
                  })</span>
                  <button type="button" class="remove-attachment-btn">&times;</button>
                </div>
                <input type="hidden" id="attachment-data" value='${JSON.stringify(
                  question.attachment
                )}'>
              `
                : ""
            }
          </div>
        </div>
        
        <div id="direct-question-fields" class="question-type-fields ${
          isEditing && question.type === "direct" ? "" : "hidden"
        }">
          <div class="form-group">
            <label for="correct-answer">Correct Answer</label>
            <input type="text" id="correct-answer" ${
              isEditing && question.type === "direct"
                ? 'value="' + (question.correctAnswer || "") + '"'
                : ""
            }>
          </div>
          <div class="form-group">
            <label for="tolerance">Tolerance Percentage (0-100)</label>
            <input type="number" id="tolerance" min="0" max="100" value="${
              isEditing && question.type === "direct"
                ? question.tolerance || 10
                : 10
            }">
          </div>
        </div>
        
        <div id="mcq-fields" class="question-type-fields ${
          isEditing && question.type === "mcq" ? "" : "hidden"
        }">
          <div class="form-group">
            <label>Options (Add at least 2)</label>
            <div id="options-container">
              ${
                isEditing &&
                question.type === "mcq" &&
                Array.isArray(question.options)
                  ? question.options
                      .map(
                        (option, index) => `
                      <div class="option-item">
                        <input type="text" class="option-input" value="${option.replace(
                          /"/g,
                          "&quot;"
                        )}">
                        <input type="checkbox" class="correct-option" ${
                          Array.isArray(question.correctOptions) &&
                          question.correctOptions.includes(index)
                            ? "checked"
                            : ""
                        }>
                        <span>Correct</span>
                        <button type="button" class="remove-option-btn">&times;</button>
                      </div>
                    `
                      )
                      .join("")
                  : `
                    <div class="option-item">
                      <input type="text" class="option-input" placeholder="Option text">
                      <input type="checkbox" class="correct-option">
                      <span>Correct</span>
                    </div>
                    <div class="option-item">
                      <input type="text" class="option-input" placeholder="Option text">
                      <input type="checkbox" class="correct-option">
                      <span>Correct</span>
                    </div>
                  `
              }
            </div>
            <button type="button" id="add-option-btn" class="secondary-btn">Add Option</button>
          </div>
        </div>
        
        <div class="form-group">
          <label for="question-points">Points</label>
          <input type="number" id="question-points" min="1" value="${
            isEditing ? question.points || 1 : 1
          }" required>
        </div>
        
        <div class="form-group">
          <label for="time-limit">Time Limit (seconds)</label>
          <input type="number" id="time-limit" min="15" value="${
            isEditing ? question.timeLimit || 60 : 60
          }" required>
        </div>
        
        <input type="hidden" id="question-id" value="${
          isEditing ? question._id : ""
        }">
        <input type="hidden" id="exam-id" value="${examId}">
        
        <div class="form-actions">
          <button type="button" id="cancel-btn" class="secondary-btn">Cancel</button>
          <button type="submit" class="primary-btn">Save Question</button>
        </div>
      </form>
    </div>
  `;

  // Add the dialog to the DOM
  document.body.appendChild(dialogOverlay);

  // Set up event listeners

  // Close button
  dialogOverlay
    .querySelector(".close-dialog-btn")
    .addEventListener("click", () => {
      document.body.removeChild(dialogOverlay);
    });

  // Cancel button
  dialogOverlay.querySelector("#cancel-btn").addEventListener("click", () => {
    document.body.removeChild(dialogOverlay);
  });

  // Click outside to close
  dialogOverlay.addEventListener("click", (e) => {
    if (e.target === dialogOverlay) {
      document.body.removeChild(dialogOverlay);
    }
  });

  // Question type change
  dialogOverlay
    .querySelector("#question-type")
    .addEventListener("change", (e) => {
      const directFields = dialogOverlay.querySelector(
        "#direct-question-fields"
      );
      const mcqFields = dialogOverlay.querySelector("#mcq-fields");

      directFields.classList.add("hidden");
      mcqFields.classList.add("hidden");

      if (e.target.value === "direct") {
        directFields.classList.remove("hidden");
        // Make correct answer required for direct questions
        dialogOverlay
          .querySelector("#correct-answer")
          .setAttribute("required", "true");
      } else if (e.target.value === "mcq") {
        mcqFields.classList.remove("hidden");
        // Remove required from correct answer for MCQ
        dialogOverlay
          .querySelector("#correct-answer")
          .removeAttribute("required");
      }
    });

  // Add option button
  dialogOverlay
    .querySelector("#add-option-btn")
    .addEventListener("click", () => {
      const optionsContainer =
        dialogOverlay.querySelector("#options-container");
      const newOption = document.createElement("div");
      newOption.className = "option-item";
      newOption.innerHTML = `
      <input type="text" class="option-input" placeholder="Option text">
      <input type="checkbox" class="correct-option">
      <span>Correct</span>
      <button type="button" class="remove-option-btn">&times;</button>
    `;
      optionsContainer.appendChild(newOption);

      newOption
        .querySelector(".remove-option-btn")
        .addEventListener("click", () => {
          optionsContainer.removeChild(newOption);
        });
    });

  // Set up remove option buttons for existing options
  dialogOverlay.querySelectorAll(".remove-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const optionItem = btn.closest(".option-item");
      const optionsContainer = optionItem.parentElement;
      if (optionsContainer.children.length > 2) {
        optionsContainer.removeChild(optionItem);
      } else {
        showNotification("MCQ questions must have at least 2 options", "error");
      }
    });
  });

  // File attachment preview
  dialogOverlay
    .querySelector("#question-attachment")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const preview = dialogOverlay.querySelector("#attachment-preview");
      preview.innerHTML = `<div class="loading-attachment">Uploading attachment...</div>`;
      preview.classList.remove("hidden");

      try {
        const response = await uploadQuestionAttachment(file);
        const attachment = response.attachment;

        preview.innerHTML = `
        <div class="attachment-info">
          <span class="attachment-name">${file.name}</span>
          <span class="attachment-type">(${attachment.type})</span>
          <button type="button" class="remove-attachment-btn">&times;</button>
        </div>
        <input type="hidden" id="attachment-data" value='${JSON.stringify(
          attachment
        )}'>
      `;

        preview
          .querySelector(".remove-attachment-btn")
          .addEventListener("click", () => {
            preview.innerHTML = "";
            preview.classList.add("hidden");
            dialogOverlay.querySelector("#question-attachment").value = "";
          });
      } catch (error) {
        console.error("Error uploading attachment:", error);
        preview.innerHTML = `
        <div class="attachment-error">
          Failed to upload attachment: ${error.message}
          <button type="button" class="retry-attachment-btn">Retry</button>
        </div>
      `;

        preview
          .querySelector(".retry-attachment-btn")
          .addEventListener("click", () => {
            dialogOverlay.querySelector("#question-attachment").click();
          });
      }
    });

  // Set up remove attachment button if it exists
  const removeAttachmentBtn = dialogOverlay.querySelector(
    ".remove-attachment-btn"
  );
  if (removeAttachmentBtn) {
    removeAttachmentBtn.addEventListener("click", () => {
      const preview = dialogOverlay.querySelector("#attachment-preview");
      preview.innerHTML = "";
      preview.classList.add("hidden");
      dialogOverlay.querySelector("#question-attachment").value = "";
    });
  }

  // Form submission
  dialogOverlay
    .querySelector("#question-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      try {
        // Get the examId from the hidden input field
        const examId = form.querySelector("#exam-id").value;

        if (!examId) {
          throw new Error("Exam ID not found");
        }

        const questionData = getQuestionFormData(form, examId);
        let result;

        if (form.querySelector("#question-id").value) {
          // Update existing question
          const questionId = form.querySelector("#question-id").value;
          result = await updateQuestion(questionId, questionData);
          showNotification("Question updated successfully", "success");
        } else {
          // Create new question
          result = await createQuestion(questionData);
          showNotification("Question created successfully", "success");
        }

        // Close the dialog
        document.body.removeChild(dialogOverlay);

        // Refresh the exam view with the latest questions
        await renderExamEditor(examId);
      } catch (error) {
        console.error("Error saving question:", error);
        showNotification(`Failed to save question: ${error.message}`, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Question";
      }
    });

  console.log("Question dialog opened successfully");
}

/**
 * Gets the question data from the form
 * @param {HTMLFormElement} form - The form element
 * @param {string} examId - The ID of the exam
 * @returns {Object} - The question data
 */
function getQuestionFormData(form, examId) {
  const type = form.querySelector("#question-type").value;

  const questionData = {
    examId,
    text: form.querySelector("#question-text").value,
    type,
    points: Number.parseInt(form.querySelector("#question-points").value),
    timeLimit: Number.parseInt(form.querySelector("#time-limit").value),
  };

  // Handle attachment
  const attachmentPreview = form.querySelector("#attachment-preview");
  if (!attachmentPreview.classList.contains("hidden")) {
    const attachmentData = form.querySelector("#attachment-data");
    if (attachmentData) {
      questionData.attachment = JSON.parse(attachmentData.value);
    }
  }

  // Handle type-specific fields
  if (type === "direct") {
    questionData.correctAnswer = form.querySelector("#correct-answer").value;
    questionData.tolerance = Number.parseInt(
      form.querySelector("#tolerance").value
    );
  } else if (type === "mcq") {
    const options = [];
    const correctOptions = [];

    form.querySelectorAll(".option-item").forEach((item, index) => {
      const optionText = item.querySelector(".option-input").value.trim();
      if (optionText) {
        options.push(optionText);
        if (item.querySelector(".correct-option").checked) {
          correctOptions.push(options.length - 1); // Use the actual index in the final array
        }
      }
    });

    if (options.length < 2) {
      throw new Error("MCQ questions must have at least 2 options");
    }

    if (correctOptions.length < 1) {
      throw new Error("MCQ questions must have at least 1 correct option");
    }

    questionData.options = options;
    questionData.correctOptions = correctOptions;
  }

  return questionData;
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
