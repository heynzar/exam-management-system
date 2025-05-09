/**
 * API module for exam-related operations
 */

const API_BASE_URL = "http://localhost:3000/api";

/**
 * Fetch all exams
 * @returns {Promise<Object>} - Response with exams array
 */
export async function fetchExams() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch exams");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching exams:", error);
    throw error;
  }
}

/**
 * Fetch exam by ID
 * @param {string} examId - The ID of the exam to fetch
 * @returns {Promise<Object>} - Response with exam object
 */
export async function fetchExamById(examId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
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
      throw new Error(error.message || "Failed to fetch exam");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching exam ${examId}:`, error);
    throw error;
  }
}

/**
 * Create a new exam
 * @param {Object} examData - The exam data to create
 * @returns {Promise<Object>} - Response with created exam
 */
export async function createExam(examData) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(examData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create exam");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating exam:", error);
    throw error;
  }
}

/**
 * Update an existing exam
 * @param {string} examId - The ID of the exam to update
 * @param {Object} examData - The updated exam data
 * @returns {Promise<Object>} - Updated exam object
 */
export async function updateExam(examId, examData) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(examData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update exam");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating exam ${examId}:`, error);
    throw error;
  }
}

/**
 * Delete an exam
 * @param {string} examId - The ID of the exam to delete
 * @returns {Promise<Object>} - Response with success message
 */
export async function deleteExam(examId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete exam");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error deleting exam ${examId}:`, error);
    throw error;
  }
}
