/**
 * API module for exam attempt-related operations
 */

const API_BASE_URL = "http://localhost:3000/api/attempts";

/**
 * Submit an exam attempt
 * @param {Object} attemptData - The attempt data to submit
 * @returns {Promise<Object>} - Response with the created attempt
 */
export async function submitExamAttempt(attemptData) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(attemptData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to submit exam attempt");
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting exam attempt:", error);
    throw error;
  }
}

/**
 * Fetch all attempts for a student
 * @returns {Promise<Object>} - Response with attempts array
 */
export async function fetchStudentAttempts() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/student`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch attempts");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching student attempts:", error);
    throw error;
  }
}

/**
 * Fetch all attempts for an exam (teacher only)
 * @param {string} examId - The ID of the exam
 * @returns {Promise<Object>} - Response with attempts array
 */
export async function fetchExamAttempts(examId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch exam attempts");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching attempts for exam ${examId}:`, error);
    throw error;
  }
}

/**
 * Fetch a specific attempt by ID
 * @param {string} attemptId - The ID of the attempt to fetch
 * @returns {Promise<Object>} - Response with attempt object
 */
export async function fetchAttemptById(attemptId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${attemptId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch attempt");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching attempt ${attemptId}:`, error);
    throw error;
  }
}

export async function fetchExamStatistics(examId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}/statistics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch exam statistics");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching statistics for exam ${examId}:`, error);
    throw error;
  }
}
