import { login } from "../api/auth.js";

export function renderLogin() {
  document.body.innerHTML = `
    <main class="login-container">
      <div class="login-card">
        <h2>Login</h2>
        <form id="login-form" class="login-form">
          <input type="email" name="email" placeholder="Email" required />
          <input type="password" name="password" placeholder="Password" required />
          <select name="role" required>
            <option value="" disabled selected>Select Role</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <button type="submit">Login</button>
        </form>
      </div>
    </main>
  `;

  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      const role = e.target.role.value;
      await login({ email, password, role });
    });
}
