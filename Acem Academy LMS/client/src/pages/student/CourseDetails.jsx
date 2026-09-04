import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    BookOpen,
    Clock3,
    User,
    CheckCircle2,
    ArrowRight,
    ChevronDown,
    ChevronRight,
    PlayCircle,
    GraduationCap,
    Layers3,
} from "lucide-react";

import { getCourseById } from "@/api/course.api";

import {
    getSubCourses,
    getChapters,
    getTopics,
    getLessons,
} from "@/api/curriculum.api";

import {
    enrollInCourse,
    getMyCourses,
} from "@/api/enrollment.api";

const CourseDetails = () => {

    const { courseId } = useParams();


    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [course, setCourse] = useState(null);
    const [curriculum, setCurriculum] = useState([]);

    const [loading, setLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(true);

    const [error, setError] = useState("");

    const [openSubCourses, setOpenSubCourses] = useState({});
    const [openChapters, setOpenChapters] = useState({});
    const [openTopics, setOpenTopics] = useState({});

    const [enrolling, setEnrolling] = useState(false);
    const [enrollError, setEnrollError] = useState("");
    const [enrolled, setEnrolled] = useState(false);

    const [checkingEnrollment, setCheckingEnrollment] =
        useState(true);


    /*
    |--------------------------------------------------------------------------
    | Fetch Course
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchCourse = async () => {

            try {

                setLoading(true);
                setError("");

                const response =
                    await getCourseById(courseId);

                setCourse(response.data);

            } catch (error) {

                console.error(
                    "Failed to fetch course:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load this course."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchCourse();

    }, [courseId]);


    /*
    |--------------------------------------------------------------------------
    | Check Existing Enrollment
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const checkEnrollment = async () => {

            try {

                setCheckingEnrollment(true);

                const response =
                    await getMyCourses();

                const enrollments =
                    response.data || [];

                const alreadyEnrolled =
                    enrollments.some(
                        (enrollment) => {

                            const enrollmentCourse =
                                enrollment?.course;

                            const enrollmentCourseId =
                                typeof enrollmentCourse === "object"
                                    ? enrollmentCourse?._id
                                    : enrollmentCourse;

                            return (
                                enrollmentCourseId?.toString() ===
                                courseId?.toString()
                            );

                        }
                    );

                setEnrolled(alreadyEnrolled);

            } catch (error) {

                console.error(
                    "Failed to check enrollment:",
                    error
                );

            } finally {

                setCheckingEnrollment(false);

            }

        };

        checkEnrollment();

    }, [courseId]);


    /*
    |--------------------------------------------------------------------------
    | Fetch Curriculum
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchCurriculum = async () => {

            try {

                setCurriculumLoading(true);

                const [
                    subCourseResponse,
                    chapterResponse,
                    topicResponse,
                    lessonResponse,
                ] = await Promise.all([
                    getSubCourses(),
                    getChapters(),
                    getTopics(),
                    getLessons(),
                ]);

                const subCourses =
                    subCourseResponse.data || [];

                const chapters =
                    chapterResponse.data || [];

                const topics =
                    topicResponse.data || [];

                const lessons =
                    lessonResponse.data || [];


                /*
                |--------------------------------------------------------------------------
                | Filter Sub Courses For Current Course
                |--------------------------------------------------------------------------
                */

                const courseSubCourses =
                    subCourses
                        .filter((subCourse) => {

                            const parentCourseId =
                                typeof subCourse.course === "object"
                                    ? subCourse.course?._id
                                    : subCourse.course;

                            return (
                                parentCourseId?.toString() ===
                                courseId?.toString()
                            );

                        })
                        .sort(
                            (a, b) =>
                                a.position - b.position
                        );


                /*
                |--------------------------------------------------------------------------
                | Build Full Curriculum
                |--------------------------------------------------------------------------
                */

                const structuredCurriculum =
                    courseSubCourses.map(
                        (subCourse) => {

                            const subCourseChapters =
                                chapters
                                    .filter((chapter) => {

                                        const parentSubCourseId =
                                            typeof chapter.subCourse === "object"
                                                ? chapter.subCourse?._id
                                                : chapter.subCourse;

                                        return (
                                            parentSubCourseId?.toString() ===
                                            subCourse._id.toString()
                                        );

                                    })
                                    .sort(
                                        (a, b) =>
                                            a.position - b.position
                                    );


                            const structuredChapters =
                                subCourseChapters.map(
                                    (chapter) => {

                                        const chapterTopics =
                                            topics
                                                .filter((topic) => {

                                                    const parentChapterId =
                                                        typeof topic.chapter === "object"
                                                            ? topic.chapter?._id
                                                            : topic.chapter;

                                                    return (
                                                        parentChapterId?.toString() ===
                                                        chapter._id.toString()
                                                    );

                                                })
                                                .sort(
                                                    (a, b) =>
                                                        a.position - b.position
                                                );


                                        const structuredTopics =
                                            chapterTopics.map(
                                                (topic) => {

                                                    const topicLessons =
                                                        lessons
                                                            .filter((lesson) => {

                                                                const parentTopicId =
                                                                    typeof lesson.topic === "object"
                                                                        ? lesson.topic?._id
                                                                        : lesson.topic;

                                                                return (
                                                                    parentTopicId?.toString() ===
                                                                    topic._id.toString()
                                                                );

                                                            })
                                                            .sort(
                                                                (a, b) =>
                                                                    a.position - b.position
                                                            );

                                                    return {
                                                        ...topic,
                                                        lessons:
                                                            topicLessons,
                                                    };

                                                }
                                            );


                                        return {
                                            ...chapter,
                                            topics:
                                                structuredTopics,
                                        };

                                    }
                                );


                            return {
                                ...subCourse,
                                chapters:
                                    structuredChapters,
                            };

                        }
                    );


                setCurriculum(
                    structuredCurriculum
                );

            } catch (error) {

                console.error(
                    "Failed to fetch curriculum:",
                    error
                );

            } finally {

                setCurriculumLoading(false);

            }

        };

        fetchCurriculum();

    }, [courseId]);


    /*
    |--------------------------------------------------------------------------
    | Enroll
    |--------------------------------------------------------------------------
    */

    const handleEnroll = async () => {

        try {

            setEnrolling(true);
            setEnrollError("");

            await enrollInCourse(course._id);

            setEnrolled(true);

        } catch (error) {

            console.error(
                "Failed to enroll:",
                error
            );

            setEnrollError(
                error?.response?.data?.message ||
                "Unable to enroll in this course."
            );

        } finally {

            setEnrolling(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Toggle Functions
    |--------------------------------------------------------------------------
    */

    const toggleSubCourse = (id) => {

        setOpenSubCourses((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));

    };


    const toggleChapter = (id) => {

        setOpenChapters((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));

    };


    const toggleTopic = (id) => {

        setOpenTopics((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));

    };


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black">

                <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">

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

                    Loading course...

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

    if (error || !course) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black px-6">

                <div
                    className="
                        rounded-2xl
                        border
                        border-red-900
                        bg-red-950/30
                        px-6
                        py-5
                        text-sm
                        text-red-400
                    "
                >
                    {error || "Course not found."}
                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Course Stats
    |--------------------------------------------------------------------------
    */

    const durationInHours =
        Math.round(
            Number(course.duration || 0) / 60
        );

    const totalSubCourses =
        curriculum.length;

    const totalChapters =
        curriculum.reduce(
            (total, subCourse) =>
                total +
                (subCourse.chapters?.length || 0),
            0
        );

    const totalTopics =
        curriculum.reduce(
            (total, subCourse) =>
                total +
                (subCourse.chapters || []).reduce(
                    (chapterTotal, chapter) =>
                        chapterTotal +
                        (chapter.topics?.length || 0),
                    0
                ),
            0
        );

    const totalLessons =
        curriculum.reduce(
            (total, subCourse) =>
                total +
                (subCourse.chapters || []).reduce(
                    (chapterTotal, chapter) =>
                        chapterTotal +
                        (chapter.topics || []).reduce(
                            (topicTotal, topic) =>
                                topicTotal +
                                (topic.lessons?.length || 0),
                            0
                        ),
                    0
                ),
            0
        );


    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================== */}
            {/* Course Hero */}
            {/* ========================================================== */}

            <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-black">

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

                <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">

                    <div className="grid gap-10 lg:grid-cols-[1fr_390px]">


                        {/* ================================================== */}
                        {/* Course Info */}
                        {/* ================================================== */}

                        <div className="flex flex-col justify-center">

                            <div className="flex flex-wrap items-center gap-3">

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
                                    {course.courseCode}
                                </span>


                                {enrolled && (

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

                                        <CheckCircle2 size={14} />

                                        Already Enrolled

                                    </span>

                                )}

                            </div>


                            <h1
                                className="
                                    mt-5
                                    max-w-3xl
                                    text-4xl
                                    font-bold
                                    tracking-tight
                                    text-white
                                    md:text-5xl
                                "
                            >
                                {course.title}
                            </h1>


                            <p
                                className="
                                    mt-5
                                    max-w-2xl
                                    text-base
                                    leading-7
                                    text-[var(--color-text-muted)]
                                    md:text-lg
                                "
                            >
                                {course.description}
                            </p>


                            {/* Meta */}

                            <div
                                className="
                                    mt-7
                                    flex
                                    flex-wrap
                                    gap-x-7
                                    gap-y-4
                                    text-sm
                                    text-[var(--color-text-muted)]
                                "
                            >

                                <div className="flex items-center gap-2">

                                    <Clock3
                                        size={18}
                                        className="text-[var(--color-primary)]"
                                    />

                                    {durationInHours} Hours

                                </div>


                                <div className="flex items-center gap-2">

                                    <User
                                        size={18}
                                        className="text-[var(--color-primary)]"
                                    />

                                    {course.teacher?.fullName ||
                                        "Instructor"}

                                </div>


                                <div className="flex items-center gap-2">

                                    <BookOpen
                                        size={18}
                                        className="text-[var(--color-primary)]"
                                    />

                                    {totalLessons} Lessons

                                </div>

                            </div>


                            {/* Quick Stats */}

                            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">

                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-[var(--color-surface)]
                                        p-4
                                    "
                                >

                                    <p className="text-xl font-bold text-white">
                                        {totalSubCourses}
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Sub Courses
                                    </p>

                                </div>


                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-[var(--color-surface)]
                                        p-4
                                    "
                                >

                                    <p className="text-xl font-bold text-white">
                                        {totalChapters}
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Chapters
                                    </p>

                                </div>


                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-[var(--color-surface)]
                                        p-4
                                    "
                                >

                                    <p className="text-xl font-bold text-white">
                                        {totalTopics}
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Topics
                                    </p>

                                </div>


                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--color-border)]
                                        bg-[var(--color-surface)]
                                        p-4
                                    "
                                >

                                    <p className="text-xl font-bold text-white">
                                        {totalLessons}
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Lessons
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* ================================================== */}
                        {/* Course Card */}
                        {/* ================================================== */}

                        <div
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                shadow-2xl
                            "
                        >

                            {/* Thumbnail */}

                            <div className="relative aspect-video bg-[#151515]">

                                {course.thumbnail ? (

                                    <img
                                        src={course.thumbnail}
                                        alt={course.title}
                                        className="h-full w-full object-cover"
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
                                                text-3xl
                                                font-bold
                                                text-[var(--color-primary)]
                                            "
                                        >
                                            {course.title}
                                        </span>

                                    </div>

                                )}


                                {enrolled && (

                                    <div
                                        className="
                                            absolute
                                            right-4
                                            top-4
                                            flex
                                            items-center
                                            gap-1.5
                                            rounded-full
                                            border
                                            border-[var(--color-primary)]/40
                                            bg-black/85
                                            px-3
                                            py-1.5
                                            text-xs
                                            font-bold
                                            text-[var(--color-primary)]
                                            backdrop-blur-sm
                                        "
                                    >

                                        <CheckCircle2 size={14} />

                                        Enrolled

                                    </div>

                                )}

                            </div>


                            <div className="p-6">

                                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Course Access
                                </p>


                                <div className="mt-2 flex items-end justify-between gap-4">

                                    <p className="text-3xl font-bold text-white">

                                        {course.price === 0
                                            ? "Free"
                                            : `₹${course.price}`}

                                    </p>


                                    {course.price === 0 && (

                                        <span className="text-xs font-semibold text-green-400">
                                            No payment required
                                        </span>

                                    )}

                                </div>


                                {/* ========================================== */}
                                {/* Enrollment State */}
                                {/* ========================================== */}

                                {checkingEnrollment ? (

                                    <div
                                        className="
                                            mt-5
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[#151515]
                                            px-5
                                            py-3.5
                                            text-sm
                                            text-[var(--color-text-muted)]
                                        "
                                    >

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

                                        Checking enrollment...

                                    </div>

                                ) : enrolled ? (

                                    <Link
                                        to="/student/my-learning"
                                        className="
                                            mt-5
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-[var(--color-primary)]
                                            px-5
                                            py-3.5
                                            text-sm
                                            font-bold
                                            text-black
                                            transition
                                            hover:bg-[var(--color-primary-dark)]
                                        "
                                    >

                                        <PlayCircle size={17} />

                                        Continue Learning

                                        <ArrowRight size={17} />

                                    </Link>

                                ) : (

                                    <button
                                        type="button"
                                        onClick={handleEnroll}
                                        disabled={enrolling}
                                        className="
                                            mt-5
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-[var(--color-primary)]
                                            px-5
                                            py-3.5
                                            text-sm
                                            font-bold
                                            text-black
                                            transition
                                            hover:bg-[var(--color-primary-dark)]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                        "
                                    >

                                        {enrolling
                                            ? "Enrolling..."
                                            : "Enroll Now"}

                                        {!enrolling && (
                                            <ArrowRight size={17} />
                                        )}

                                    </button>

                                )}


                                {enrollError && (

                                    <p
                                        className="
                                            mt-3
                                            text-center
                                            text-sm
                                            text-red-400
                                        "
                                    >
                                        {enrollError}
                                    </p>

                                )}


                                <div
                                    className="
                                        mt-5
                                        border-t
                                        border-[var(--color-border)]
                                        pt-5
                                    "
                                >

                                    <div className="flex items-center justify-between text-xs">

                                        <span className="text-[var(--color-text-muted)]">
                                            Course status
                                        </span>

                                        <span className="font-semibold text-[var(--color-primary)]">
                                            {course.status === "published"
                                                ? "Published"
                                                : course.status}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* ========================================================== */}
            {/* Course Content */}
            {/* ========================================================== */}

            <main className="mx-auto max-w-7xl px-6 py-12">

                <div className="grid gap-10 lg:grid-cols-[1fr_320px]">


                    {/* ================================================== */}
                    {/* Curriculum */}
                    {/* ================================================== */}

                    <section>

                        <div>

                            <div className="flex items-center gap-3">

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

                                    <Layers3
                                        size={20}
                                        className="text-[var(--color-primary)]"
                                    />

                                </div>


                                <div>

                                    <h2 className="text-2xl font-bold text-white">
                                        Course Curriculum
                                    </h2>

                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                        Explore the complete course structure.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {curriculumLoading ? (

                            <div
                                className="
                                    mt-7
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
                                        h-5
                                        w-5
                                        animate-spin
                                        rounded-full
                                        border-2
                                        border-[var(--color-border)]
                                        border-t-[var(--color-primary)]
                                    "
                                />

                                <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                                    Loading curriculum...
                                </p>

                            </div>

                        ) : curriculum.length === 0 ? (

                            <div
                                className="
                                    mt-7
                                    rounded-2xl
                                    border
                                    border-[var(--color-border)]
                                    bg-[var(--color-surface)]
                                    p-10
                                    text-center
                                "
                            >

                                <BookOpen
                                    size={40}
                                    className="
                                        mx-auto
                                        text-[var(--color-primary)]
                                    "
                                />


                                <h3
                                    className="
                                        mt-4
                                        text-lg
                                        font-bold
                                        text-white
                                    "
                                >
                                    Curriculum coming soon
                                </h3>


                                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                    Lessons for this course have not
                                    been added yet.
                                </p>

                            </div>

                        ) : (

                            <div className="mt-7 space-y-4">

                                {curriculum.map(
                                    (subCourse) => {

                                        const subCourseOpen =
                                            openSubCourses[
                                                subCourse._id
                                            ];

                                        return (

                                            <div
                                                key={
                                                    subCourse._id
                                                }
                                                className="
                                                    overflow-hidden
                                                    rounded-2xl
                                                    border
                                                    border-[var(--color-border)]
                                                    bg-[var(--color-surface)]
                                                "
                                            >

                                                {/* ============================================== */}
                                                {/* Sub Course Header */}
                                                {/* ============================================== */}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleSubCourse(
                                                            subCourse._id
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        w-full
                                                        items-center
                                                        gap-3
                                                        bg-[#151515]
                                                        px-5
                                                        py-5
                                                        text-left
                                                        transition
                                                        hover:bg-[var(--color-primary)]/5
                                                    "
                                                >

                                                    {subCourseOpen ? (

                                                        <ChevronDown
                                                            size={20}
                                                            className="
                                                                shrink-0
                                                                text-[var(--color-primary)]
                                                            "
                                                        />

                                                    ) : (

                                                        <ChevronRight
                                                            size={20}
                                                            className="
                                                                shrink-0
                                                                text-[var(--color-text-muted)]
                                                            "
                                                        />

                                                    )}


                                                    <div className="flex-1">

                                                        <p
                                                            className="
                                                                text-xs
                                                                font-bold
                                                                uppercase
                                                                tracking-wide
                                                                text-[var(--color-primary)]
                                                            "
                                                        >
                                                            Sub Course{" "}
                                                            {subCourse.position}
                                                        </p>


                                                        <h3
                                                            className="
                                                                mt-1
                                                                text-lg
                                                                font-bold
                                                                text-white
                                                            "
                                                        >
                                                            {
                                                                subCourse.title
                                                            }
                                                        </h3>

                                                    </div>


                                                    <span
                                                        className="
                                                            hidden
                                                            rounded-full
                                                            bg-black
                                                            px-3
                                                            py-1.5
                                                            text-xs
                                                            text-[var(--color-text-muted)]
                                                            sm:block
                                                        "
                                                    >
                                                        {
                                                            subCourse
                                                                .chapters
                                                                .length
                                                        }{" "}
                                                        Chapters
                                                    </span>

                                                </button>


                                                {/* ============================================== */}
                                                {/* Chapters */}
                                                {/* ============================================== */}

                                                {subCourseOpen && (

                                                    <div
                                                        className="
                                                            divide-y
                                                            divide-[var(--color-border)]
                                                        "
                                                    >

                                                        {subCourse.chapters
                                                            .length === 0 ? (

                                                            <p className="p-5 text-sm text-[var(--color-text-muted)]">
                                                                No chapters
                                                                available.
                                                            </p>

                                                        ) : (

                                                            subCourse.chapters.map(
                                                                (
                                                                    chapter
                                                                ) => {

                                                                    const chapterOpen =
                                                                        openChapters[
                                                                            chapter._id
                                                                        ];

                                                                    return (

                                                                        <div
                                                                            key={
                                                                                chapter._id
                                                                            }
                                                                            className="p-5"
                                                                        >

                                                                            {/* ====================================== */}
                                                                            {/* Chapter */}
                                                                            {/* ====================================== */}

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    toggleChapter(
                                                                                        chapter._id
                                                                                    )
                                                                                }
                                                                                className="
                                                                                    flex
                                                                                    w-full
                                                                                    items-center
                                                                                    gap-3
                                                                                    text-left
                                                                                "
                                                                            >

                                                                                {chapterOpen ? (

                                                                                    <ChevronDown
                                                                                        size={18}
                                                                                        className="
                                                                                            shrink-0
                                                                                            text-[var(--color-primary)]
                                                                                        "
                                                                                    />

                                                                                ) : (

                                                                                    <ChevronRight
                                                                                        size={18}
                                                                                        className="
                                                                                            shrink-0
                                                                                            text-[var(--color-text-muted)]
                                                                                        "
                                                                                    />

                                                                                )}


                                                                                <div className="flex-1">

                                                                                    <p className="text-xs font-medium text-[var(--color-text-muted)]">
                                                                                        Chapter{" "}
                                                                                        {
                                                                                            chapter.position
                                                                                        }
                                                                                    </p>


                                                                                    <h4 className="mt-1 font-semibold text-white">
                                                                                        {
                                                                                            chapter.title
                                                                                        }
                                                                                    </h4>

                                                                                </div>


                                                                                <span
                                                                                    className="
                                                                                        hidden
                                                                                        text-xs
                                                                                        text-[var(--color-text-muted)]
                                                                                        sm:block
                                                                                    "
                                                                                >
                                                                                    {
                                                                                        chapter
                                                                                            .topics
                                                                                            .length
                                                                                    }{" "}
                                                                                    Topics
                                                                                </span>

                                                                            </button>


                                                                            {/* ====================================== */}
                                                                            {/* Topics */}
                                                                            {/* ====================================== */}

                                                                            {chapterOpen && (

                                                                                <div className="mt-4 ml-7 space-y-2">

                                                                                    {chapter.topics
                                                                                        .length ===
                                                                                    0 ? (

                                                                                        <p className="text-sm text-[var(--color-text-muted)]">
                                                                                            No topics
                                                                                            available.
                                                                                        </p>

                                                                                    ) : (

                                                                                        chapter.topics.map(
                                                                                            (
                                                                                                topic
                                                                                            ) => {

                                                                                                const topicOpen =
                                                                                                    openTopics[
                                                                                                        topic._id
                                                                                                    ];

                                                                                                return (

                                                                                                    <div
                                                                                                        key={
                                                                                                            topic._id
                                                                                                        }
                                                                                                        className="
                                                                                                            overflow-hidden
                                                                                                            rounded-xl
                                                                                                            border
                                                                                                            border-[var(--color-border)]
                                                                                                            bg-black/20
                                                                                                        "
                                                                                                    >

                                                                                                        {/* ================================= */}
                                                                                                        {/* Topic */}
                                                                                                        {/* ================================= */}

                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() =>
                                                                                                                toggleTopic(
                                                                                                                    topic._id
                                                                                                                )
                                                                                                            }
                                                                                                            className="
                                                                                                                flex
                                                                                                                w-full
                                                                                                                items-center
                                                                                                                gap-3
                                                                                                                px-4
                                                                                                                py-3.5
                                                                                                                text-left
                                                                                                                transition
                                                                                                                hover:bg-[var(--color-primary)]/5
                                                                                                            "
                                                                                                        >

                                                                                                            {topicOpen ? (

                                                                                                                <ChevronDown
                                                                                                                    size={17}
                                                                                                                    className="
                                                                                                                        shrink-0
                                                                                                                        text-[var(--color-primary)]
                                                                                                                    "
                                                                                                                />

                                                                                                            ) : (

                                                                                                                <ChevronRight
                                                                                                                    size={17}
                                                                                                                    className="
                                                                                                                        shrink-0
                                                                                                                        text-[var(--color-text-muted)]
                                                                                                                    "
                                                                                                                />

                                                                                                            )}


                                                                                                            <div className="flex-1">

                                                                                                                <p className="text-sm font-semibold text-white">
                                                                                                                    {
                                                                                                                        topic.title
                                                                                                                    }
                                                                                                                </p>

                                                                                                            </div>


                                                                                                            <span className="text-xs text-[var(--color-text-muted)]">
                                                                                                                {
                                                                                                                    topic
                                                                                                                        .lessons
                                                                                                                        .length
                                                                                                                }{" "}
                                                                                                                Lessons
                                                                                                            </span>

                                                                                                        </button>


                                                                                                        {/* ================================= */}
                                                                                                        {/* Lessons */}
                                                                                                        {/* ================================= */}

                                                                                                        {topicOpen && (

                                                                                                            <div
                                                                                                                className="
                                                                                                                    border-t
                                                                                                                    border-[var(--color-border)]
                                                                                                                "
                                                                                                            >

                                                                                                                {topic.lessons
                                                                                                                    .length ===
                                                                                                                0 ? (

                                                                                                                    <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                                                                                                                        No lessons
                                                                                                                        available.
                                                                                                                    </p>

                                                                                                                ) : (

                                                                                                                    topic.lessons.map(
                                                                                                                        (
                                                                                                                            lesson
                                                                                                                        ) => (

                                                                                                                            <div
                                                                                                                                key={
                                                                                                                                    lesson._id
                                                                                                                                }
                                                                                                                                className="
                                                                                                                                    flex
                                                                                                                                    items-center
                                                                                                                                    gap-3
                                                                                                                                    border-b
                                                                                                                                    border-[var(--color-border)]
                                                                                                                                    px-4
                                                                                                                                    py-3
                                                                                                                                    last:border-b-0
                                                                                                                                "
                                                                                                                            >

                                                                                                                                <div
                                                                                                                                    className="
                                                                                                                                        flex
                                                                                                                                        h-8
                                                                                                                                        w-8
                                                                                                                                        shrink-0
                                                                                                                                        items-center
                                                                                                                                        justify-center
                                                                                                                                        rounded-lg
                                                                                                                                        bg-[var(--color-primary)]/10
                                                                                                                                    "
                                                                                                                                >

                                                                                                                                    <BookOpen
                                                                                                                                        size={
                                                                                                                                            16
                                                                                                                                        }
                                                                                                                                        className="
                                                                                                                                            text-[var(--color-primary)]
                                                                                                                                        "
                                                                                                                                    />

                                                                                                                                </div>


                                                                                                                                <div className="flex-1">

                                                                                                                                    <p className="text-sm font-medium text-white">
                                                                                                                                        {
                                                                                                                                            lesson.title
                                                                                                                                        }
                                                                                                                                    </p>


                                                                                                                                    {lesson.description && (

                                                                                                                                        <p
                                                                                                                                            className="
                                                                                                                                                mt-1
                                                                                                                                                line-clamp-1
                                                                                                                                                text-xs
                                                                                                                                                text-[var(--color-text-muted)]
                                                                                                                                            "
                                                                                                                                        >
                                                                                                                                            {
                                                                                                                                                lesson.description
                                                                                                                                            }
                                                                                                                                        </p>

                                                                                                                                    )}

                                                                                                                                </div>


                                                                                                                                <span className="text-xs text-[var(--color-text-muted)]">
                                                                                                                                    Lesson{" "}
                                                                                                                                    {
                                                                                                                                        lesson.position
                                                                                                                                    }
                                                                                                                                </span>

                                                                                                                            </div>

                                                                                                                        )
                                                                                                                    )

                                                                                                                )}

                                                                                                            </div>

                                                                                                        )}

                                                                                                    </div>

                                                                                                );

                                                                                            }
                                                                                        )

                                                                                    )}

                                                                                </div>

                                                                            )}

                                                                        </div>

                                                                    );

                                                                }
                                                            )

                                                        )}

                                                    </div>

                                                )}

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        )}

                    </section>


                    {/* ================================================== */}
                    {/* Course Information */}
                    {/* ================================================== */}

                    <aside>

                        <div
                            className="
                                sticky
                                top-24
                                rounded-2xl
                                border
                                border-[var(--color-border)]
                                bg-[var(--color-surface)]
                                p-6
                            "
                        >

                            <div className="flex items-center gap-3">

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

                                    <GraduationCap
                                        size={20}
                                        className="text-[var(--color-primary)]"
                                    />

                                </div>


                                <h3 className="text-lg font-bold text-white">
                                    Course Information
                                </h3>

                            </div>


                            <div className="mt-6 space-y-5">


                                <div>

                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Course Code
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {course.courseCode}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Instructor
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {course.teacher?.fullName ||
                                            "Instructor"}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Duration
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {durationInHours} Hours
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Lessons
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {totalLessons}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Access
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">
                                        {course.price === 0
                                            ? "Free"
                                            : "Paid"}
                                    </p>

                                </div>


                                <div className="border-t border-[var(--color-border)] pt-5">

                                    <div className="flex items-center justify-between">

                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            Enrollment
                                        </span>

                                        <span
                                            className={`
                                                text-xs
                                                font-bold
                                                ${
                                                    enrolled
                                                        ? "text-[var(--color-primary)]"
                                                        : "text-white"
                                                }
                                            `}
                                        >
                                            {enrolled
                                                ? "Already Enrolled"
                                                : "Not Enrolled"}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </aside>

                </div>

            </main>

        </div>

    );

};

export default CourseDetails;