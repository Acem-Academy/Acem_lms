import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock3,
    PlayCircle,
    Loader2,
    Menu,
    X,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";

import {
    getEnrollmentById,
    startLesson,
    completeLesson,
} from "@/api/enrollment.api";

import {
    getSubCourses,
    getChapters,
    getTopics,
    getLessons,
} from "@/api/curriculum.api";


const Learning = () => {

    const { enrollmentId } = useParams();


    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [enrollment, setEnrollment] = useState(null);
    const [curriculum, setCurriculum] = useState([]);

    const [selectedLesson, setSelectedLesson] = useState(null);

    const [loading, setLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(true);

    const [actionLoading, setActionLoading] = useState(false);

    const [error, setError] = useState("");

    const [openSubCourses, setOpenSubCourses] = useState({});
    const [openChapters, setOpenChapters] = useState({});
    const [openTopics, setOpenTopics] = useState({});

    const [sidebarOpen, setSidebarOpen] = useState(false);


    /*
    |--------------------------------------------------------------------------
    | Fetch Enrollment
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        const fetchEnrollment = async () => {

            try {

                setLoading(true);
                setError("");

                const response =
                    await getEnrollmentById(enrollmentId);

                setEnrollment(response.data);

            } catch (error) {

                console.error(
                    "Failed to fetch enrollment:",
                    error
                );

                setError(
                    error?.response?.data?.message ||
                    "Unable to load your course."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchEnrollment();

    }, [enrollmentId]);


    /*
    |--------------------------------------------------------------------------
    | Fetch Curriculum
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        if (!enrollment?.course?._id) {
            return;
        }

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

                const courseId =
                    enrollment.course._id;


                /*
                |--------------------------------------------------------------------------
                | Sub Courses
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
                                courseId.toString()
                            );

                        })
                        .sort(
                            (a, b) =>
                                a.position - b.position
                        );


                /*
                |--------------------------------------------------------------------------
                | Build Curriculum
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


                /*
                |--------------------------------------------------------------------------
                | Automatically Select Last Accessed Lesson
                |--------------------------------------------------------------------------
                */

                if (enrollment.lastAccessedLesson) {

                    const lastLessonId =
                        typeof enrollment.lastAccessedLesson === "object"
                            ? enrollment.lastAccessedLesson?._id
                            : enrollment.lastAccessedLesson;


                    for (
                        const subCourse
                        of structuredCurriculum
                    ) {

                        for (
                            const chapter
                            of subCourse.chapters
                        ) {

                            for (
                                const topic
                                of chapter.topics
                            ) {

                                const lesson =
                                    topic.lessons.find(
                                        (item) =>
                                            item._id.toString() ===
                                            lastLessonId.toString()
                                    );


                                if (lesson) {

                                    setSelectedLesson(
                                        lesson
                                    );

                                    setOpenSubCourses((prev) => ({
                                        ...prev,
                                        [subCourse._id]: true,
                                    }));

                                    setOpenChapters((prev) => ({
                                        ...prev,
                                        [chapter._id]: true,
                                    }));

                                    setOpenTopics((prev) => ({
                                        ...prev,
                                        [topic._id]: true,
                                    }));

                                    return;

                                }

                            }

                        }

                    }

                }


                /*
                |--------------------------------------------------------------------------
                | Select First Lesson
                |--------------------------------------------------------------------------
                */

                for (
                    const subCourse
                    of structuredCurriculum
                ) {

                    for (
                        const chapter
                        of subCourse.chapters
                    ) {

                        for (
                            const topic
                            of chapter.topics
                        ) {

                            if (
                                topic.lessons.length > 0
                            ) {

                                setSelectedLesson(
                                    topic.lessons[0]
                                );

                                setOpenSubCourses((prev) => ({
                                    ...prev,
                                    [subCourse._id]: true,
                                }));

                                setOpenChapters((prev) => ({
                                    ...prev,
                                    [chapter._id]: true,
                                }));

                                setOpenTopics((prev) => ({
                                    ...prev,
                                    [topic._id]: true,
                                }));

                                return;

                            }

                        }

                    }

                }

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

    }, [enrollment]);


    /*
    |--------------------------------------------------------------------------
    | Completed Lesson Check
    |--------------------------------------------------------------------------
    */

    const isLessonCompleted = (
        lessonId
    ) => {

        return (
            enrollment?.completedLessons?.some(
                (completedLesson) => {

                    const id =
                        typeof completedLesson === "object"
                            ? completedLesson?._id
                            : completedLesson;

                    return (
                        id?.toString() ===
                        lessonId?.toString()
                    );

                }
            ) || false
        );

    };


    /*
    |--------------------------------------------------------------------------
    | Flatten Lessons
    |--------------------------------------------------------------------------
    */

    const allLessons = useMemo(() => {

        const lessons = [];

        curriculum.forEach((subCourse) => {

            subCourse.chapters?.forEach((chapter) => {

                chapter.topics?.forEach((topic) => {

                    topic.lessons?.forEach((lesson) => {

                        lessons.push(lesson);

                    });

                });

            });

        });

        return lessons;

    }, [curriculum]);


    /*
    |--------------------------------------------------------------------------
    | Current Lesson Navigation
    |--------------------------------------------------------------------------
    */

    const currentLessonIndex =
        selectedLesson
            ? allLessons.findIndex(
                (lesson) =>
                    lesson._id === selectedLesson._id
            )
            : -1;


    const previousLesson =
        currentLessonIndex > 0
            ? allLessons[currentLessonIndex - 1]
            : null;


    const nextLesson =
        currentLessonIndex >= 0 &&
        currentLessonIndex < allLessons.length - 1
            ? allLessons[currentLessonIndex + 1]
            : null;


    /*
    |--------------------------------------------------------------------------
    | Select Lesson
    |--------------------------------------------------------------------------
    */

    const handleSelectLesson = async (
        lesson
    ) => {

        setSelectedLesson(
            lesson
        );

        setSidebarOpen(false);


        if (
            !enrollment ||
            isLessonCompleted(
                lesson._id
            )
        ) {
            return;
        }


        try {

            setActionLoading(true);

            const response =
                await startLesson(
                    enrollment._id,
                    lesson._id
                );

            setEnrollment(
                response.data.enrollment
            );

        } catch (error) {

            console.error(
                "Failed to start lesson:",
                error
            );

        } finally {

            setActionLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Complete Lesson
    |--------------------------------------------------------------------------
    */

    const handleCompleteLesson = async () => {

        if (
            !selectedLesson ||
            !enrollment ||
            selectedLessonCompleted
        ) {
            return;
        }


        try {

            setActionLoading(true);

            const response =
                await completeLesson(
                    enrollment._id,
                    selectedLesson._id
                );

            setEnrollment(
                response.data
            );

        } catch (error) {

            console.error(
                "Failed to complete lesson:",
                error
            );

        } finally {

            setActionLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Lesson Navigation
    |--------------------------------------------------------------------------
    */

    const handlePreviousLesson = () => {

        if (previousLesson) {

            handleSelectLesson(
                previousLesson
            );

        }

    };


    const handleNextLesson = () => {

        if (nextLesson) {

            handleSelectLesson(
                nextLesson
            );

        }

    };


    /*
    |--------------------------------------------------------------------------
    | Toggle Functions
    |--------------------------------------------------------------------------
    */

    const toggleSubCourse = (
        id
    ) => {

        setOpenSubCourses(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    const toggleChapter = (
        id
    ) => {

        setOpenChapters(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    const toggleTopic = (
        id
    ) => {

        setOpenTopics(
            (prev) => ({
                ...prev,
                [id]: !prev[id],
            })
        );

    };


    /*
    |--------------------------------------------------------------------------
    | Total Lessons
    |--------------------------------------------------------------------------
    */

    const totalLessons = useMemo(() => {

        return curriculum.reduce(
            (
                total,
                subCourse
            ) => {

                return (
                    total +
                    subCourse.chapters.reduce(
                        (
                            chapterTotal,
                            chapter
                        ) => {

                            return (
                                chapterTotal +
                                chapter.topics.reduce(
                                    (
                                        topicTotal,
                                        topic
                                    ) =>
                                        topicTotal +
                                        topic.lessons.length,
                                    0
                                )
                            );

                        },
                        0
                    )
                );

            },
            0
        );

    }, [curriculum]);


    /*
    |--------------------------------------------------------------------------
    | Completed Lessons
    |--------------------------------------------------------------------------
    */

    const completedLessons =
        enrollment?.completedLessons?.length || 0;


    /*
    |--------------------------------------------------------------------------
    | Progress
    |--------------------------------------------------------------------------
    */

    const progress =
        Number(enrollment?.progress || 0);


    /*
    |--------------------------------------------------------------------------
    | Selected Lesson Completion
    |--------------------------------------------------------------------------
    */

    const selectedLessonCompleted =
        selectedLesson
            ? isLessonCompleted(
                selectedLesson._id
            )
            : false;


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
                        size={18}
                        className="
                            animate-spin
                            text-[var(--color-primary)]
                        "
                    />

                    Loading your course...

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

    if (
        error ||
        !enrollment
    ) {

        return (

            <div className="flex min-h-screen items-center justify-center bg-black px-6">

                <div
                    className="
                        rounded-xl
                        border
                        border-red-900
                        bg-red-950/30
                        px-6
                        py-5
                        text-sm
                        text-red-400
                    "
                >

                    {error ||
                        "Enrollment not found."}

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | Sidebar Component
    |--------------------------------------------------------------------------
    */

    const CurriculumSidebar = () => (

        <div className="flex h-full flex-col">


            {/* Sidebar Header */}

            <div
                className="
                    border-b
                    border-[var(--color-border)]
                    bg-[var(--color-surface)]
                    px-5
                    py-5
                "
            >

                <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-[var(--color-primary)]/10
                            "
                        >

                            <BookOpen
                                size={20}
                                className="text-[var(--color-primary)]"
                            />

                        </div>


                        <div>

                            <h2 className="font-bold text-[var(--color-primary)]">
                                Course Content
                            </h2>

                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">

                                {completedLessons} of{" "}
                                {totalLessons} lessons completed

                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="
                            rounded-lg
                            p-2
                            text-[var(--color-text-muted)]
                            hover:bg-white/5
                            lg:hidden
                        "
                    >

                        <X size={20} />

                    </button>

                </div>


                {/* Progress */}

                <div className="mt-5">

                    <div className="mb-2 flex items-center justify-between">

                        <span className="text-xs text-[var(--color-text-muted)]">
                            Progress
                        </span>

                        <span className="text-xs font-bold text-[var(--color-primary)]">
                            {progress}%
                        </span>

                    </div>


                    <div className="h-2 overflow-hidden rounded-full bg-[#242424]">

                        <div
                            className="
                                h-full
                                rounded-full
                                bg-[var(--color-primary)]
                                transition-all
                            "
                            style={{
                                width: `${progress}%`,
                            }}
                        />

                    </div>

                </div>

            </div>


            {/* Curriculum */}

            {curriculumLoading ? (

                <div className="flex flex-1 items-center justify-center p-8">

                    <div className="flex items-center gap-2 text-sm text-white">

                        <Loader2
                            size={17}
                            className="
                                animate-spin
                                text-[var(--color-primary)]
                            "
                        />

                        Loading curriculum...

                    </div>

                </div>

            ) : curriculum.length === 0 ? (

                <div className="p-6 text-center">

                    <BookOpen
                        size={35}
                        className="
                            mx-auto
                            text-[var(--color-primary)]
                        "
                    />

                    <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        No lessons available yet.
                    </p>

                </div>

            ) : (

                <div className="flex-1 overflow-y-auto">

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
                                        border-b
                                        border-[var(--color-border)]
                                    "
                                >

                                    {/* Sub Course */}

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
                                            px-5
                                            py-4
                                            text-left
                                            transition
                                            hover:bg-[var(--color-primary)]/5
                                        "
                                    >

                                        {subCourseOpen ? (

                                            <ChevronDown
                                                size={18}
                                                className="text-[var(--color-primary)]"
                                            />

                                        ) : (

                                            <ChevronRight
                                                size={18}
                                                className="text-[var(--color-text-muted)]"
                                            />

                                        )}


                                        <div className="min-w-0 flex-1">

                                            <p className="text-xs font-medium text-[var(--color-primary)]">
                                                Sub Course{" "}
                                                {subCourse.position}
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {
                                                    subCourse.title
                                                }
                                            </p>

                                        </div>

                                    </button>


                                    {subCourseOpen && (

                                        <div className="pb-2">

                                            {subCourse.chapters.map(
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
                                                        >

                                                            {/* Chapter */}

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
                                                                    px-8
                                                                    py-3
                                                                    text-left
                                                                    transition
                                                                    hover:bg-[var(--color-primary)]/5
                                                                "
                                                            >

                                                                {chapterOpen ? (

                                                                    <ChevronDown
                                                                        size={16}
                                                                        className="text-[var(--color-primary)]"
                                                                    />

                                                                ) : (

                                                                    <ChevronRight
                                                                        size={16}
                                                                        className="text-[var(--color-text-muted)]"
                                                                    />

                                                                )}


                                                                <div className="min-w-0 flex-1">

                                                                    <p className="text-xs text-[var(--color-text-muted)]">
                                                                        Chapter{" "}
                                                                        {
                                                                            chapter.position
                                                                        }
                                                                    </p>

                                                                    <p className="mt-0.5 truncate text-sm font-medium text-white">
                                                                        {
                                                                            chapter.title
                                                                        }
                                                                    </p>

                                                                </div>

                                                            </button>


                                                            {chapterOpen && (

                                                                <div>

                                                                    {chapter.topics.map(
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
                                                                                >

                                                                                    {/* Topic */}

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
                                                                                            px-11
                                                                                            py-3
                                                                                            text-left
                                                                                            transition
                                                                                            hover:bg-[var(--color-primary)]/5
                                                                                        "
                                                                                    >

                                                                                        {topicOpen ? (

                                                                                            <ChevronDown
                                                                                                size={15}
                                                                                                className="text-[var(--color-primary)]"
                                                                                            />

                                                                                        ) : (

                                                                                            <ChevronRight
                                                                                                size={15}
                                                                                                className="text-[var(--color-text-muted)]"
                                                                                            />

                                                                                        )}

                                                                                        <p className="flex-1 truncate text-sm font-medium text-white">
                                                                                            {
                                                                                                topic.title
                                                                                            }
                                                                                        </p>

                                                                                    </button>


                                                                                    {topicOpen && (

                                                                                        <div className="pb-2">

                                                                                            {topic.lessons.map(
                                                                                                (
                                                                                                    lesson
                                                                                                ) => {

                                                                                                    const completed =
                                                                                                        isLessonCompleted(
                                                                                                            lesson._id
                                                                                                        );

                                                                                                    const selected =
                                                                                                        selectedLesson?._id ===
                                                                                                        lesson._id;

                                                                                                    return (

                                                                                                        <button
                                                                                                            key={
                                                                                                                lesson._id
                                                                                                            }
                                                                                                            type="button"
                                                                                                            onClick={() =>
                                                                                                                handleSelectLesson(
                                                                                                                    lesson
                                                                                                                )
                                                                                                            }
                                                                                                            className={`
                                                                                                                flex
                                                                                                                w-full
                                                                                                                items-center
                                                                                                                gap-3
                                                                                                                border-l-2
                                                                                                                px-14
                                                                                                                py-3
                                                                                                                text-left
                                                                                                                transition
                                                                                                                ${
                                                                                                                    selected
                                                                                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                                                                                                        : "border-transparent hover:bg-[var(--color-primary)]/5"
                                                                                                                }
                                                                                                            `}
                                                                                                        >

                                                                                                            {completed ? (

                                                                                                                <CheckCircle2
                                                                                                                    size={16}
                                                                                                                    className="
                                                                                                                        shrink-0
                                                                                                                        text-[var(--color-primary)]
                                                                                                                    "
                                                                                                                />

                                                                                                            ) : (

                                                                                                                <PlayCircle
                                                                                                                    size={16}
                                                                                                                    className={`
                                                                                                                        shrink-0
                                                                                                                        ${
                                                                                                                            selected
                                                                                                                                ? "text-[var(--color-primary)]"
                                                                                                                                : "text-[var(--color-text-muted)]"
                                                                                                                        }
                                                                                                                    `}
                                                                                                                />

                                                                                                            )}


                                                                                                            <span
                                                                                                                className={`
                                                                                                                    line-clamp-2
                                                                                                                    flex-1
                                                                                                                    text-sm
                                                                                                                    ${
                                                                                                                        selected
                                                                                                                            ? "font-semibold text-[var(--color-primary)]"
                                                                                                                            : completed
                                                                                                                                ? "text-[var(--color-text-muted)]"
                                                                                                                                : "text-white"
                                                                                                                    }
                                                                                                                `}
                                                                                                            >
                                                                                                                {
                                                                                                                    lesson.title
                                                                                                                }
                                                                                                            </span>

                                                                                                        </button>

                                                                                                    );

                                                                                                }
                                                                                            )}

                                                                                        </div>

                                                                                    )}

                                                                                </div>

                                                                            );

                                                                        }
                                                                    )}

                                                                </div>

                                                            )}

                                                        </div>

                                                    );

                                                }
                                            )}

                                        </div>

                                    )}

                                </div>

                            );

                        }
                    )}

                </div>

            )}

        </div>

    );


    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-black text-white">


            {/* ========================================================== */}
            {/* Header */}
            {/* ========================================================== */}

            <header
                className="
                    sticky
                    top-0
                    z-40
                    border-b
                    border-[var(--color-border)]
                    bg-black/95
                    backdrop-blur
                "
            >

                <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-5">

                    <div className="flex items-center gap-4">


                        {/* Mobile Menu */}

                        <button
                            type="button"
                            onClick={() =>
                                setSidebarOpen(true)
                            }
                            className="
                                rounded-lg
                                border
                                border-[var(--color-border)]
                                p-2
                                text-[var(--color-primary)]
                                hover:bg-[var(--color-primary)]/10
                                lg:hidden
                            "
                        >

                            <Menu size={20} />

                        </button>


                        {/* Course */}

                        <div className="min-w-0 flex-1">

                            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
                                Now Learning
                            </p>

                            <h1 className="mt-1 truncate text-sm font-bold text-white sm:text-base">
                                {enrollment.course?.title ||
                                    "Course"}
                            </h1>

                        </div>


                        {/* Progress */}

                        <div className="hidden w-56 sm:block">

                            <div className="mb-1.5 flex items-center justify-between">

                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                    Course Progress
                                </span>

                                <span className="text-xs font-bold text-[var(--color-primary)]">
                                    {progress}%
                                </span>

                            </div>


                            <div className="h-1.5 overflow-hidden rounded-full bg-[#242424]">

                                <div
                                    className="
                                        h-full
                                        rounded-full
                                        bg-[var(--color-primary)]
                                        transition-all
                                    "
                                    style={{
                                        width: `${progress}%`,
                                    }}
                                />

                            </div>

                        </div>

                    </div>

                </div>

            </header>


            {/* ========================================================== */}
            {/* Mobile Sidebar Overlay */}
            {/* ========================================================== */}

            {sidebarOpen && (

                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        bg-black/70
                        backdrop-blur-sm
                        lg:hidden
                    "
                    onClick={() =>
                        setSidebarOpen(false)
                    }
                >

                    <aside
                        className="
                            h-full
                            w-[88%]
                            max-w-[380px]
                            bg-[var(--color-surface)]
                            shadow-2xl
                        "
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <CurriculumSidebar />

                    </aside>

                </div>

            )}


            {/* ========================================================== */}
            {/* Desktop Learning Layout */}
            {/* ========================================================== */}

            <main className="mx-auto flex max-w-[1500px]">


                {/* Desktop Sidebar */}

                <aside
                    className="
                        hidden
                        w-[360px]
                        shrink-0
                        border-r
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        lg:block
                        lg:min-h-[calc(100vh-73px)]
                    "
                >

                    <CurriculumSidebar />

                </aside>


                {/* ====================================================== */}
                {/* Lesson Content */}
                {/* ====================================================== */}

                <section className="min-w-0 flex-1 bg-black">

                    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">


                        {!selectedLesson ? (

                            <div className="flex min-h-[500px] items-center justify-center text-center">

                                <div>

                                    <BookOpen
                                        size={50}
                                        className="
                                            mx-auto
                                            text-[var(--color-primary)]
                                        "
                                    />

                                    <h2 className="mt-5 text-xl font-bold text-white">
                                        Select a lesson
                                    </h2>

                                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                        Choose a lesson from the course
                                        content to start learning.
                                    </p>

                                </div>

                            </div>

                        ) : (

                            <>


                                {/* ================================================== */}
                                {/* Lesson Header */}
                                {/* ================================================== */}

                                <div>

                                    <div className="flex flex-wrap items-center gap-2">

                                        <span
                                            className="
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
                                            Lesson{" "}
                                            {selectedLesson.position}
                                        </span>


                                        {selectedLessonCompleted && (

                                            <span
                                                className="
                                                    flex
                                                    items-center
                                                    gap-1.5
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

                                                <CheckCircle2
                                                    size={13}
                                                />

                                                Completed

                                            </span>

                                        )}

                                    </div>


                                    <h2
                                        className="
                                            mt-4
                                            text-3xl
                                            font-bold
                                            tracking-tight
                                            text-white
                                            sm:text-4xl
                                        "
                                    >
                                        {selectedLesson.title}
                                    </h2>


                                    {selectedLesson.description && (

                                        <p
                                            className="
                                                mt-4
                                                max-w-3xl
                                                text-base
                                                leading-7
                                                text-[var(--color-text-muted)]
                                            "
                                        >
                                            {
                                                selectedLesson.description
                                            }
                                        </p>

                                    )}

                                </div>


                                {/* ================================================== */}
                                {/* Video */}
                                {/* ================================================== */}

                                {selectedLesson.video?.url ? (

                                    <div
                                        className="
                                            mt-8
                                            overflow-hidden
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[#111111]
                                            shadow-2xl
                                        "
                                    >

                                        <video
                                            src={
                                                selectedLesson.video.url
                                            }
                                            poster={
                                                selectedLesson.video.thumbnail ||
                                                undefined
                                            }
                                            controls
                                            className="aspect-video w-full"
                                        />

                                    </div>

                                ) : (

                                    <div
                                        className="
                                            mt-8
                                            flex
                                            aspect-video
                                            items-center
                                            justify-center
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                        "
                                    >

                                        <div className="text-center">

                                            <div
                                                className="
                                                    mx-auto
                                                    flex
                                                    h-16
                                                    w-16
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    bg-[var(--color-primary)]/10
                                                "
                                            >

                                                <PlayCircle
                                                    size={34}
                                                    className="
                                                        text-[var(--color-primary)]
                                                    "
                                                />

                                            </div>


                                            <p className="mt-4 text-sm font-medium text-white">
                                                No video available
                                            </p>

                                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                This lesson currently has no
                                                video attached.
                                            </p>

                                        </div>

                                    </div>

                                )}


                                {/* ================================================== */}
                                {/* Lesson Content */}
                                {/* ================================================== */}

                                {selectedLesson.content && (

                                    <article
                                        className="
                                            mt-8
                                            rounded-2xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            p-6
                                            sm:p-8
                                        "
                                    >

                                        <h3 className="text-lg font-bold text-[var(--color-primary)]">
                                            Lesson Content
                                        </h3>


                                        <div
                                            className="
                                                mt-6
                                                whitespace-pre-wrap
                                                text-sm
                                                leading-8
                                                text-white
                                            "
                                        >
                                            {
                                                typeof selectedLesson.content ===
                                                "string"
                                                    ? selectedLesson.content
                                                    : JSON.stringify(
                                                        selectedLesson.content,
                                                        null,
                                                        2
                                                    )
                                            }
                                        </div>

                                    </article>

                                )}


                                {/* ================================================== */}
                                {/* Lesson Meta */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-6
                                        flex
                                        flex-wrap
                                        gap-5
                                        text-sm
                                        text-[var(--color-text-muted)]
                                    "
                                >

                                    <span className="flex items-center gap-2">

                                        <Clock3
                                            size={17}
                                            className="text-[var(--color-primary)]"
                                        />

                                        {selectedLesson.video?.duration ||
                                            0}{" "}
                                        minutes

                                    </span>


                                    <span className="flex items-center gap-2">

                                        <BookOpen
                                            size={17}
                                            className="text-[var(--color-primary)]"
                                        />

                                        Lesson{" "}
                                        {selectedLesson.position}

                                    </span>

                                </div>


                                {/* ================================================== */}
                                {/* Complete */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-8
                                        border-t
                                        border-[var(--color-border)]
                                        pt-7
                                    "
                                >

                                    {selectedLessonCompleted ? (

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-3
                                                rounded-xl
                                                border
                                                border-[var(--color-primary)]/30
                                                bg-[var(--color-primary)]/10
                                                p-4
                                            "
                                        >

                                            <CheckCircle2
                                                size={22}
                                                className="
                                                    shrink-0
                                                    text-[var(--color-primary)]
                                                "
                                            />

                                            <div>

                                                <p className="text-sm font-semibold text-[var(--color-primary)]">
                                                    Lesson completed
                                                </p>

                                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                                    Your course progress has
                                                    been updated.
                                                </p>

                                            </div>

                                        </div>

                                    ) : (

                                        <button
                                            type="button"
                                            onClick={
                                                handleCompleteLesson
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                bg-[var(--color-primary)]
                                                px-6
                                                py-3.5
                                                text-sm
                                                font-bold
                                                text-black
                                                transition
                                                hover:bg-[var(--color-primary-dark)]
                                                disabled:cursor-not-allowed
                                                disabled:opacity-60
                                                sm:w-auto
                                            "
                                        >

                                            {actionLoading ? (

                                                <>
                                                    <Loader2
                                                        size={17}
                                                        className="animate-spin"
                                                    />

                                                    Updating...

                                                </>

                                            ) : (

                                                <>
                                                    <CheckCircle2
                                                        size={17}
                                                    />

                                                    Mark as Complete
                                                </>

                                            )}

                                        </button>

                                    )}

                                </div>


                                {/* ================================================== */}
                                {/* Previous / Next */}
                                {/* ================================================== */}

                                <div
                                    className="
                                        mt-8
                                        grid
                                        gap-3
                                        border-t
                                        border-[var(--color-border)]
                                        pt-6
                                        sm:grid-cols-2
                                    "
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            handlePreviousLesson
                                        }
                                        disabled={!previousLesson}
                                        className="
                                            flex
                                            items-center
                                            gap-3
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            px-4
                                            py-3
                                            text-left
                                            transition
                                            hover:border-[var(--color-primary)]/40
                                            disabled:cursor-not-allowed
                                            disabled:opacity-30
                                        "
                                    >

                                        <ArrowLeft
                                            size={18}
                                            className="text-[var(--color-primary)]"
                                        />

                                        <div className="min-w-0">

                                            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Previous
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {previousLesson?.title ||
                                                    "No previous lesson"}
                                            </p>

                                        </div>

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            handleNextLesson
                                        }
                                        disabled={!nextLesson}
                                        className="
                                            flex
                                            items-center
                                            justify-end
                                            gap-3
                                            rounded-xl
                                            border
                                            border-[var(--color-border)]
                                            bg-[var(--color-surface)]
                                            px-4
                                            py-3
                                            text-right
                                            transition
                                            hover:border-[var(--color-primary)]/40
                                            disabled:cursor-not-allowed
                                            disabled:opacity-30
                                        "
                                    >

                                        <div className="min-w-0">

                                            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Next
                                            </p>

                                            <p className="mt-1 truncate text-sm font-semibold text-white">
                                                {nextLesson?.title ||
                                                    "No next lesson"}
                                            </p>

                                        </div>


                                        <ArrowRight
                                            size={18}
                                            className="text-[var(--color-primary)]"
                                        />

                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </section>

            </main>

        </div>

    );

};


export default Learning;