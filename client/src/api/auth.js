export async function login({ email, password, role }) {
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      alert("Logged in successfully!");

      // Redirect based on user role
      if (role === "student") {
        window.location.href = "/student/exams";
      } else if (role === "teacher") {
        window.location.href = "/teacher/exams";
      }
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Server error");
  }
}

export async function register(userData) {
  try {
    // Validate required fields
    const requiredFields = [
      "email",
      "lastName",
      "firstName",
      "dateOfBirth",
      "gender",
      "institution",
      "fieldOfStudy",
      "password",
      "userType",
    ];

    const missingFields = requiredFields.filter((field) => !userData[field]);

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    // Format date of birth for API if needed
    if (userData.dateOfBirth) {
      // Ensure date is in ISO format (YYYY-MM-DD)
      const dateObj = new Date(userData.dateOfBirth);
      if (!isNaN(dateObj.getTime())) {
        userData.dateOfBirth = dateObj.toISOString().split("T")[0];
      }
    }

    const res = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const result = await res.json();

    if (res.ok) {
      alert("Registration successful! Please log in.");
      import("../pages/Login.js").then((module) => module.renderLogin());
    } else {
      alert(result.message || "Registration failed");
    }
  } catch (err) {
    console.error("Registration error:", err);
    alert("Server error");
  }
}

export function logout() {
  localStorage.removeItem("token");
  alert("Logged out successfully.");
  window.location.href = "/";
}

{
  /* <button id="logout-btn">Logout</button>
document.getElementById("logout-btn").addEventListener("click", () => {
  import("../api/auth.js").then((auth) => auth.logout());
}); */
}
