import {
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { NAVIGATION } from "@/config/navigation";
import { ROLES } from "@/config/roles";

function Sidebar({ role }) {
  const { logout } = useAuth();
  const location = useLocation();

  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Sidebar is only for Teacher and Admin
  const menuItems = NAVIGATION[role] || [];

  const panelName =
    role === ROLES.ADMIN
      ? "Admin Panel"
      : "Teacher Panel";

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Top Header Bar (< lg) */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-black px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]">
              <GraduationCap className="h-5 w-5 text-black" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--color-primary)]">
              ACEM Academy
            </span>
          </div>
        </div>

        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
          {panelName}
        </span>
      </header>

      {/* Backdrop Overlay for Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop fixed, Mobile off-canvas drawer) */}
      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-64
          flex-col
          border-r
          border-[var(--color-border)]
          bg-black
          transition-transform
          duration-300
          ease-in-out
          lg:z-40
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        {/* Logo & Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]">
              <GraduationCap className="h-6 w-6 text-black" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">
                ACEM Academy
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                {panelName}
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.title}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-4
                    py-3
                    text-sm
                    transition-all
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[var(--color-primary)]

                    ${
                      isActive
                        ? `
                          bg-[var(--color-primary)]
                          font-semibold
                          text-black
                          shadow-md
                        `
                        : `
                          text-[var(--color-text-secondary)]
                          hover:bg-white/[0.05]
                          hover:text-[var(--color-primary)]
                        `
                    }
                  `
                }
              >
                <Icon size={20} className="shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-4
              py-3
              text-sm
              font-medium
              text-red-500
              transition
              hover:bg-red-950/20
              disabled:cursor-not-allowed
              disabled:opacity-50
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-red-500
            "
          >
            <LogOut size={20} className="shrink-0" />
            <span>
              {loggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
