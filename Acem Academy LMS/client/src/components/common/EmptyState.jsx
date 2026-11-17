import { Link } from "react-router-dom";
import { FolderOpen } from "lucide-react";

/**
 * Reusable Empty State Component
 *
 * @param {Object} props
 * @param {React.ComponentType} [props.icon=FolderOpen] - Lucide icon component
 * @param {string} props.title - Main headline
 * @param {string} [props.description] - Helpful subtext
 * @param {{ label: string, href?: string, link?: string, to?: string, onClick?: () => void, icon?: React.ComponentType }} [props.action] - Primary action object
 * @param {string} [props.actionLabel] - Primary action button text
 * @param {string} [props.actionLink] - Link URL for primary action (canonical)
 * @param {string} [props.actionTo] - Link URL for primary action (alias)
 * @param {() => void} [props.onAction] - Click handler for primary action
 * @param {React.ComponentType} [props.actionIcon] - Icon for primary action button
 * @param {{ label: string, href?: string, link?: string, to?: string, onClick?: () => void, icon?: React.ComponentType }} [props.secondaryAction] - Secondary action object
 * @param {string} [props.secondaryLabel] - Optional secondary action text
 * @param {string} [props.secondaryLink] - Optional secondary action link URL (canonical)
 * @param {string} [props.secondaryTo] - Optional secondary action link URL (alias)
 * @param {() => void} [props.onSecondaryAction] - Secondary action handler
 * @param {React.ComponentType} [props.secondaryIcon] - Icon for secondary action button
 * @param {string} [props.className] - Additional wrapper classes
 */
export default function EmptyState({
  icon: IconComponent = FolderOpen,
  title = "No items found",
  description,
  action,
  actionLabel,
  actionLink,
  actionTo,
  onAction,
  actionIcon,
  secondaryAction,
  secondaryLabel,
  secondaryLink,
  secondaryTo,
  onSecondaryAction,
  secondaryIcon,
  className = "",
}) {
  // Primary action resolution: canonical flat props take precedence, fallback to object props
  const resolvedActionLabel = actionLabel !== undefined ? actionLabel : action?.label;
  const resolvedActionLink =
    actionLink !== undefined
      ? actionLink
      : (actionTo !== undefined ? actionTo : (action?.href || action?.link || action?.to));
  const resolvedOnAction = onAction !== undefined ? onAction : action?.onClick;
  const PrimaryActionIcon = actionIcon || action?.icon;

  // Secondary action resolution: canonical flat props take precedence, fallback to object props
  const resolvedSecondaryLabel =
    secondaryLabel !== undefined ? secondaryLabel : secondaryAction?.label;
  const resolvedSecondaryLink =
    secondaryLink !== undefined
      ? secondaryLink
      : (secondaryTo !== undefined ? secondaryTo : (secondaryAction?.href || secondaryAction?.link || secondaryAction?.to));
  const resolvedOnSecondaryAction =
    onSecondaryAction !== undefined ? onSecondaryAction : secondaryAction?.onClick;
  const SecondaryActionIcon = secondaryIcon || secondaryAction?.icon;

  const hasPrimary = Boolean(resolvedActionLabel && (resolvedActionLink || resolvedOnAction));
  const hasSecondary = Boolean(resolvedSecondaryLabel && (resolvedSecondaryLink || resolvedOnSecondaryAction));

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] text-[var(--color-primary)]">
        <IconComponent size={28} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
          {description}
        </p>
      )}

      {(hasPrimary || hasSecondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasPrimary && resolvedActionLink && (
            <Link
              to={resolvedActionLink}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
            >
              {PrimaryActionIcon && <PrimaryActionIcon size={16} />}
              {resolvedActionLabel}
            </Link>
          )}

          {hasPrimary && !resolvedActionLink && resolvedOnAction && (
            <button
              type="button"
              onClick={resolvedOnAction}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
            >
              {PrimaryActionIcon && <PrimaryActionIcon size={16} />}
              {resolvedActionLabel}
            </button>
          )}

          {hasSecondary && resolvedSecondaryLink && (
            <Link
              to={resolvedSecondaryLink}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              {SecondaryActionIcon && <SecondaryActionIcon size={16} />}
              {resolvedSecondaryLabel}
            </Link>
          )}

          {hasSecondary && !resolvedSecondaryLink && resolvedOnSecondaryAction && (
            <button
              type="button"
              onClick={resolvedOnSecondaryAction}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              {SecondaryActionIcon && <SecondaryActionIcon size={16} />}
              {resolvedSecondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
