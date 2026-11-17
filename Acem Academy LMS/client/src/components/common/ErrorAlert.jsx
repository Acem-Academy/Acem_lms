import { AlertCircle, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/utils/errorHandler";

/**
 * Reusable Error Alert with optional Retry button
 *
 * @param {Object} props
 * @param {unknown} [props.error] - Error object or string
 * @param {string|unknown} [props.message] - Contextual message or error object
 * @param {string} [props.title="Something went wrong"] - Error title
 * @param {() => void} [props.onRetry] - Optional retry handler
 * @param {boolean} [props.retrying=false] - Whether retry is in progress
 * @param {string} [props.className] - Additional wrapper styling
 * @param {boolean} [props.fullPage=false] - If true, wraps in a centered min-h screen container
 */
export default function ErrorAlert({
  error,
  message: propMessage,
  title = "Something went wrong",
  onRetry,
  retrying = false,
  className = "",
  fullPage = false,
}) {
  let displayMessage;

  if (typeof propMessage === "string" && propMessage.trim().length > 0) {
    displayMessage = propMessage.trim();
  } else if (typeof error === "string" && error.trim().length > 0) {
    displayMessage = error.trim();
  } else if (error) {
    displayMessage = getErrorMessage(error);
  } else if (propMessage) {
    displayMessage = getErrorMessage(propMessage);
  } else {
    displayMessage = "An unexpected error occurred. Please try again.";
  }

  const content = (
    <div
      role="alert"
      className={`rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center ${className}`}
    >
      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-red-500/20 text-red-400">
        <AlertCircle size={24} />
      </div>

      <h3 className="mt-4 text-base font-bold text-red-200">{title}</h3>
      <p className="mt-1 text-sm text-red-300/80 max-w-lg mx-auto leading-relaxed">
        {displayMessage}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
        >
          <RefreshCw size={15} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Retrying..." : "Try Again"}
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">{content}</div>
      </div>
    );
  }

  return content;
}
