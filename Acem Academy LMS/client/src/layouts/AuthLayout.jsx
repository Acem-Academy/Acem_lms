import { GraduationCap } from "lucide-react";

function AuthLayout({ children }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-black">

            {/* ========================================================= */}
            {/* Left Section */}
            {/* ========================================================= */}

            <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12 border-r border-[var(--color-border)]">

                <div>

                    {/* Brand */}

                    <div className="flex items-center gap-3">

                        <div className="flex items-center justify-center rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)]/10 p-3">
                            <GraduationCap
                                className="h-8 w-8 text-[var(--color-primary)]"
                            />
                        </div>

                        <div>

                            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary)]">
                                ACEM Academy
                            </h1>

                            <p className="mt-1 text-sm text-white">
                                Learning Management System
                            </p>

                        </div>

                    </div>


                    {/* Hero Content */}

                    <div className="mt-24">

                        <h2 className="text-5xl font-bold leading-tight tracking-tight text-[var(--color-primary)]">

                            Learn.
                            <br />

                            Build.
                            <br />

                            Grow.

                        </h2>


                        <p className="mt-8 max-w-lg text-lg leading-8 text-white">
                            Empower your learning journey with courses,
                            assignments, quizzes and progress tracking
                            in one modern platform.
                        </p>

                    </div>

                </div>


                {/* Footer */}

                <div className="text-sm text-[var(--color-text-muted)]">

                    © {new Date().getFullYear()} ACEM Academy

                </div>

            </div>


            {/* ========================================================= */}
            {/* Right Section */}
            {/* ========================================================= */}

            <div className="flex min-h-screen items-center justify-center bg-black p-6">

                <div className="w-full max-w-md">

                    {children}

                </div>

            </div>

        </div>
    );
}

export default AuthLayout;