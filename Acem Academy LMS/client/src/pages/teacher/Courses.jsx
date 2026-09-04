import { useEffect, useState } from "react";
import {
    Plus,
    BookOpen,
    Clock3,
    ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyCourses } from "@/api/teacher.api";
import { ROUTES } from "@/config/routes";

const TeacherCourses = () => {

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        const fetchMyCourses = async () => {

            try {

                setLoading(true);
                setError("");

                const response = await getMyCourses();

                setCourses(response.data || []);

            } catch (error) {

                console.error(
                    "Failed to fetch teacher courses:",
                    error
                );

                setError(
                    "Unable to load your courses. Please try again."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchMyCourses();

    }, []);

    return (
        <div className="min-h-screen bg-black text-white">

            <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">

                {/* ================================================= */}
                {/* Header */}
                {/* ================================================= */}

                <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                            Teacher Panel
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                            My Courses
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                            Manage the courses you have created.
                        </p>

                    </div>

                    {/* Create Course */}

                    <Link
                        to="/teacher/courses/create"
                        className="
                            inline-flex
                            w-fit
                            items-center
                            gap-2
                            rounded-xl
                            bg-[var(--color-primary)]
                            px-5
                            py-3
                            text-sm
                            font-bold
                            text-black
                            transition
                            hover:bg-[var(--color-primary-dark)]
                        "
                    >
                        <Plus size={18} />
                        Create Course
                    </Link>

                </section>


                {/* ================================================= */}
                {/* Course Count */}
                {/* ================================================= */}

                {!loading && !error && (
                    <div className="mt-8">

                        <p className="text-sm text-[var(--color-text-muted)]">
                            {courses.length}{" "}
                            {courses.length === 1 ? "course" : "courses"}
                        </p>

                    </div>
                )}


                {/* ================================================= */}
                {/* Loading */}
                {/* ================================================= */}

                {loading && (

                    <div className="flex min-h-64 items-center justify-center">

                        <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">

                            <div
                                className="
                                    h-5
                                    w-5
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


                {/* ================================================= */}
                {/* Error */}
                {/* ================================================= */}

                {!loading && error && (

                    <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-6">

                        <p className="text-sm text-red-400">
                            {error}
                        </p>

                    </div>

                )}


                {/* ================================================= */}
                {/* Empty */}
                {/* ================================================= */}

                {!loading &&
                    !error &&
                    courses.length === 0 && (

                        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]">

                                <BookOpen
                                    size={28}
                                    className="text-black"
                                />

                            </div>

                            <h2 className="mt-5 text-xl font-bold text-white">
                                No courses yet
                            </h2>

                            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
                                You haven't created any courses yet.
                                Start by creating your first course.
                            </p>

                            <Link
                                to="/teacher/courses/create"
                                className="
                                    mt-6
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    bg-[var(--color-primary)]
                                    px-5
                                    py-3
                                    text-sm
                                    font-bold
                                    text-black
                                    transition
                                    hover:bg-[var(--color-primary-dark)]
                                "
                            >
                                <Plus size={18} />
                                Create Course
                            </Link>

                        </div>

                    )}


                {/* ================================================= */}
                {/* Course Grid */}
                {/* ================================================= */}

                {!loading &&
                    !error &&
                    courses.length > 0 && (

                        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                            {courses.map((course) => {

                                const durationInHours = Math.round(
                                    course.duration / 60
                                );

                                return (

                                    <article
                                        key={course._id}
                                        className="
                                            overflow-hidden
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            transition
                                            duration-200
                                            hover:-translate-y-1
                                            hover:border-[var(--color-primary)]
                                        "
                                    >

                                        {/* Thumbnail */}

                                        <div className="aspect-[16/9] overflow-hidden bg-black">

                                            {course.thumbnail ? (

                                                <img
                                                    src={course.thumbnail}
                                                    alt={course.title}
                                                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                                />

                                            ) : (

                                                <div className="flex h-full items-center justify-center">

                                                    <BookOpen
                                                        size={42}
                                                        className="text-[var(--color-primary)]"
                                                    />

                                                </div>

                                            )}

                                        </div>


                                        {/* Content */}

                                        <div className="p-5">

                                            <div className="flex items-center justify-between gap-3">

                                                <span className="
                                                    rounded-full
                                                    bg-[var(--color-primary)]
                                                    px-3
                                                    py-1
                                                    text-xs
                                                    font-bold
                                                    text-black
                                                ">
                                                    {course.courseCode}
                                                </span>


                                                <span
                                                    className={`
                                                        rounded-full
                                                        px-3
                                                        py-1
                                                        text-xs
                                                        font-semibold
                                                        ${
                                                            course.status === "published"
                                                                ? "bg-green-950 text-green-400"
                                                                : "bg-yellow-950 text-yellow-400"
                                                        }
                                                    `}
                                                >
                                                    {course.status}
                                                </span>

                                            </div>


                                            <h2 className="mt-4 line-clamp-1 text-xl font-bold text-white">
                                                {course.title}
                                            </h2>


                                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
                                                {course.description}
                                            </p>


                                            {/* Meta */}

                                            <div className="mt-4 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">

                                                <span className="flex items-center gap-1.5">

                                                    <Clock3 size={14} />

                                                    {durationInHours}h

                                                </span>

                                                <span>
                                                    {course.price === 0
                                                        ? "Free"
                                                        : `₹${course.price}`}
                                                </span>

                                            </div>


                                            {/* Manage */}

                                            <div className="mt-5 border-t border-[var(--color-border)] pt-4">

                                                <Link
    to={`/teacher/courses/${course._id}`}
    className="
        flex
        w-full
        items-center
        justify-between
        text-sm
        font-semibold
        text-[var(--color-primary)]
    "
>
    Manage Course

    <ArrowRight size={17} />
</Link>

                                            </div>

                                        </div>

                                    </article>

                                );

                            })}

                        </div>

                    )}

            </div>

        </div>
    );
};

export default TeacherCourses;