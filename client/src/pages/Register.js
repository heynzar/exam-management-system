import { register } from "../api/auth.js";

export function renderRegister() {
  document.body.innerHTML = `
    <main class="register-container">
      <div class="register-card">
        <h2>Create an Account</h2>
        <form id="register-form" class="register-form">
        <div class="form-group">
            <input name="firstName" placeholder="First Name" required />
            <input name="lastName" placeholder="Last Name" required />
        </div>

         
           <input name="institution" placeholder="Institution" required />
          <div class="form-group">
           <input name="dateOfBirth" type="date" placeholder="Date of Birth" required />
            <select name="gender" required>
              <option value="" disabled selected>Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          
          
           <div class="form-group">
          <input name="fieldOfStudy" placeholder="Field of Study/Major" required />
          <select name="userType" required>
            <option value="" disabled selected>Select user type</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          </div>
           <input name="email" type="email" placeholder="Email" required />
          <input type="password" name="password" placeholder="Password" required />
          
          
          
          <button type="submit">Register</button>
        </form>
      </div>
    </main>
  `;

  document
    .getElementById("register-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;

      const userData = {
        email: form.email.value,
        lastName: form.lastName.value,
        firstName: form.firstName.value,
        dateOfBirth: form.dateOfBirth.value,
        gender: form.gender.value,
        institution: form.institution.value,
        fieldOfStudy: form.fieldOfStudy.value,
        password: form.password.value,
        userType: form.userType.value,
      };

      await register(userData);
    });
}
