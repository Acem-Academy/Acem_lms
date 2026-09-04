import {
  LogOut,
  GraduationCap,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { NAVIGATION } from "@/config/navigation";
import { ROLES } from "@/config/roles";

function Sidebar({ role }) {

  const { logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

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
    <aside
      className="
        fixed
        left-0
        top-0
        z-40
        flex
        h-screen
        w-64
        flex-col
        border-r
        border-[var(--color-border)]
        bg-black
      "
    >

      {/* Logo */}

      <div
        className="
          border-b
          border-[var(--color-border)]
          px-6
          py-6
        "
      >

        <div className="flex items-center gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[var(--color-primary)]
            "
          >
            <GraduationCap
              className="h-6 w-6 text-black"
            />
          </div>

          <div>

            <h1
              className="
                text-lg
                font-bold
                text-[var(--color-primary)]
              "
            >
              ACEM Academy
            </h1>

            <p
              className="
                text-xs
                text-[var(--color-text-muted)]
              "
            >
              {panelName}
            </p>

          </div>

        </div>

      </div>


      {/* Navigation */}

      <nav
        className="
          flex-1
          space-y-2
          overflow-y-auto
          p-4
        "
      >

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
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

              <Icon size={20} />

              <span className="font-medium">
                {item.title}
              </span>

            </NavLink>
          );

        })}

      </nav>


      {/* Logout */}

      <div
        className="
          border-t
          border-[var(--color-border)]
          p-4
        "
      >

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
          "
        >

          <LogOut size={20} />

          <span>
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </span>

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;