import { Loader2 } from "lucide-react";

/**
 * Standard loading spinner with optional text
 * Supports both canonical `message` and alias `text`
 */
export function LoadingSpinner({
  size = 20,
  message,
  text,
  className = "",
}) {
  const displayMessage =
    message !== undefined
      ? message
      : (text !== undefined ? text : "Loading...");

  return (
    <div
      className={`flex items-center justify-center gap-3 text-sm text-[var(--color-text-muted)] ${className}`}
    >
      <Loader2
        size={size}
        className="animate-spin text-[var(--color-primary)]"
      />
      {displayMessage && <span>{displayMessage}</span>}
    </div>
  );
}

/**
 * Skeleton for dashboard metric cards
 * Supports optional `count` prop to render multiple cards in a grid
 */
export function StatCardSkeleton({ count = 1 }) {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-8 w-16 animate-pulse rounded bg-white/[0.1]" />
                <div className="h-3 w-36 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="h-12 w-12 animate-pulse rounded-xl bg-white/[0.05]" />
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-8 w-16 animate-pulse rounded bg-white/[0.1]" />
          <div className="h-3 w-36 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

/**
 * Skeleton for course cards (grids in student and teacher views)
 */
export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
      {/* Thumbnail placeholder */}
      <div className="aspect-video w-full animate-pulse bg-white/[0.05]" />

      <div className="p-6 space-y-4">
        {/* Code & status badges */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-white/[0.06]" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 w-4/5 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-white/[0.04]" />
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <div className="h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton rows for tables (e.g. Users, Courses, Students)
 */
export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-4 animate-pulse rounded bg-white/[0.06] ${
              i === 0 ? "w-40" : i === columns - 1 ? "w-16 ml-auto" : "w-24"
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for simple list items
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="space-y-2 flex-1">
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}
