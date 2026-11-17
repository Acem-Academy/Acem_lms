import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Reusable Confirmation Modal for destructive / sensitive operations
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {() => void} props.onClose - Cancel / close handler
 * @param {() => void} props.onConfirm - Confirm handler
 * @param {string} [props.title="Confirm Action"] - Headline
 * @param {string} [props.description] - Warning or explanation text (canonical)
 * @param {string} [props.message] - Warning or explanation text (alias)
 * @param {string} [props.confirmText] - Confirm button label (canonical)
 * @param {string} [props.confirmLabel] - Confirm button label (alias)
 * @param {string} [props.cancelText="Cancel"] - Cancel button label
 * @param {boolean} [props.isLoading=false] - Whether confirm action is pending
 * @param {"danger" | "warning" | "default"} [props.variant] - Visual theme (canonical)
 * @param {boolean} [props.danger] - Boolean flag for danger variant (alias)
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText = "Cancel",
  isLoading = false,
  variant,
  danger,
}) {
  const resolvedDescription = description !== undefined ? description : message;
  const resolvedConfirmText =
    confirmText !== undefined
      ? confirmText
      : (confirmLabel !== undefined ? confirmLabel : "Confirm");

  // Prefer explicitly supplied canonical variant; use danger alias only when variant is absent
  const resolvedVariant =
    variant !== undefined
      ? variant
      : (danger !== undefined ? (danger ? "danger" : "default") : "danger");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = resolvedVariant === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[#121214] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? "bg-red-500/10 text-red-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            <AlertTriangle size={20} />
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-white">{title}</h3>
            {resolvedDescription && (
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {resolvedDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dark)]"
            }`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
