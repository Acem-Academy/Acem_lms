import { useEffect, useMemo, useState, useCallback } from "react";
import { Search } from "lucide-react";

import { getCourses } from "@/api/course.api";
import { getMyCourses } from "@/api/enrollment.api";

import CourseCard from "@/components/course/CourseCard";
import { CourseCardSkeleton } from "@/components/common/Skeletons";
import ErrorAlert from "@/components/common/ErrorAlert";
import EmptyState from "@/components/common/EmptyState";
import { getErrorMessage } from "@/utils/errorHandler";

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Fetch Courses + My Enrollments
    |--------------------------------------------------------------------------
    */

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [coursesResponse, enrollmentsResponse] = await Promise.all([
                getCourses(),
                getMyCourses(),
            ]);

            setCourses(coursesResponse.data || []);
            setEnrollments(enrollmentsResponse.data || []);
        } catch (err) {
            console.error("Failed to fetch courses:", err);
            setError(getErrorMessage(err, "Unable to load courses. Please try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    /*
    |--------------------------------------------------------------------------
    | Enrolled Course IDs
    |--------------------------------------------------------------------------
    */

    const enrolledCourseIds = useMemo(() => {
        return new Set(
            enrollments
                .map((enrollment) => {
                    if (!enrollment?.course) {
                        return null;
                    }

                    return typeof enrollment.course === "object"
                        ? enrollment.course._id
                        : enrollment.course;
                })
                .filter(Boolean)
        );
    }, [enrollments]);

    /*
    |--------------------------------------------------------------------------
    | Search Courses
    |--------------------------------------------------------------------------
    */

    const filteredCourses = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return courses;
        }

        return courses.filter((course) => {
            return (
                course.title?.toLowerCase().includes(query) ||
                course.courseCode?.toLowerCase().includes(query) ||
                course.description?.toLowerCase().includes(query)
            );
        });
    }, [courses, searchQuery]);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* ========================================================= */}
            {/* Hero */}
            {/* ========================================================= */}

            <section className="border-b border-[var(--color-border)] bg-black">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16">
                    <div className="max-w-3xl">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                            Learn with ACEM Academy
                        </p>

                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--color-primary)] md:text-5xl">
                            Learn something new today.
                        </h1>

                        <p className="mt-5 text-base sm:text-lg leading-7 sm:leading-8 text-white">
                            Explore our courses, learn at your own pace,
                            and build skills that actually matter.
                        </p>
                    </div>

                    {/* ================================================= */}
                    {/* Search */}
                    {/* ================================================= */}

                    <div className="mt-8 flex max-w-2xl items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition focus-within:border-[var(--color-primary)]">
                        <Search
                            size={20}
                            className="ml-4 shrink-0 text-[var(--color-primary)]"
                        />

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search for courses..."
                            className="
                                h-12
                                flex-1
                                bg-transparent
                                px-4
                                text-sm
                                text-white
                                outline-none
                                placeholder:text-[#777777]
                            "
                        />

                        <button
                            type="button"
                            className="
                                mr-1
                                rounded-lg
                                bg-[var(--color-primary)]
                                px-6
                                py-3
                                text-sm
                                font-semibold
                                text-black
                                transition
                                hover:bg-[var(--color-primary-dark)]
                            "
                        >
                            Search
                        </button>
                    </div>
                </div>
            </section>

            {/* ========================================================= */}
            {/* Courses */}
            {/* ========================================================= */}

            <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
                <div className="mb-8">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--color-primary)]">
                                Explore Courses
                            </h2>

                            <p className="mt-1 text-sm text-white">
                                Find the right course for your learning journey.
                            </p>
                        </div>

                        {!loading && !error && courses.length > 0 && (
                            <p className="text-sm text-[var(--color-text-muted)]">
                                {filteredCourses.length}{" "}
                                {filteredCourses.length === 1
                                    ? "course"
                                    : "courses"}
                            </p>
                        )}
                    </div>
                </div>

                {/* ===================================================== */}
                {/* Loading */}
                {/* ===================================================== */}

                {loading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <CourseCardSkeleton key={idx} />
                        ))}
                    </div>
                )}

                {/* ===================================================== */}
                {/* Error */}
                {/* ===================================================== */}

                {!loading && error && (
                    <ErrorAlert
                        message={error}
                        onRetry={fetchCourses}
                        className="mb-8"
                    />
                )}

                {/* ===================================================== */}
                {/* Empty */}
                {/* ===================================================== */}

                {!loading && !error && filteredCourses.length === 0 && (
                    <EmptyState
                        title={
                            searchQuery
                                ? "No courses match your search"
                                : "No courses available yet"
                        }
                        description={
                            searchQuery
                                ? `We couldn't find any courses matching "${searchQuery}". Try a different keyword.`
                                : "There are currently no courses published. Please check back later."
                        }
                        secondaryAction={
                            searchQuery
                                ? {
                                      label: "Clear Search",
                                      onClick: () => setSearchQuery(""),
                                  }
                                : undefined
                        }
                    />
                )}

                {/* ===================================================== */}
                {/* Course Grid */}
                {/* ===================================================== */}

                {!loading && !error && filteredCourses.length > 0 && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCourses.map((course) => (
                            <CourseCard
                                key={course._id}
                                course={course}
                                isEnrolled={enrolledCourseIds.has(course._id)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Courses;
