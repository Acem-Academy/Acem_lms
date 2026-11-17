import { useCallback, useEffect, useState } from "react";
import {
    Plus,
    BookOpen,
    Clock3,
    ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyCourses } from "@/api/teacher.api";
import { getErrorMessage } from "@/utils/errorHandler";
import { CourseCardSkeleton } from "@/components/common/Skeletons";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";

const TeacherCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMyCourses = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getMyCourses();
            setCourses(response.data || []);
        } catch (err) {
            console.error("Failed to fetch teacher courses:", err);
            setError(getErrorMessage(err, "Unable to load your courses. Please try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyCourses();
    }, [fetchMyCourses]);

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">
                {/* Header */}
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

                {/* Course Count */}
                {!loading && !error && courses.length > 0 && (
                    <div className="mt-8">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {courses.length} {courses.length === 1 ? "course" : "courses"}
                        </p>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="mt-8">
                        <CourseCardSkeleton count={3} />
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="mt-8">
                        <ErrorAlert message={error} onRetry={fetchMyCourses} />
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && courses.length === 0 && (
                    <div className="mt-8">
                        <EmptyState
                            icon={BookOpen}
                            title="No courses yet"
                            description="You haven't created any courses yet. Start by creating your first course."
                            actionLabel="Create Course"
                            actionTo="/teacher/courses/create"
                            actionIcon={Plus}
                        />
                    </div>
                )}

                {/* Course Grid */}
                {!loading && !error && courses.length > 0 && (
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course) => {
                            const durationInHours = Math.round(
                                (course.duration || 0) / 60
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
