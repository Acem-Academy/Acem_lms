import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";

function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
        403
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
        Access denied
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
        You do not have permission to view this page.
      </p>

      <Link
        to={ROUTES.LOGIN}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
      >
        Back to Login
      </Link>
    </div>
  );
}

export default Unauthorized;
