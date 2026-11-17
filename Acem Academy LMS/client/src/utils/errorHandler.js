import toast from "react-hot-toast";

/**
 * Extracts a clear, user-friendly error message from an Axios error, generic Error, or string.
 * Handles network failures, validation error arrays, rate limits, and standard HTTP codes.
 *
 * @param {unknown} error - The caught error object or message string
 * @param {string} [fallbackMessage="An unexpected error occurred. Please try again."]
 * @returns {string} Human-friendly error message
 */
export function getErrorMessage(
  error,
  fallbackMessage = "An unexpected error occurred. Please try again."
) {
  if (!error) return fallbackMessage;

  // 1. Direct string input
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : fallbackMessage;
  }

  // 2. Network offline / connection refused / timeout
  if (
    error.code === "ECONNABORTED" ||
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error" ||
    (typeof error.message === "string" &&
      error.message.toLowerCase().includes("timeout")) ||
    (!error.response && error.request)
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  const response = error.response;
  if (!response) {
    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message.trim();
    }
    return fallbackMessage;
  }

  const { status, data } = response;

  // 3. Server returned field-level validation errors array (e.g. express-validator)
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const extracted = data.errors
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return (item.msg || item.message || "").trim();
        }
        return "";
      })
      .filter((s) => s.length > 0);

    const distinctErrors = Array.from(new Set(extracted));
    if (distinctErrors.length === 1) {
      return distinctErrors[0];
    }
    if (distinctErrors.length > 1) {
      return distinctErrors.join(" • ");
    }
  }

  // 4. Server returned explicit message
  if (data?.message && typeof data.message === "string" && data.message.trim().length > 0) {
    return data.message.trim();
  }

  // 5. Data itself is a plain string
  if (
    typeof data === "string" &&
    data.trim().length > 0 &&
    !data.includes("<!DOCTYPE") &&
    !data.includes("<html")
  ) {
    return data.trim();
  }

  // 6. Fallbacks by HTTP status code
  switch (status) {
    case 400:
      return "Invalid request. Please check the entered data.";
    case 401:
      return "Your session has expired or you are not signed in. Please log in.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "A resource with these details already exists.";
    case 413:
      return "The uploaded file is too large. Please upload a smaller file.";
    case 429:
      return "Too many requests. Please wait a few moments and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server error. Our team has been notified. Please try again shortly.";
    default:
      return fallbackMessage;
  }
}

/**
 * Displays an error toast with normalized, user-friendly text.
 * Prevents raw stack traces or internal technical error dumps from showing.
 * Deduplicates multiple rapid calls with the same error message.
 *
 * @param {unknown} error - The caught error or string
 * @param {string} [fallbackMessage] - Optional fallback text
 * @returns {string} The normalized message shown in the toast
 */
export function showToastError(error, fallbackMessage) {
  const message = getErrorMessage(error, fallbackMessage);
  toast.error(message, { id: message });
  return message;
}

/**
 * Displays a success toast, deduplicating identical messages.
 *
 * @param {string} message - Success notification text
 */
export function showToastSuccess(message) {
  toast.success(message, { id: message });
}

/**
 * Displays a warning / informational toast, deduplicating identical messages.
 *
 * @param {string} message - Warning text
 */
export function showToastWarning(message) {
  toast(message, {
    id: message,
    icon: "⚠️",
  });
}
