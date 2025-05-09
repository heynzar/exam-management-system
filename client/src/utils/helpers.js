/**
 * Generates a unique ID for exams
 * Format: 'EX' + timestamp + random string
 * Example: EX1683749283847A1B2C3
 * returns {string} Unique ID
 */
export function generateUniqueId() {
  const timestamp = Date.now().toString();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EX${timestamp}${randomStr}`;
}

/**
 * Format date to display in a more readable format
 * param {string} dateString - ISO date string
 * returns {string} Formatted date
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Truncate text with ellipsis if it exceeds maxLength
 * param {string} text - Text to truncate
 * param {number} maxLength - Maximum length before truncating
 * returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
