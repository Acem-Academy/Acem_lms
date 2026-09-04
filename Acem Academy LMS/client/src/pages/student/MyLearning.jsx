import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    Clock3,
    PlayCircle,
    CheckCircle2,
    Loader2,
    ArrowRight,
    Trophy,
    GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyCourses } from "@/api/enrollment.api";

const MyLearning = () => {

    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    /*
    |--------------------------------------------------------------------------
    | Fetch My Courses
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchMyCourses = async () => {

            try {

                setLoading(true);
                setError("");

                const response = await getMyCourses();

                setEnrollments(
                    response.data || []
                );

            } catch (error) {

                console.error(
                    "Failed to fetch my courses:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load your courses."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchMyCourses();

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
                    Number(enrollment.progress || 0) >= 100 ||
                    enrollment.status === "completed"
            ).length;

        const inProgress =
            enrollments.filter(
                (enrollment) =>
                    enrollment.status === "active" &&
                    Number(enrollment.progress || 0) < 100
            ).length;

        const totalProgress =
            enrollments.length > 0
                ? Math.round(
                    enrollments.reduce(
                        (total, enrollment) =>
                            total +
                            Number(enrollment.progress || 0),
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

        return (
            enrollments
                .filter(
                    (enrollment) =>
                        enrollment.status === "active" &&
                        Number(enrollment.progress || 0) < 100
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.updatedAt || b.enrolledAt
                        ) -
                        new Date(
                            a.updatedAt || a.enrolledAt
                        )
                )[0] || null
        );

    }, [enrollments]);


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black">

                <div className="flex items-center gap-3 text-sm text-white">

                    <Loader2
                        size={19}
                        className="animate-spin text-[var(--color-primary)]"
                    />

                    Loading your learning...

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

            <div className="min-h-screen bg-black px-6 py-12">

                <div className="mx-auto max-w-7xl">

                    <div
                        className="
                            rounded-2xl
                            border
                            border-red-900
                            bg-red-950/30
                            p-6
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
    | My Learning
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================== */}
            {/* Hero */}
            {/* ========================================================== */}

            <section
                className="
                    relative
                    overflow-hidden
                    border-b
                    border-[var(--color-border)]
                    bg-black
                "
            >

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

                        <div className="flex items-center gap-2">

                            <div
                                className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-[var(--color-primary)]/10
                                "
                            >

                                <GraduationCap
                                    size={19}
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
                                My Learning
                            </span>

                        </div>


                        <h1
                            className="
                                mt-5
                                text-4xl
                                font-bold
                                tracking-tight
                                text-white
                                md:text-5xl
                            "
                        >
                            Continue your{" "}
                            <span className="text-[var(--color-primary)]">
                                learning journey.
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
                            Pick up where you left off and keep
                            making progress through your enrolled
                            courses.
                        </p>

                    </div>

                </div>

            </section>


            {/* ========================================================== */}
            {/* Main */}
            {/* ========================================================== */}

            <main className="mx-auto max-w-7xl px-6 py-10">


                {/* ====================================================== */}
                {/* Empty State */}
                {/* ====================================================== */}

                {enrollments.length === 0 ? (

                    <div
                        className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-[var(--color-border)]
                            bg-[var(--color-surface)]
                            px-6
                            py-16
                            text-center
                        "
                    >

                        <div
                            className="
                                mx-auto
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-[var(--color-primary)]/10
                            "
                        >

                            <BookOpen
                                size={28}
                                className="text-[var(--color-primary)]"
                            />

                        </div>


                        <h2
                            className="
                                mt-6
                                text-2xl
                                font-bold
                                text-white
                            "
                        >
                            You haven't enrolled in any courses yet
                        </h2>


                        <p
                            className="
                                mx-auto
                                mt-3
                                max-w-md
                                text-sm
                                leading-6
                                text-[var(--color-text-muted)]
                            "
                        >
                            Explore our courses and start learning
                            something new today.
                        </p>


                        <Link
                            to="/student/courses"
                            className="
                                mt-7
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-[var(--color-primary)]
                                px-6
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

                ) : (

                    <>


                        {/* ================================================== */}
                        {/* Statistics */}
                        {/* ================================================== */}

                        <section>

                            <div className="mb-5">

                                <p
                                    className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-[0.15em]
                                        text-[var(--color-primary)]
                                    "
                                >
                                    Your Progress
                                </p>

                                <h2 className="mt-2 text-xl font-bold text-white">
                                    Learning Overview
                                </h2>

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

                                            <PlayCircle
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

                                            <Trophy
                                                size={19}
                                                className="text-[var(--color-primary)]"
                                            />

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </section>


                        {/* ================================================== */}
                        {/* Continue Learning */}
                        {/* ================================================== */}

                        {continueLearning && (

                            <section className="mt-12">

                                <div className="mb-5">

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

                                </div>


                                <div
                                    className="
                                        overflow-hidden
                                        rounded-2xl
                                        border
                                        border-[var(--color-border)]
                                        bg-[var(--color-surface)]
                                    "
                                >

                                    <div className="flex flex-col lg:flex-row">


                                        {/* Thumbnail */}

                                        <div
                                            className="
                                                h-60
                                                w-full
                                                shrink-0
                                                bg-[#151515]
                                                lg:h-auto
                                                lg:min-h-[290px]
                                                lg:w-[380px]
                                            "
                                        >

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
                                                        items-center
                                                        justify-center
                                                        bg-[var(--color-primary)]/5
                                                        p-8
                                                        text-center
                                                    "
                                                >

                                                    <div>

                                                        <BookOpen
                                                            size={44}
                                                            className="
                                                                mx-auto
                                                                text-[var(--color-primary)]
                                                            "
                                                        />

                                                        <p
                                                            className="
                                                                mt-4
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
                                                        </p>

                                                    </div>

                                                </div>

                                            )}

                                        </div>


                                        {/* Content */}

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

                                                    <span className="text-xs text-[var(--color-text-muted)]">
                                                        Course Progress
                                                    </span>

                                                    <span className="text-xs font-bold text-[var(--color-primary)]">
                                                        {
                                                            continueLearning.progress
                                                        }%
                                                    </span>

                                                </div>


                                                <div className="h-2 overflow-hidden rounded-full bg-[#292929]">

                                                    <div
                                                        className="
                                                            h-full
                                                            rounded-full
                                                            bg-[var(--color-primary)]
                                                            transition-all
                                                        "
                                                        style={{
                                                            width: `${continueLearning.progress || 0}%`,
                                                        }}
                                                    />

                                                </div>

                                            </div>


                                            <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">

                                                <Clock3
                                                    size={14}
                                                    className="text-[var(--color-primary)]"
                                                />

                                                {continueLearning.lastAccessedLesson
                                                    ? "Continue from your last lesson"
                                                    : "Ready to start learning"}

                                            </div>


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

                            </section>

                        )}


                        {/* ================================================== */}
                        {/* Your Courses */}
                        {/* ================================================== */}

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
                                        Library
                                    </p>

                                    <h2 className="mt-2 text-2xl font-bold text-white">
                                        Your Courses
                                    </h2>

                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                        All the courses you've enrolled in.
                                    </p>

                                </div>

                            </div>


                            <div className="mt-6 space-y-5">

                                {enrollments.map(
                                    (enrollment) => {

                                        const course =
                                            enrollment.course;

                                        const progress =
                                            Number(
                                                enrollment.progress || 0
                                            );

                                        const durationInHours =
                                            Math.round(
                                                Number(
                                                    course?.duration || 0
                                                ) / 60
                                            );

                                        const completed =
                                            progress >= 100 ||
                                            enrollment.status ===
                                                "completed";


                                        return (

                                            <article
                                                key={
                                                    enrollment._id
                                                }
                                                className="
                                                    group
                                                    overflow-hidden
                                                    rounded-2xl
                                                    border
                                                    border-[var(--color-border)]
                                                    bg-[var(--color-surface)]
                                                    transition
                                                    duration-200
                                                    hover:-translate-y-0.5
                                                    hover:border-[var(--color-primary)]/40
                                                    hover:shadow-[0_0_35px_rgba(255,227,110,0.06)]
                                                "
                                            >

                                                <div className="flex flex-col md:flex-row">


                                                    {/* ============================================ */}
                                                    {/* Thumbnail */}
                                                    {/* ============================================ */}

                                                    <Link
                                                        to={`/student/learning/${enrollment._id}`}
                                                        className="
                                                            h-56
                                                            w-full
                                                            shrink-0
                                                            overflow-hidden
                                                            bg-[#151515]
                                                            md:h-auto
                                                            md:min-h-[285px]
                                                            md:w-72
                                                        "
                                                    >

                                                        {course?.thumbnail ? (

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
                                                                    min-h-56
                                                                    items-center
                                                                    justify-center
                                                                    bg-[var(--color-primary)]/5
                                                                    px-6
                                                                    text-center
                                                                "
                                                            >

                                                                <div>

                                                                    <BookOpen
                                                                        size={38}
                                                                        className="
                                                                            mx-auto
                                                                            text-[var(--color-primary)]
                                                                        "
                                                                    />

                                                                    <span
                                                                        className="
                                                                            mt-4
                                                                            block
                                                                            text-xl
                                                                            font-bold
                                                                            text-[var(--color-primary)]
                                                                        "
                                                                    >
                                                                        {
                                                                            course?.title
                                                                        }
                                                                    </span>

                                                                </div>

                                                            </div>

                                                        )}

                                                    </Link>


                                                    {/* ============================================ */}
                                                    {/* Details */}
                                                    {/* ============================================ */}

                                                    <div className="flex flex-1 flex-col p-6 md:p-7">


                                                        <div
                                                            className="
                                                                flex
                                                                flex-col
                                                                justify-between
                                                                gap-4
                                                                sm:flex-row
                                                            "
                                                        >

                                                            <div>

                                                                <span
                                                                    className="
                                                                        inline-flex
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
                                                                        course?.courseCode
                                                                    }
                                                                </span>


                                                                <h3
                                                                    className="
                                                                        mt-3
                                                                        text-xl
                                                                        font-bold
                                                                        text-white
                                                                        transition
                                                                        group-hover:text-[var(--color-primary)]
                                                                    "
                                                                >
                                                                    {
                                                                        course?.title
                                                                    }
                                                                </h3>


                                                                <p
                                                                    className="
                                                                        mt-2
                                                                        line-clamp-2
                                                                        max-w-2xl
                                                                        text-sm
                                                                        leading-6
                                                                        text-[var(--color-text-muted)]
                                                                    "
                                                                >
                                                                    {
                                                                        course?.description
                                                                    }
                                                                </p>

                                                            </div>


                                                            {/* Status */}

                                                            <div className="shrink-0">

                                                                {completed ? (

                                                                    <span
                                                                        className="
                                                                            inline-flex
                                                                            items-center
                                                                            gap-1.5
                                                                            rounded-full
                                                                            border
                                                                            border-[var(--color-primary)]/30
                                                                            bg-[var(--color-primary)]/10
                                                                            px-3
                                                                            py-1.5
                                                                            text-xs
                                                                            font-bold
                                                                            text-[var(--color-primary)]
                                                                        "
                                                                    >

                                                                        <CheckCircle2
                                                                            size={14}
                                                                        />

                                                                        Completed

                                                                    </span>

                                                                ) : (

                                                                    <span
                                                                        className="
                                                                            inline-flex
                                                                            rounded-full
                                                                            border
                                                                            border-[var(--color-primary)]/30
                                                                            bg-[var(--color-primary)]/10
                                                                            px-3
                                                                            py-1.5
                                                                            text-xs
                                                                            font-bold
                                                                            text-[var(--color-primary)]
                                                                        "
                                                                    >
                                                                        In Progress
                                                                    </span>

                                                                )}

                                                            </div>

                                                        </div>


                                                        {/* ======================================== */}
                                                        {/* Meta */}
                                                        {/* ======================================== */}

                                                        <div
                                                            className="
                                                                mt-5
                                                                flex
                                                                flex-wrap
                                                                gap-5
                                                                text-xs
                                                                text-[var(--color-text-muted)]
                                                            "
                                                        >

                                                            <span className="flex items-center gap-1.5">

                                                                <Clock3
                                                                    size={15}
                                                                    className="text-[var(--color-primary)]"
                                                                />

                                                                {durationInHours} Hours

                                                            </span>


                                                            <span className="flex items-center gap-1.5">

                                                                <BookOpen
                                                                    size={15}
                                                                    className="text-[var(--color-primary)]"
                                                                />

                                                                {
                                                                    enrollment
                                                                        .completedLessons
                                                                        ?.length || 0
                                                                }{" "}
                                                                Lessons Completed

                                                            </span>

                                                        </div>


                                                        {/* ======================================== */}
                                                        {/* Progress */}
                                                        {/* ======================================== */}

                                                        <div className="mt-6">

                                                            <div className="mb-2 flex items-center justify-between">

                                                                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                                                                    Course Progress
                                                                </span>

                                                                <span className="text-xs font-bold text-[var(--color-primary)]">
                                                                    {progress}%
                                                                </span>

                                                            </div>


                                                            <div className="h-2 overflow-hidden rounded-full bg-[#292929]">

                                                                <div
                                                                    className="
                                                                        h-full
                                                                        rounded-full
                                                                        bg-[var(--color-primary)]
                                                                        transition-all
                                                                        duration-500
                                                                    "
                                                                    style={{
                                                                        width: `${Math.min(
                                                                            progress,
                                                                            100
                                                                        )}%`,
                                                                    }}
                                                                />

                                                            </div>

                                                        </div>


                                                        {/* ======================================== */}
                                                        {/* Bottom Action */}
                                                        {/* ======================================== */}

                                                        <div
                                                            className="
                                                                mt-6
                                                                flex
                                                                flex-col
                                                                gap-3
                                                                border-t
                                                                border-[var(--color-border)]
                                                                pt-5
                                                                sm:flex-row
                                                                sm:items-center
                                                                sm:justify-between
                                                            "
                                                        >

                                                            <div className="text-xs text-[var(--color-text-muted)]">

                                                                {completed
                                                                    ? "Course completed"
                                                                    : progress > 0
                                                                        ? "Keep going, you're making progress"
                                                                        : "Ready to start learning"}

                                                            </div>


                                                            <Link
                                                                to={`/student/learning/${enrollment._id}`}
                                                                className="
                                                                    inline-flex
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

                                                                {completed
                                                                    ? "Review Course"
                                                                    : progress > 0
                                                                        ? "Continue Learning"
                                                                        : "Start Learning"}

                                                                <ArrowRight
                                                                    size={16}
                                                                />

                                                            </Link>

                                                        </div>

                                                    </div>

                                                </div>

                                            </article>

                                        );

                                    }
                                )}

                            </div>

                        </section>


                        {/* ================================================== */}
                        {/* Bottom CTA */}
                        {/* ================================================== */}

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


                                <div
                                    className="
                                        relative
                                        flex
                                        flex-col
                                        gap-5
                                        md:flex-row
                                        md:items-center
                                        md:justify-between
                                    "
                                >

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
                                            Keep learning
                                        </p>


                                        <h2
                                            className="
                                                mt-2
                                                text-xl
                                                font-bold
                                                text-white
                                                md:text-2xl
                                            "
                                        >
                                            Want to learn something new?
                                        </h2>


                                        <p
                                            className="
                                                mt-2
                                                max-w-xl
                                                text-sm
                                                leading-6
                                                text-[var(--color-text-muted)]
                                            "
                                        >
                                            Explore more courses and
                                            continue building your skills
                                            with ACEM Academy.
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

                    </>

                )}

            </main>

        </div>

    );

};

export default MyLearning;