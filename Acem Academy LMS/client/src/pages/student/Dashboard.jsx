import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    CheckCircle2,
    Clock3,
    PlayCircle,
    ArrowRight,
    Loader2,
    Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyCourses } from "@/api/enrollment.api";
import { getCourses } from "@/api/course.api";

const Dashboard = () => {

    const [enrollments, setEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    /*
    |--------------------------------------------------------------------------
    | Fetch Dashboard Data
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchDashboard = async () => {

            try {

                setLoading(true);
                setError("");

                const [
                    enrollmentResponse,
                    courseResponse,
                ] = await Promise.all([
                    getMyCourses(),
                    getCourses(),
                ]);

                setEnrollments(
                    enrollmentResponse.data || []
                );

                setCourses(
                    courseResponse.data || []
                );

            } catch (error) {

                console.error(
                    "Failed to load dashboard:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load dashboard."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchDashboard();

    }, []);


    /*
    |--------------------------------------------------------------------------
    | Statistics
    |--------------------------------------------------------------------------
    */

    const statistics = useMemo(() => {

        const completed =
            enrollments.filter(
                (enrollment) =>
                    enrollment.progress >= 100 ||
                    enrollment.status === "completed"
            ).length;

        const inProgress =
            enrollments.filter(
                (enrollment) =>
                    enrollment.status === "active" &&
                    enrollment.progress < 100
            ).length;

        const totalProgress =
            enrollments.length > 0
                ? Math.round(
                    enrollments.reduce(
                        (total, enrollment) =>
                            total +
                            Number(
                                enrollment.progress || 0
                            ),
                        0
                    ) / enrollments.length
                )
                : 0;

        return {
            enrolled: enrollments.length,
            inProgress,
            completed,
            totalProgress,
        };

    }, [enrollments]);


    /*
    |--------------------------------------------------------------------------
    | Continue Learning
    |--------------------------------------------------------------------------
    */

    const continueLearning = useMemo(() => {

        const activeCourses =
            enrollments
                .filter(
                    (enrollment) =>
                        enrollment.status === "active" &&
                        enrollment.progress < 100
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.updatedAt || b.enrolledAt
                        ) -
                        new Date(
                            a.updatedAt || a.enrolledAt
                        )
                );

        if (activeCourses.length === 0) {
            return null;
        }

        return activeCourses[0];

    }, [enrollments]);


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (

            <div className="flex min-h-[70vh] items-center justify-center bg-black">

                <div className="flex items-center gap-3 text-sm text-white">

                    <Loader2
                        size={19}
                        className="animate-spin text-[var(--color-primary)]"
                    />

                    Loading dashboard...

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

    if (error) {

        return (

            <div className="min-h-screen bg-black text-white">

                <div className="mx-auto max-w-7xl px-6 py-10">

                    <div
                        className="
                            rounded-2xl
                            border
                            border-red-900
                            bg-red-950/30
                            p-5
                            text-sm
                            text-red-400
                        "
                    >
                        {error}
                    </div>

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================== */}
            {/* Welcome Hero */}
            {/* ========================================================== */}

            <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-black">

                {/* Decorative Glow */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-32
                        -top-32
                        h-80
                        w-80
                        rounded-full
                        bg-[var(--color-primary)]
                        opacity-[0.06]
                        blur-3xl
                    "
                />

                <div
                    className="
                        pointer-events-none
                        absolute
                        -bottom-40
                        left-1/3
                        h-72
                        w-72
                        rounded-full
                        bg-[var(--color-primary)]
                        opacity-[0.04]
                        blur-3xl
                    "
                />


                <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">

                    <div className="max-w-3xl">

                        <div className="mb-5 flex items-center gap-2">

                            <div
                                className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-[var(--color-primary)]/10
                                "
                            >

                                <Sparkles
                                    size={16}
                                    className="text-[var(--color-primary)]"
                                />

                            </div>

                            <span
                                className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-[0.2em]
                                    text-[var(--color-primary)]
                                "
                            >
                                ACEM Academy
                            </span>

                        </div>


                        <h1
                            className="
                                text-4xl
                                font-bold
                                tracking-tight
                                text-white
                                md:text-5xl
                            "
                        >
                            Welcome back{" "}
                            <span className="text-[var(--color-primary)]">
                                👋
                            </span>
                        </h1>


                        <p
                            className="
                                mt-4
                                max-w-2xl
                                text-base
                                leading-7
                                text-[var(--color-text-muted)]
                                md:text-lg
                            "
                        >
                            Keep learning, keep building, and
                            keep moving forward with your
                            learning journey.
                        </p>


                        <div className="mt-7 flex flex-wrap gap-3">

                            <Link
                                to={
                                    continueLearning
                                        ? `/student/learning/${continueLearning._id}`
                                        : "/student/courses"
                                }
                                className="
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

                                <PlayCircle size={17} />

                                {continueLearning
                                    ? "Continue Learning"
                                    : "Explore Courses"}

                                <ArrowRight size={16} />

                            </Link>


                            <Link
                                to="/student/my-learning"
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-[var(--color-surface)]
                                    px-5
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:border-[var(--color-primary)]/50
                                    hover:text-[var(--color-primary)]
                                "
                            >
                                My Learning
                            </Link>

                        </div>

                    </div>

                </div>

            </section>


            {/* ========================================================== */}
            {/* Main */}
            {/* ========================================================== */}

            <main className="mx-auto max-w-7xl px-6 py-10">


                {/* ====================================================== */}
                {/* Stats */}
                {/* ====================================================== */}

                <section>

                    <div className="mb-5">

                        <h2 className="text-lg font-bold text-white">
                            Your Learning Overview
                        </h2>

                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                            A quick look at your current learning activity.
                        </p>

                    </div>


                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


                        {/* Enrolled */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-5
                                transition
                                hover:-translate-y-0.5
                                hover:border-[var(--color-primary)]/40
                            "
                        >

                            <div className="flex items-start justify-between">

                                <div>

                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Enrolled Courses
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {statistics.enrolled}
                                    </p>

                                </div>

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-[var(--color-primary)]/10
                                    "
                                >

                                    <BookOpen
                                        size={19}
                                        className="text-[var(--color-primary)]"
                                    />

                                </div>

                            </div>

                        </div>


                        {/* In Progress */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-5
                                transition
                                hover:-translate-y-0.5
                                hover:border-[var(--color-primary)]/40
                            "
                        >

                            <div className="flex items-start justify-between">

                                <div>

                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        In Progress
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {statistics.inProgress}
                                    </p>

                                </div>

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-[var(--color-primary)]/10
                                    "
                                >

                                    <Clock3
                                        size={19}
                                        className="text-[var(--color-primary)]"
                                    />

                                </div>

                            </div>

                        </div>


                        {/* Completed */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-5
                                transition
                                hover:-translate-y-0.5
                                hover:border-[var(--color-primary)]/40
                            "
                        >

                            <div className="flex items-start justify-between">

                                <div>

                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Completed
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {statistics.completed}
                                    </p>

                                </div>

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-[var(--color-primary)]/10
                                    "
                                >

                                    <CheckCircle2
                                        size={19}
                                        className="text-[var(--color-primary)]"
                                    />

                                </div>

                            </div>

                        </div>


                        {/* Overall Progress */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-5
                                transition
                                hover:-translate-y-0.5
                                hover:border-[var(--color-primary)]/40
                            "
                        >

                            <div className="flex items-start justify-between">

                                <div>

                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Overall Progress
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {statistics.totalProgress}%
                                    </p>

                                </div>

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-[var(--color-primary)]/10
                                    "
                                >

                                    <span className="text-sm font-bold text-[var(--color-primary)]">
                                        %
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ====================================================== */}
                {/* Continue Learning */}
                {/* ====================================================== */}

                <section className="mt-12">

                    <div className="flex items-end justify-between gap-4">

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-[0.15em]
                                    text-[var(--color-primary)]
                                "
                            >
                                Pick up where you left off
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-white">
                                Continue Learning
                            </h2>

                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Jump back into your active course.
                            </p>

                        </div>


                        <Link
                            to="/student/my-learning"
                            className="
                                hidden
                                items-center
                                gap-1.5
                                text-sm
                                font-semibold
                                text-[var(--color-primary)]
                                transition
                                hover:text-[var(--color-primary-dark)]
                                sm:flex
                            "
                        >
                            View My Learning
                            <ArrowRight size={16} />
                        </Link>

                    </div>


                    {continueLearning ? (

                        <div
                            className="
                                mt-6
                                overflow-hidden
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                            "
                        >

                            <div className="flex flex-col lg:flex-row">


                                {/* Thumbnail */}

                                <div className="h-64 w-full shrink-0 bg-[#151515] lg:h-auto lg:w-[380px]">

                                    {continueLearning.course?.thumbnail ? (

                                        <img
                                            src={
                                                continueLearning
                                                    .course
                                                    .thumbnail
                                            }
                                            alt={
                                                continueLearning
                                                    .course
                                                    .title
                                            }
                                            className="
                                                h-full
                                                w-full
                                                object-cover
                                            "
                                        />

                                    ) : (

                                        <div
                                            className="
                                                flex
                                                h-full
                                                min-h-64
                                                items-center
                                                justify-center
                                                bg-[var(--color-primary)]/5
                                                px-8
                                                text-center
                                            "
                                        >

                                            <div>

                                                <BookOpen
                                                    size={42}
                                                    className="
                                                        mx-auto
                                                        text-[var(--color-primary)]
                                                    "
                                                />

                                                <span
                                                    className="
                                                        mt-4
                                                        block
                                                        text-2xl
                                                        font-bold
                                                        text-[var(--color-primary)]
                                                    "
                                                >
                                                    {
                                                        continueLearning
                                                            .course
                                                            ?.title
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                    )}

                                </div>


                                {/* Details */}

                                <div className="flex flex-1 flex-col p-7">

                                    <span
                                        className="
                                            w-fit
                                            rounded-full
                                            border
                                            border-[var(--color-primary)]/30
                                            bg-[var(--color-primary)]/10
                                            px-3
                                            py-1
                                            text-xs
                                            font-bold
                                            text-[var(--color-primary)]
                                        "
                                    >
                                        {
                                            continueLearning
                                                .course
                                                ?.courseCode
                                        }
                                    </span>


                                    <h3
                                        className="
                                            mt-4
                                            text-2xl
                                            font-bold
                                            text-white
                                        "
                                    >
                                        {
                                            continueLearning
                                                .course
                                                ?.title
                                        }
                                    </h3>


                                    <p
                                        className="
                                            mt-2
                                            max-w-2xl
                                            line-clamp-2
                                            text-sm
                                            leading-6
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        {
                                            continueLearning
                                                .course
                                                ?.description
                                        }
                                    </p>


                                    {/* Progress */}

                                    <div className="mt-7 max-w-2xl">

                                        <div className="mb-2 flex items-center justify-between">

                                            <span className="text-xs font-medium text-[var(--color-text-muted)]">
                                                Course Progress
                                            </span>

                                            <span className="text-xs font-bold text-[var(--color-primary)]">
                                                {
                                                    continueLearning.progress
                                                }%
                                            </span>

                                        </div>


                                        <div
                                            className="
                                                h-2
                                                overflow-hidden
                                                rounded-full
                                                bg-[#292929]
                                            "
                                        >

                                            <div
                                                className="
                                                    h-full
                                                    rounded-full
                                                    bg-[var(--color-primary)]
                                                    transition-all
                                                "
                                                style={{
                                                    width: `${continueLearning.progress}%`,
                                                }}
                                            />

                                        </div>

                                    </div>


                                    {/* Last accessed */}

                                    <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">

                                        <Clock3
                                            size={14}
                                            className="text-[var(--color-primary)]"
                                        />

                                        {continueLearning.lastAccessedLesson
                                            ? "Continue from your last lesson"
                                            : "Ready to start learning"}

                                    </div>


                                    {/* Button */}

                                    <div className="mt-6">

                                        <Link
                                            to={`/student/learning/${continueLearning._id}`}
                                            className="
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

                                            <PlayCircle size={17} />

                                            Continue Learning

                                            <ArrowRight size={16} />

                                        </Link>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ) : (

                        <div
                            className="
                                mt-6
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-10
                                text-center
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-[var(--color-primary)]/10
                                "
                            >

                                <BookOpen
                                    size={25}
                                    className="text-[var(--color-primary)]"
                                />

                            </div>


                            <h3 className="mt-5 text-lg font-bold text-white">
                                Start your learning journey
                            </h3>


                            <p
                                className="
                                    mx-auto
                                    mt-2
                                    max-w-md
                                    text-sm
                                    leading-6
                                    text-[var(--color-text-muted)]
                                "
                            >
                                You don't have an active course yet.
                                Explore the available courses and start
                                learning today.
                            </p>


                            <Link
                                to="/student/courses"
                                className="
                                    mt-5
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
                                Explore Courses
                                <ArrowRight size={17} />
                            </Link>

                        </div>

                    )}

                </section>


                {/* ====================================================== */}
                {/* Explore Courses */}
                {/* ====================================================== */}

                <section className="mt-14">

                    <div className="flex items-end justify-between gap-4">

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-[0.15em]
                                    text-[var(--color-primary)]
                                "
                            >
                                Discover
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-white">
                                Explore Courses
                            </h2>

                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Find something new to learn.
                            </p>

                        </div>


                        <Link
                            to="/student/courses"
                            className="
                                hidden
                                items-center
                                gap-1.5
                                text-sm
                                font-semibold
                                text-[var(--color-primary)]
                                transition
                                hover:text-[var(--color-primary-dark)]
                                sm:flex
                            "
                        >
                            View All
                            <ArrowRight size={16} />
                        </Link>

                    </div>


                    {courses.length === 0 ? (

                        <div
                            className="
                                mt-6
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-10
                                text-center
                                text-sm
                                text-[var(--color-text-muted)]
                            "
                        >
                            No courses available right now.
                        </div>

                    ) : (

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                            {courses
                                .slice(0, 3)
                                .map((course) => (

                                    <article
                                        key={course._id}
                                        className="
                                            group
                                            overflow-hidden
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            transition
                                            duration-200
                                            hover:-translate-y-1
                                            hover:border-[var(--color-primary)]/40
                                            hover:shadow-[0_0_35px_rgba(255,227,110,0.07)]
                                        "
                                    >


                                        {/* Thumbnail */}

                                        <Link
                                            to={`/student/courses/${course._id}`}
                                        >

                                            <div className="relative h-48 overflow-hidden bg-[#151515]">

                                                {course.thumbnail ? (

                                                    <img
                                                        src={
                                                            course.thumbnail
                                                        }
                                                        alt={
                                                            course.title
                                                        }
                                                        className="
                                                            h-full
                                                            w-full
                                                            object-cover
                                                            transition
                                                            duration-500
                                                            group-hover:scale-105
                                                        "
                                                    />

                                                ) : (

                                                    <div
                                                        className="
                                                            flex
                                                            h-full
                                                            items-center
                                                            justify-center
                                                            bg-[var(--color-primary)]/5
                                                            px-6
                                                            text-center
                                                        "
                                                    >

                                                        <span
                                                            className="
                                                                text-xl
                                                                font-bold
                                                                text-[var(--color-primary)]
                                                            "
                                                        >
                                                            {
                                                                course.title
                                                            }
                                                        </span>

                                                    </div>

                                                )}

                                            </div>

                                        </Link>


                                        {/* Details */}

                                        <div className="p-5">

                                            <div className="flex items-center justify-between gap-3">

                                                <span
                                                    className="
                                                        text-xs
                                                        font-bold
                                                        text-[var(--color-primary)]
                                                    "
                                                >
                                                    {
                                                        course.courseCode
                                                    }
                                                </span>


                                                <span
                                                    className="
                                                        text-xs
                                                        font-semibold
                                                        text-[var(--color-text-muted)]
                                                    "
                                                >
                                                    {course.price === 0
                                                        ? "Free"
                                                        : `₹${course.price}`}
                                                </span>

                                            </div>


                                            <Link
                                                to={`/student/courses/${course._id}`}
                                            >

                                                <h3
                                                    className="
                                                        mt-3
                                                        line-clamp-1
                                                        text-lg
                                                        font-bold
                                                        text-white
                                                        transition
                                                        group-hover:text-[var(--color-primary)]
                                                    "
                                                >
                                                    {
                                                        course.title
                                                    }
                                                </h3>

                                            </Link>


                                            <p
                                                className="
                                                    mt-2
                                                    line-clamp-2
                                                    min-h-12
                                                    text-sm
                                                    leading-6
                                                    text-[var(--color-text-muted)]
                                                "
                                            >
                                                {
                                                    course.description
                                                }
                                            </p>


                                            <div
                                                className="
                                                    mt-5
                                                    flex
                                                    items-center
                                                    justify-between
                                                    border-t
                                                    border-[var(--color-border)]
                                                    pt-4
                                                "
                                            >

                                                <span className="text-xs text-[var(--color-text-muted)]">
                                                    {Math.round(
                                                        course.duration / 60
                                                    )}{" "}
                                                    hours
                                                </span>


                                                <Link
                                                    to={`/student/courses/${course._id}`}
                                                    className="
                                                        inline-flex
                                                        items-center
                                                        gap-1.5
                                                        text-sm
                                                        font-bold
                                                        text-[var(--color-primary)]
                                                        transition
                                                        hover:text-[var(--color-primary-dark)]
                                                    "
                                                >

                                                    View Course

                                                    <ArrowRight
                                                        size={15}
                                                    />

                                                </Link>

                                            </div>

                                        </div>

                                    </article>

                                ))}

                        </div>

                    )}

                </section>


                {/* ====================================================== */}
                {/* Bottom CTA */}
                {/* ====================================================== */}

                <section className="mt-14 pb-6">

                    <div
                        className="
                            relative
                            overflow-hidden
                            rounded-2xl
                            border
                            border-[var(--color-primary)]/20
                            bg-[var(--color-primary)]/5
                            p-7
                            md:p-9
                        "
                    >

                        <div
                            className="
                                pointer-events-none
                                absolute
                                -right-20
                                -top-20
                                h-48
                                w-48
                                rounded-full
                                bg-[var(--color-primary)]
                                opacity-[0.08]
                                blur-3xl
                            "
                        />


                        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                            <div>

                                <p
                                    className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-[0.15em]
                                        text-[var(--color-primary)]
                                    "
                                >
                                    Keep going
                                </p>

                                <h2 className="mt-2 text-xl font-bold text-white md:text-2xl">
                                    Ready to learn something new?
                                </h2>

                                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
                                    Explore more courses and continue
                                    building your skills with ACEM Academy.
                                </p>

                            </div>


                            <Link
                                to="/student/courses"
                                className="
                                    inline-flex
                                    shrink-0
                                    items-center
                                    justify-center
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

                                Browse Courses

                                <ArrowRight size={17} />

                            </Link>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
};

export default Dashboard;