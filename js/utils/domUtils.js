/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string} unsafe The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        // Handles null, undefined, numbers, booleans, etc., by converting them to a string first or returning empty for null/undefined.
        // It's safer to ensure it's a string, or to decide how to handle non-strings explicitly.
        if (unsafe === null || typeof unsafe === 'undefined') {
            return '';
        }
        unsafe = String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// If this script is loaded in a context that supports module exports (e.g., if it were part of a build system or a modern JS module in some environments)
// you might export it like this:
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = { escapeHtml };
// }
// However, for direct script injection in Chrome extensions, making it global or relying on script order is common. 