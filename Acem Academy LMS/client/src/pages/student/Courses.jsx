import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { getCourses } from "@/api/course.api";
import { getMyCourses } from "@/api/enrollment.api";

import CourseCard from "@/components/course/CourseCard";

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

    useEffect(() => {

        const fetchCourses = async () => {

            try {

                setLoading(true);
                setError("");

                const [
                    coursesResponse,
                    enrollmentsResponse,
                ] = await Promise.all([
                    getCourses(),
                    getMyCourses(),
                ]);

                setCourses(
                    coursesResponse.data || []
                );

                setEnrollments(
                    enrollmentsResponse.data || []
                );

            } catch (error) {

                console.error(
                    "Failed to fetch courses:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load courses. Please try again."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchCourses();

    }, []);


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

        const query = searchQuery
            .trim()
            .toLowerCase();

        if (!query) {
            return courses;
        }

        return courses.filter((course) => {

            return (
                course.title
                    ?.toLowerCase()
                    .includes(query) ||

                course.courseCode
                    ?.toLowerCase()
                    .includes(query) ||

                course.description
                    ?.toLowerCase()
                    .includes(query)
            );

        });

    }, [courses, searchQuery]);


    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================= */}
            {/* Hero */}
            {/* ========================================================= */}

            <section className="border-b border-[var(--color-border)] bg-black">

                <div className="mx-auto max-w-7xl px-6 py-16">

                    <div className="max-w-3xl">

                        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                            Learn with ACEM Academy
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)] md:text-5xl">
                            Learn something new today.
                        </h1>

                        <p className="mt-5 text-lg leading-8 text-white">
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

            <section className="mx-auto max-w-7xl px-6 py-12">

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

                    <div className="flex min-h-60 items-center justify-center">

                        <div className="flex items-center gap-3 text-sm text-white">

                            <div
                                className="
                                    h-4
                                    w-4
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-[var(--color-border)]
                                    border-t-[var(--color-primary)]
                                "
                            />

                            Loading courses...

                        </div>

                    </div>

                )}


                {/* ===================================================== */}
                {/* Error */}
                {/* ===================================================== */}

                {!loading && error && (

                    <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-400">
                        {error}
                    </div>

                )}


                {/* ===================================================== */}
                {/* Empty */}
                {/* ===================================================== */}

                {!loading &&
                    !error &&
                    filteredCourses.length === 0 && (

                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">

                            <h3 className="text-lg font-semibold text-[var(--color-primary)]">
                                {searchQuery
                                    ? "No courses found"
                                    : "No courses available"}
                            </h3>

                            <p className="mt-2 text-sm text-white">

                                {searchQuery
                                    ? "Try searching with a different course name or code."
                                    : "There are currently no courses available."}

                            </p>

                        </div>

                    )}


                {/* ===================================================== */}
                {/* Course Grid */}
                {/* ===================================================== */}

                {!loading &&
                    !error &&
                    filteredCourses.length > 0 && (

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                            {filteredCourses.map((course) => (

                                <CourseCard
                                    key={course._id}
                                    course={course}
                                    isEnrolled={enrolledCourseIds.has(
                                        course._id
                                    )}
                                />

                            ))}

                        </div>

                    )}

            </section>

        </div>

    );

};

export default Courses;