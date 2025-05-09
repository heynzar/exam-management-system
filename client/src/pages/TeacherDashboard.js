import { fetchExams, createExam } from "../api/exams.js";
import { logout } from "../api/auth.js";
import { generateUniqueId } from "../utils/helpers.js";

export async function renderTeacherDashboard() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <section class="dashboard">
      <h1>Teacher Dashboard</h1>
      <div class="dashboard-actions">
        <button id="create-exam-btn" class="primary-btn">Create New Exam</button>
        <button id="logout-btn" class="secondary-btn">Logout</button>
      </div>
      <div id="dashboard-content">
        <div class="loading">Loading exams...</div>
      </div>

      <div id="create-exam-dialog" class="dialog-overlay hidden">
        <div class="dialog-content">
          <h2>Create New Exam</h2>
          <form id="create-exam-form">
            <div class="form-group">
              <label for="exam-title">Title</label>
              <input type="text" id="exam-title" name="title" required />
            </div>
            <div class="form-group">
              <label for="exam-description">Description</label>
              <textarea id="exam-description" name="description" rows="3" required></textarea>
            </div>
            <div class="form-group">
              <label for="exam-target">Target Audience</label>
              <input type="text" id="exam-target" name="targetAudience"
                placeholder="e.g., 2e année MIP, S4, groupe A" required />
            </div>
            <div id="exam-error" class="form-error hidden"></div>
            <div class="form-actions">
              <button type="button" id="cancel-create-exam" class="secondary-btn">Cancel</button>
              <button type="submit" id="submit-exam-btn" class="primary-btn">Create Exam</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;

  const content = document.getElementById("dashboard-content");
  const dialog = document.getElementById("create-exam-dialog");
  const form = document.getElementById("create-exam-form");
  const errorBox = document.getElementById("exam-error");
  const submitBtn = document.getElementById("submit-exam-btn");

  // Fetch and render exams
  async function loadExams() {
    content.innerHTML = `<div class="loading">Loading exams...</div>`;
    try {
      const data = await fetchExams();
      const exams = Array.isArray(data) ? data : data?.exams || [];
      renderExamCards(exams);
    } catch (err) {
      console.error("Error loading exams:", err);
      content.innerHTML = `
        <div class="error-message">
          Failed to load exams. Please try again later.
        </div>`;
    }
  }

  // Show dialog
  document.getElementById("create-exam-btn").onclick = () => {
    dialog.classList.remove("hidden");
    errorBox.classList.add("hidden");
  };

  // Hide dialog
  document.getElementById("cancel-create-exam").onclick = closeDialog;
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDialog();
  });

  function closeDialog() {
    dialog.classList.add("hidden");
    form.reset();
    submitBtn.disabled = false;
    errorBox.classList.add("hidden");
  }

  // Handle creation
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    errorBox.classList.add("hidden");

    const examData = {
      id: generateUniqueId(),
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      targetAudience: form.targetAudience.value.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await createExam(examData);
      closeDialog();
      await loadExams();
    } catch (err) {
      console.error("Error creating exam:", err);
      errorBox.textContent = err.message || "Failed to create exam.";
      errorBox.classList.remove("hidden");
      submitBtn.disabled = false;
    }
  });

  // Logout flow
  document.getElementById("logout-btn").onclick = () => {
    logout();
    history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));
  };

  // Initial load
  loadExams();
}

function renderExamCards(exams) {
  const container = document.getElementById("dashboard-content");
  if (!exams.length) {
    container.innerHTML = `
      <div class="no-exams-message">
        <p>No exams created yet.</p>
        <p>Click "Create New Exam" to add one.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="exam-cards-container">
      ${exams
        .map(
          (e) => `
        <div class="exam-card" data-exam-id="${e.id}">
          <h3 class="exam-title">${e.title}</h3>
          <div class="exam-audience">
            <span class="audience-label">Audience:</span>
            <span class="audience-value">${e.targetAudience}</span>
          </div>
          <p class="exam-description">\${
            e.description.length > 100
              ? e.description.slice(0, 100) + '...'
              : e.description
          }</p>
          <div class="exam-meta">
            <span>Created: ${new Date(e.createdAt).toLocaleDateString()}</span>
          </div>
        </div>`
        )
        .join("")}
    </div>`;

  container.querySelectorAll(".exam-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.examId;
      history.pushState(null, "", `/teacher/exams/${id}`);
      window.dispatchEvent(new Event("popstate"));
    });
  });
}
