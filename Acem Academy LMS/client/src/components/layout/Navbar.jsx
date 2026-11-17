import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Search,
    Bell,
    Globe,
    ChevronDown,
    User,
    Menu,
    X,
    BookOpen,
    LogOut,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import whiteLogo from "@/assets/white-logo.jpeg";

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const [loggingOut, setLoggingOut] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const profileRef = useRef(null);

    // Auto-close dropdowns on route changes
    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileOpen(false);
    }, [location.pathname]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Prevent body scrolling when mobile drawer is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/student/courses?search=${encodeURIComponent(searchQuery.trim())}`);
            setMobileMenuOpen(false);
        }
    };

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

    const userInitial = user?.name
        ? user.name.charAt(0).toUpperCase()
        : user?.email
          ? user.email.charAt(0).toUpperCase()
          : "U";
    const userName = user?.name || user?.email?.split("@")[0] || "Student";
    const userRole = user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Student";

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-black/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 md:h-20 lg:h-24 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                {/* Logo & Mobile Menu Toggle */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="rounded-lg p-2 text-neutral-300 hover:bg-white/[0.08] hover:text-white md:hidden"
                        aria-label="Open mobile menu"
                    >
                        <Menu size={22} />
                    </button>

                    <Link
                        to="/student/dashboard"
                        className="shrink-0 transition"
                    >
                        <img
                            src={whiteLogo}
                            alt="ACEM Academy"
                            className="h-9 md:h-12 lg:h-14 w-auto object-contain"
                        />
                    </Link>
                </div>

                {/* Explore Dropdown (Desktop) */}
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
                            to="/student/courses?category=Physics"
                            className="block rounded-lg px-4 py-2 text-sm text-neutral-200 transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Physics
                        </Link>

                        <Link
                            to="/student/courses?category=Mathematics"
                            className="block rounded-lg px-4 py-2 text-sm text-neutral-200 transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Mathematics
                        </Link>

                        <Link
                            to="/student/courses?category=Chemistry"
                            className="block rounded-lg px-4 py-2 text-sm text-neutral-200 transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                        >
                            Chemistry
                        </Link>
                    </div>
                </div>

                {/* My Learning (Desktop) */}
                <Link
                    to="/student/my-learning"
                    className="hidden text-sm font-medium text-white transition hover:text-[var(--color-primary)] md:block"
                >
                    My Learning
                </Link>

                {/* Search Bar (Desktop) */}
                <form
                    onSubmit={handleSearchSubmit}
                    className="ml-auto hidden max-w-md flex-1 md:block"
                >
                    <div className="flex h-10 items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[#0B0B0B] transition focus-within:border-[var(--color-primary)]">
                        <Search
                            size={18}
                            className="ml-4 shrink-0 text-[var(--color-primary)]"
                        />

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="What do you want to learn?"
                            className="h-full flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#888888]"
                        />

                        <button
                            type="submit"
                            aria-label="Search"
                            className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-black transition hover:bg-[var(--color-primary-dark)]"
                        >
                            <Search size={16} />
                        </button>
                    </div>
                </form>

                {/* Right Side Icons */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Mobile Search Toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="rounded-lg p-2 text-neutral-300 transition hover:text-[var(--color-primary)] md:hidden"
                        aria-label="Search courses"
                    >
                        <Search size={20} />
                    </button>

                    {/* Language */}
                    <button
                        type="button"
                        className="hidden rounded-lg p-2 text-neutral-300 transition hover:text-[var(--color-primary)] sm:block"
                        aria-label="Language selection"
                    >
                        <Globe size={19} />
                    </button>

                    {/* Notifications */}
                    <button
                        type="button"
                        className="relative rounded-lg p-2 text-neutral-300 transition hover:text-[var(--color-primary)]"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-black">
                            1
                        </span>
                    </button>

                    {/* Profile Dropdown */}
                    <div ref={profileRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setProfileOpen((prev) => !prev)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-black transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-black"
                            aria-label="User menu"
                            aria-expanded={profileOpen}
                        >
                            {userInitial}
                        </button>

                        {/* Profile Dropdown Menu */}
                        <div
                            className={`absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-2xl transition-all duration-150 ${
                                profileOpen
                                    ? "visible scale-100 opacity-100"
                                    : "invisible scale-95 opacity-0 pointer-events-none"
                            }`}
                        >
                            <div className="border-b border-[var(--color-border)] px-3 py-3">
                                <p className="truncate text-sm font-semibold text-[var(--color-primary)]">
                                    {userName}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-neutral-400">
                                    {userRole}
                                </p>
                            </div>

                            <div className="py-1">
                                <Link
                                    to="/student/profile"
                                    onClick={() => setProfileOpen(false)}
                                    className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-200 transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                                >
                                    <User
                                        size={17}
                                        className="text-[var(--color-primary)]"
                                    />
                                    Profile
                                </Link>

                                <Link
                                    to="/student/my-learning"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-200 transition hover:bg-[#171717] hover:text-[var(--color-primary)]"
                                >
                                    <BookOpen
                                        size={17}
                                        className="text-[var(--color-primary)]"
                                    />
                                    My Learning
                                </Link>
                            </div>

                            <div className="border-t border-[var(--color-border)] pt-1">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <LogOut size={16} />
                                    {loggingOut ? "Logging out..." : "Logout"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer (Menu & Search) */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col border-r border-[var(--color-border)] bg-[#0B0B0B] p-5 shadow-2xl">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                            <Link
                                to="/student/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="shrink-0"
                            >
                                <img
                                    src={whiteLogo}
                                    alt="ACEM Academy"
                                    className="h-9 w-auto object-contain"
                                />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg p-2 text-neutral-400 hover:bg-white/[0.08] hover:text-white"
                                aria-label="Close menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mobile Search */}
                        <form onSubmit={handleSearchSubmit} className="mt-4">
                            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-black px-3">
                                <Search size={16} className="text-[var(--color-primary)]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search courses..."
                                    className="h-full flex-1 bg-transparent px-2.5 text-sm text-white outline-none placeholder:text-neutral-500"
                                />
                            </div>
                        </form>

                        {/* Navigation Links */}
                        <div className="mt-6 flex-1 space-y-1 overflow-y-auto">
                            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Navigation
                            </p>
                            <Link
                                to="/student/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/student/courses"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                            >
                                Explore Courses
                            </Link>
                            <Link
                                to="/student/my-learning"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                            >
                                My Learning
                            </Link>
                            <Link
                                to="/student/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                            >
                                Profile Settings
                            </Link>

                            <div className="pt-4">
                                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                                    Popular Categories
                                </p>
                                <Link
                                    to="/student/courses?category=Physics"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block rounded-lg px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                                >
                                    Physics
                                </Link>
                                <Link
                                    to="/student/courses?category=Mathematics"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block rounded-lg px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                                >
                                    Mathematics
                                </Link>
                                <Link
                                    to="/student/courses?category=Chemistry"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block rounded-lg px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-[var(--color-primary)]"
                                >
                                    Chemistry
                                </Link>
                            </div>
                        </div>

                        {/* User info & Logout at bottom */}
                        <div className="border-t border-[var(--color-border)] pt-4">
                            <div className="flex items-center gap-3 px-2 pb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-black">
                                    {userInitial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">
                                        {userName}
                                    </p>
                                    <p className="truncate text-xs text-neutral-400">
                                        {userRole}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <LogOut size={16} />
                                {loggingOut ? "Logging out..." : "Logout"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
