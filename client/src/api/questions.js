/**
 * API module for question-related operations
 */

const API_BASE_URL = "http://localhost:3000/api/questions";

/**
 * Creates a new question for an exam
 * @param {Object} questionData - The question data
 * @returns {Promise<Object>} - The created question object
 */
export async function createQuestion(questionData) {
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
      body: JSON.stringify(questionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create question");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

/**
 * Fetches a question by ID
 * @param {string} questionId - The ID of the question to fetch
 * @returns {Promise<Object>} - The question object
 */
export async function fetchQuestionById(questionId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    // Validate that the questionId looks like a valid MongoDB ObjectId
    // MongoDB ObjectIds are 24 hex characters
    if (!/^[0-9a-fA-F]{24}$/.test(questionId)) {
      throw new Error("Invalid question ID format");
    }

    const response = await fetch(`${API_BASE_URL}/${questionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch question");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching question:", error);
    throw error;
  }
}

/**
 * Updates an existing question
 * @param {string} questionId - ID of the question to update
 * @param {Object} questionData - Updated question data
 * @returns {Promise<Object>} - The updated question object
 */
export async function updateQuestion(questionId, questionData) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    // Validate that the questionId looks like a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(questionId)) {
      throw new Error("Invalid question ID format");
    }

    const response = await fetch(`${API_BASE_URL}/${questionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(questionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update question");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating question:", error);
    throw error;
  }
}

/**
 * Deletes a question
 * @param {string} questionId - ID of the question to delete
 * @returns {Promise<Object>} - Response with success message
 */
export async function deleteQuestion(questionId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    // Validate that the questionId looks like a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(questionId)) {
      throw new Error("Invalid question ID format");
    }

    const response = await fetch(`${API_BASE_URL}/${questionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete question");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
}

/**
 * Fetches all questions for a specific exam
 * @param {string} examId - ID of the exam to fetch questions for
 * @returns {Promise<Array>} - Array of question objects
 */
export async function fetchQuestionsByExamId(examId) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch questions");
    }

    const questions = await response.json(); // It's an array, not an object
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error("Error fetching questions:", error);
    throw error;
  }
}

/**
 * Uploads a file attachment for a question
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - The attachment data object
 */
export async function uploadQuestionAttachment(file) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    // FIXED: Corrected the URL path for attachments upload
    const response = await fetch(`${API_BASE_URL}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to upload attachment");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading attachment:", error);
    throw error;
  }
}
