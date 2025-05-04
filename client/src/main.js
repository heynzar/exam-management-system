import "./styles/main.css";
import { renderHome } from "./pages/Home.js";
import { renderTeacherDashboard } from "./pages/TeacherDashboard.js";
import { renderStudentExams } from "./pages/StudentDashboard.js";
import { renderExamEditor } from "./pages/ExamInterface.js";
import { renderStudentExam } from "./pages/StudentExamInterface.js";
import { renderStatisticsPage } from "./pages/StatisticsPage.js";

function router() {
  const path = window.location.pathname;
  const app = document.getElementById("app");

  // Handle statistics route first to prevent conflict with the exam editor route
  if (path.match(/^\/teacher\/exams\/([^\/]+)\/statistics$/)) {
    const examId = path.split("/")[3];
    console.log(examId);
    renderStatisticsPage(examId);
    return;
  }

  // Handle exam editor route
  if (path.match(/^\/teacher\/exams\/([^\/]+)$/)) {
    const examId = path.split("/")[3];
    renderExamEditor(examId);
    return;
  }

  // Handle student exam route
  if (path.startsWith("/exam/")) {
    const examId = path.split("/").pop();
    renderStudentExam(examId);
    return;
  }

  // Handle static paths
  switch (path) {
    case "/":
      renderHome();
      break;
    case "/teacher/exams":
      renderTeacherDashboard();
      break;
    case "/student/exams":
      renderStudentExams();
      break;
    default:
      app.innerHTML = `<h1>404 - Page Not Found</h1>`;
  }
}

// Run router on page load and when navigating with back/forward buttons
window.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", router);

// Intercept SPA navigation links
document.addEventListener("click", (e) => {
  if (e.target.tagName === "A" && e.target.dataset.link === "spa") {
    e.preventDefault();
    const href = e.target.getAttribute("href");
    history.pushState(null, "", href);
    router();
  }
});
