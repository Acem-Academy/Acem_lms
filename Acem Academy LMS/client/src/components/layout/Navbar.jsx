import { Link } from "react-router-dom";
import {
    Search,
    Bell,
    Globe,
    ChevronDown,
    User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import whiteLogo from "@/assets/white-logo.jpeg";

const Navbar = () => {

    const navigate = useNavigate();

const { logout } = useAuth();

const [loggingOut, setLoggingOut] = useState(false);

const handleLogout = async () => {
    try {
        setLoggingOut(true);

        await logout();

        navigate("/login", {
            replace: true,
        });

    } catch (error) {

        console.error("Logout failed:", error);

    } finally {

        setLoggingOut(false);

    }
};
    return (
        <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-black">

            <div className="mx-auto flex h-24 max-w-7xl items-center gap-8 px-6">

                {/* ===================================================== */}
                {/* Logo */}
                {/* ===================================================== */}

               <Link
    to="/student/dashboard"
    className="shrink-0 transition"
>
    <img
        src={whiteLogo}
        alt="ACEM Academy"
        className="h-20 w-auto object-contain"
    />
</Link>


                {/* ===================================================== */}
                {/* Explore */}
                {/* ===================================================== */}

                <div className="group relative hidden md:block">

                    <button
                        type="button"
                        className="flex items-center gap-1 text-sm font-medium text-white transition hover:text-[var(--color-primary)]"
                    >
                        Explore

                        <ChevronDown
                            size={16}
                            className="transition-transform duration-200 group-hover:rotate-180"
                        />
                    </button>


                    {/* Explore Dropdown */}

                    <div className="invisible absolute left-0 top-full w-60 translate-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">

                        <Link
                            to="/student/courses"
                            className="block rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            All Courses
                        </Link>


                        <div className="my-1 border-t border-[var(--color-border)]" />


                        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                            Popular Courses
                        </p>


                        <Link
                            to="/student/courses"
                            className="block rounded-lg px-4 py-2 text-sm text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Physics
                        </Link>


                        <Link
                            to="/student/courses"
                            className="block rounded-lg px-4 py-2 text-sm text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Mathematics
                        </Link>


                        <Link
                            to="/student/courses"
                            className="block rounded-lg px-4 py-2 text-sm text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Chemistry
                        </Link>

                    </div>

                </div>


                {/* ===================================================== */}
                {/* My Learning */}
                {/* ===================================================== */}

                <Link
                    to="/student/my-learning"
                    className="hidden text-sm font-medium text-white transition hover:text-[var(--color-primary)] md:block"
                >
                    My Learning
                </Link>


                {/* ===================================================== */}
                {/* Search */}
                {/* ===================================================== */}

                <div className="ml-auto hidden max-w-lg flex-1 md:block">

                    <div className="flex h-10 items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[#0B0B0B]">

                        <Search
                            size={18}
                            className="ml-4 shrink-0 text-[var(--color-primary)]"
                        />

                        <input
                            type="text"
                            placeholder="What do you want to learn?"
                            className="h-full flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#888888]"
                        />

                        <button
                            type="button"
                            className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-black transition hover:bg-[var(--color-primary-dark)]"
                        >
                            <Search size={16} />
                        </button>

                    </div>

                </div>


                {/* ===================================================== */}
                {/* Right Side */}
                {/* ===================================================== */}

                <div className="flex items-center gap-4">


                    {/* Mobile Search */}

                    <button
                        type="button"
                        className="text-white transition hover:text-[var(--color-primary)] md:hidden"
                    >
                        <Search size={21} />
                    </button>


                    {/* Language */}

                    <button
                        type="button"
                        className="hidden text-white transition hover:text-[var(--color-primary)] sm:block"
                    >
                        <Globe size={20} />
                    </button>


                    {/* Notifications */}

                    <button
                        type="button"
                        className="relative text-white transition hover:text-[var(--color-primary)]"
                    >
                        <Bell size={21} />

                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-black">
                            1
                        </span>
                    </button>


                    {/* ================================================= */}
                    {/* Profile */}
                    {/* ================================================= */}

                    <div className="group relative">

                        <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-black transition hover:bg-[var(--color-primary-dark)]"
                        >
                            A
                        </button>


                        {/* Profile Dropdown */}

                        <div className="invisible absolute right-0 top-full mt-2 w-52 translate-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">


                            {/* User Info */}

                            <div className="border-b border-[var(--color-border)] px-3 py-3">

                                <p className="text-sm font-semibold text-[var(--color-primary)]">
                                    Aman
                                </p>

                                <p className="mt-1 text-xs text-white">
                                    Student
                                </p>

                            </div>


                            {/* Profile */}

                            <Link
                                to="/student/profile"
                                className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                            >

                                <User
                                    size={17}
                                    className="text-[var(--color-primary)]"
                                />

                                Profile

                            </Link>


                            {/* My Learning */}

                            <Link
                                to="/student/my-learning"
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                            >

                                <BookOpenIcon />

                                My Learning

                            </Link>


                            {/* Logout */}

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-950/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loggingOut
                                    ? "Logging out..."
                                    : "Logout"}
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </header>
    );
};


/*
|--------------------------------------------------------------------------
| Small My Learning Icon
|--------------------------------------------------------------------------
*/

const BookOpenIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-primary)]"
    >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

export default Navbar;