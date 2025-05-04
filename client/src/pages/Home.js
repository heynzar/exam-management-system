export function renderHome() {
  document.body.innerHTML = `
    
    <main class="home-container">
      <div class="home-card">
        <h1>Welcome to the Online Exam Platform</h1>
        <p>
          Please 
          <a href="#" id="login-link" class="home-link">login</a> 
          or 
          <a href="#" id="register-link" class="home-link">register</a>.
        </p>
      </div>
    </main>
  `;

  document.getElementById("login-link").addEventListener("click", (e) => {
    e.preventDefault();
    import("./Login.js").then((module) => module.renderLogin());
  });

  document.getElementById("register-link").addEventListener("click", (e) => {
    e.preventDefault();
    import("./Register.js").then((module) => module.renderRegister());
  });
}
