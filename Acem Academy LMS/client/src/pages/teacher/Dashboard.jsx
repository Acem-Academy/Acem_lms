import { useEffect, useState } from "react";

import {
    BookOpen,
    Users,
    FileText,
    CheckCircle2,
    ArrowRight,
    Plus,
    Clock3,
} from "lucide-react";

import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { getMyCourses } from "@/api/teacher.api";
import { getTeacherStudents } from "@/api/enrollment.api";
import {
    getSubCourses,
    getChapters,
    getTopics,
    getLessons,
} from "@/api/curriculum.api";


const TeacherDashboard = () => {

    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [coursesError, setCoursesError] = useState("");
    const [totalStudents, setTotalStudents] = useState(null);
    const [totalLessons, setTotalLessons] = useState(null);


    /* ========================================================= */
    /* Fetch Teacher Courses */
    /* ========================================================= */

    useEffect(() => {

        const fetchMyCourses = async () => {

            try {

                setLoadingCourses(true);
                setCoursesError("");

                const response = await getMyCourses();

                setCourses(response.data || []);

            } catch (error) {

                console.error(
                    "Failed to fetch teacher courses:",
                    error
                );

                setCoursesError(
                    "Unable to load your courses."
                );

            } finally {

                setLoadingCourses(false);

            }

        };

        fetchMyCourses();

    }, []);


    /* ========================================================= */
    /* Fetch Teacher Statistics */
    /* ========================================================= */

    useEffect(() => {

        if (loadingCourses) {
            return;
        }

        const courseIds = new Set(
            courses.map((course) => course._id.toString())
        );

        const resolveId = (value) =>
            value && (value._id || value).toString();

        const fetchStats = async () => {

            try {

                const [
                    studentsResponse,
                    subCoursesResponse,
                    chaptersResponse,
                    topicsResponse,
                    lessonsResponse,
                ] = await Promise.all([
                    getTeacherStudents(),
                    getSubCourses(),
                    getChapters(),
                    getTopics(),
                    getLessons(),
                ]);

                setTotalStudents(
                    (studentsResponse.data || []).length
                );

                const subCourseIds = new Set(
                    (subCoursesResponse.data || [])
                        .filter((subCourse) =>
                            courseIds.has(
                                resolveId(subCourse.course)
                            )
                        )
                        .map((subCourse) =>
                            subCourse._id.toString()
                        )
                );

                const chapterIds = new Set(
                    (chaptersResponse.data || [])
                        .filter((chapter) =>
                            subCourseIds.has(
                                resolveId(chapter.subCourse)
                            )
                        )
                        .map((chapter) =>
                            chapter._id.toString()
                        )
                );

                const topicIds = new Set(
                    (topicsResponse.data || [])
                        .filter((topic) =>
                            chapterIds.has(
                                resolveId(topic.chapter)
                            )
                        )
                        .map((topic) =>
                            topic._id.toString()
                        )
                );

                setTotalLessons(
                    (lessonsResponse.data || []).filter(
                        (lesson) =>
                            topicIds.has(
                                resolveId(lesson.topic)
                            )
                    ).length
                );

            } catch (error) {

                console.error(
                    "Failed to fetch teacher statistics:",
                    error
                );

            }

        };

        fetchStats();

    }, [courses, loadingCourses]);


    /* ========================================================= */
    /* Statistics */
    /* ========================================================= */

    const totalCourses = courses.length;

    const publishedCourses = courses.filter(
        (course) => course.status === "published"
    ).length;


    const stats = [
        {
            title: "My Courses",
            value: totalCourses,
            description: "Courses created by you",
            icon: BookOpen,
        },
        {
            title: "Published Courses",
            value: publishedCourses,
            description: "Currently published",
            icon: CheckCircle2,
        },
        {
            title: "Total Students",
            value: totalStudents ?? 0,
            description: "Students enrolled",
            icon: Users,
        },
        {
            title: "Total Lessons",
            value: totalLessons ?? 0,
            description: "Lessons across your courses",
            icon: FileText,
        },
    ];


    return (

        <div className="min-h-screen bg-black text-white">

            <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">


                {/* ================================================= */}
                {/* Header */}
                {/* ================================================= */}

                <section
                    className="
                        flex
                        flex-col
                        gap-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    <div>

                        <p
                            className="
                                text-sm
                                font-semibold
                                uppercase
                                tracking-[0.18em]
                                text-[var(--color-primary)]
                            "
                        >
                            Teacher Dashboard
                        </p>

                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-bold
                                tracking-tight
                                text-white
                                md:text-4xl
                            "
                        >
                            Welcome back 👋
                        </h1>

                        <p
                            className="
                                mt-2
                                max-w-2xl
                                text-sm
                                leading-6
                                text-[var(--color-text-muted)]
                            "
                        >
                            Manage your courses, lessons, students,
                            assignments and quizzes from one place.
                        </p>

                    </div>


                    <Link
                        to={ROUTES.TEACHER.COURSES}
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
                {/* Statistics */}
                {/* ================================================= */}

                <section
                    className="
                        mt-8
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >

                    {stats.map((stat) => {

                        const Icon = stat.icon;

                        return (

                            <div
                                key={stat.title}
                                className="
                                    rounded-2xl
                                    border
                                    border-[var(--color-border)]
                                    bg-[var(--color-surface)]
                                    p-5
                                    transition
                                    hover:border-[var(--color-primary)]
                                "
                            >

                                <div className="flex items-start justify-between">

                                    <div>

                                        <p
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--color-text-muted)]
                                            "
                                        >
                                            {stat.title}
                                        </p>

                                        <p
                                            className="
                                                mt-3
                                                text-3xl
                                                font-bold
                                                text-white
                                            "
                                        >
                                            {stat.value}
                                        </p>

                                    </div>


                                    <div
                                        className="
                                            flex
                                            h-11
                                            w-11
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-[var(--color-primary)]
                                        "
                                    >

                                        <Icon
                                            size={21}
                                            className="text-black"
                                        />

                                    </div>

                                </div>


                                <p
                                    className="
                                        mt-3
                                        text-xs
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    {stat.description}
                                </p>

                            </div>

                        );

                    })}

                </section>


                {/* ================================================= */}
                {/* Main Content */}
                {/* ================================================= */}

                <section
                    className="
                        mt-8
                        grid
                        gap-6
                        xl:grid-cols-[1.5fr_1fr]
                    "
                >


                    {/* ================================================= */}
                    {/* My Courses */}
                    {/* ================================================= */}

                    <div
                        className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-[var(--color-border)]
                            bg-[var(--color-surface)]
                        "
                    >

                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                border-b
                                border-[var(--color-border)]
                                px-6
                                py-5
                            "
                        >

                            <div>

                                <h2
                                    className="
                                        text-lg
                                        font-bold
                                        text-white
                                    "
                                >
                                    My Courses
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        text-[var(--color-text-muted)]
                                    "
                                >
                                    Your recently created courses
                                </p>

                            </div>


                            <Link
                                to={ROUTES.TEACHER.COURSES}
                                className="
                                    flex
                                    items-center
                                    gap-1
                                    text-sm
                                    font-semibold
                                    text-[var(--color-primary)]
                                    hover:underline
                                "
                            >
                                View All

                                <ArrowRight size={16} />

                            </Link>

                        </div>


                        {/* ================================================= */}
                        {/* Loading */}
                        {/* ================================================= */}

                        {loadingCourses && (

                            <div
                                className="
                                    flex
                                    min-h-64
                                    items-center
                                    justify-center
                                "
                            >

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-3
                                        text-sm
                                        text-[var(--color-text-muted)]
                                    "
                                >

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

                        {!loadingCourses && coursesError && (

                            <div
                                className="
                                    p-6
                                    text-center
                                "
                            >

                                <p
                                    className="
                                        text-sm
                                        text-red-400
                                    "
                                >
                                    {coursesError}
                                </p>

                            </div>

                        )}


                        {/* ================================================= */}
                        {/* Empty */}
                        {/* ================================================= */}

                        {!loadingCourses &&
                            !coursesError &&
                            courses.length === 0 && (

                                <div
                                    className="
                                        flex
                                        min-h-64
                                        flex-col
                                        items-center
                                        justify-center
                                        px-6
                                        py-10
                                        text-center
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            h-14
                                            w-14
                                            items-center
                                            justify-center
                                            rounded-2xl
                                            bg-[var(--color-primary)]
                                        "
                                    >

                                        <BookOpen
                                            size={25}
                                            className="text-black"
                                        />

                                    </div>


                                    <h3
                                        className="
                                            mt-4
                                            text-base
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        No courses yet
                                    </h3>


                                    <p
                                        className="
                                            mt-2
                                            max-w-sm
                                            text-sm
                                            leading-6
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        Create your first course and start
                                        building your curriculum.
                                    </p>


                                    <Link
                                        to={ROUTES.TEACHER.COURSES}
                                        className="
                                            mt-5
                                            inline-flex
                                            items-center
                                            gap-2
                                            rounded-xl
                                            border
                                            border-[var(--color-primary)]
                                            px-4
                                            py-2.5
                                            text-sm
                                            font-semibold
                                            text-[var(--color-primary)]
                                            transition
                                            hover:bg-[var(--color-primary)]
                                            hover:text-black
                                        "
                                    >

                                        <Plus size={16} />

                                        Create Course

                                    </Link>

                                </div>

                            )}


                        {/* ================================================= */}
                        {/* Course List */}
                        {/* ================================================= */}

                        {!loadingCourses &&
                            !coursesError &&
                            courses.length > 0 && (

                                <div className="divide-y divide-[var(--color-border)]">

                                    {courses.slice(0, 4).map((course) => {

                                        const durationInHours =
                                            Math.round(course.duration / 60);

                                        return (

                                            <div
                                                key={course._id}
                                                className="
                                                    flex
                                                    flex-col
                                                    gap-4
                                                    p-5
                                                    transition
                                                    hover:bg-black/40
                                                    sm:flex-row
                                                    sm:items-center
                                                "
                                            >

                                                {/* Thumbnail */}

                                                <div
                                                    className="
                                                        flex
                                                        h-20
                                                        w-full
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        overflow-hidden
                                                        rounded-xl
                                                        bg-black
                                                        sm:w-32
                                                    "
                                                >

                                                    {course.thumbnail ? (

                                                        <img
                                                            src={course.thumbnail}
                                                            alt={course.title}
                                                            className="
                                                                h-full
                                                                w-full
                                                                object-cover
                                                            "
                                                        />

                                                    ) : (

                                                        <BookOpen
                                                            size={24}
                                                            className="
                                                                text-[var(--color-primary)]
                                                            "
                                                        />

                                                    )}

                                                </div>


                                                {/* Course Info */}

                                                <div className="min-w-0 flex-1">

                                                    <div
                                                        className="
                                                            flex
                                                            flex-wrap
                                                            items-center
                                                            gap-2
                                                        "
                                                    >

                                                        <span
                                                            className="
                                                                rounded-full
                                                                bg-[var(--color-primary)]
                                                                px-2.5
                                                                py-1
                                                                text-[10px]
                                                                font-bold
                                                                text-black
                                                            "
                                                        >
                                                            {course.courseCode}
                                                        </span>


                                                        <span
                                                            className={`
                                                                rounded-full
                                                                px-2.5
                                                                py-1
                                                                text-[10px]
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


                                                    <h3
                                                        className="
                                                            mt-2
                                                            truncate
                                                            text-base
                                                            font-bold
                                                            text-white
                                                        "
                                                    >
                                                        {course.title}
                                                    </h3>


                                                    <p
                                                        className="
                                                            mt-1
                                                            line-clamp-1
                                                            text-xs
                                                            text-[var(--color-text-muted)]
                                                        "
                                                    >
                                                        {course.description}
                                                    </p>


                                                    <div
                                                        className="
                                                            mt-2
                                                            flex
                                                            items-center
                                                            gap-4
                                                            text-xs
                                                            text-[var(--color-text-muted)]
                                                        "
                                                    >

                                                        <span className="flex items-center gap-1.5">

                                                            <Clock3 size={13} />

                                                            {durationInHours}h

                                                        </span>

                                                    </div>

                                                </div>


                                                {/* Action */}

                                                <Link
                                                    to={`/teacher/courses/${course._id}`}
                                                    className="
                                                        inline-flex
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        gap-2
                                                        rounded-lg
                                                        border
                                                        border-[var(--color-border)]
                                                        px-3
                                                        py-2
                                                        text-xs
                                                        font-semibold
                                                        text-[var(--color-primary)]
                                                        transition
                                                        hover:border-[var(--color-primary)]
                                                        hover:bg-[var(--color-primary)]
                                                        hover:text-black
                                                    "
                                                >

                                                    Manage

                                                    <ArrowRight size={14} />

                                                </Link>

                                            </div>

                                        );

                                    })}

                                </div>

                            )}

                    </div>


                    {/* ================================================= */}
                    {/* Quick Actions */}
                    {/* ================================================= */}

                    <div
                        className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-[var(--color-border)]
                            bg-[var(--color-surface)]
                        "
                    >

                        <div
                            className="
                                border-b
                                border-[var(--color-border)]
                                px-6
                                py-5
                            "
                        >

                            <h2
                                className="
                                    text-lg
                                    font-bold
                                    text-white
                                "
                            >
                                Quick Actions
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    text-[var(--color-text-muted)]
                                "
                            >
                                Quickly access common tasks.
                            </p>

                        </div>


                        <div className="space-y-3 p-5">

                            {/* Courses */}

                            <Link
                                to={ROUTES.TEACHER.COURSES}
                                className="
                                    group
                                    flex
                                    items-center
                                    gap-4
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    p-4
                                    transition
                                    hover:border-[var(--color-primary)]
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-[var(--color-primary)]
                                    "
                                >

                                    <BookOpen
                                        size={19}
                                        className="text-black"
                                    />

                                </div>


                                <div>

                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-white
                                            group-hover:text-[var(--color-primary)]
                                        "
                                    >
                                        Manage Courses
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        Create and manage your courses
                                    </p>

                                </div>


                                <ArrowRight
                                    size={16}
                                    className="
                                        ml-auto
                                        text-[var(--color-text-muted)]
                                        transition
                                        group-hover:translate-x-1
                                        group-hover:text-[var(--color-primary)]
                                    "
                                />

                            </Link>


                            {/* Students */}

                            <Link
                                to={ROUTES.TEACHER.STUDENTS}
                                className="
                                    group
                                    flex
                                    items-center
                                    gap-4
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    p-4
                                    transition
                                    hover:border-[var(--color-primary)]
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-[var(--color-primary)]
                                    "
                                >

                                    <Users
                                        size={19}
                                        className="text-black"
                                    />

                                </div>


                                <div>

                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-white
                                            group-hover:text-[var(--color-primary)]
                                        "
                                    >
                                        View Students
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        View your enrolled students
                                    </p>

                                </div>


                                <ArrowRight
                                    size={16}
                                    className="
                                        ml-auto
                                        text-[var(--color-text-muted)]
                                        transition
                                        group-hover:translate-x-1
                                        group-hover:text-[var(--color-primary)]
                                    "
                                />

                            </Link>


                            {/* Future Assignment */}

                            {/* <div
                                className="
                                    flex
                                    items-center
                                    gap-4
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    p-4
                                    opacity-60
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-[var(--color-primary)]
                                    "
                                >

                                    <FileText
                                        size={19}
                                        className="text-black"
                                    />

                                </div>


                                <div>

                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-white
                                        "
                                    >
                                        Assignments
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            text-[var(--color-text-muted)]
                                        "
                                    >
                                        Coming with assignment module
                                    </p>

                                </div>

                            </div> */}

                        </div>

                    </div>

                </section>


                {/* ================================================= */}
                {/* Recent Activity */}
                {/* ================================================= */}

                <section
                    className="
                        mt-6
                        rounded-2xl
                        border
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            border-b
                            border-[var(--color-border)]
                            px-6
                            py-5
                        "
                    >

                        <Clock3
                            size={19}
                            className="text-[var(--color-primary)]"
                        />


                        <div>

                            <h2
                                className="
                                    text-lg
                                    font-bold
                                    text-white
                                "
                            >
                                Recent Activity
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    text-[var(--color-text-muted)]
                                "
                            >
                                Your latest teacher activity will
                                appear here.
                            </p>

                        </div>

                    </div>


                    <div
                        className="
                            flex
                            min-h-32
                            items-center
                            justify-center
                            px-6
                            py-8
                        "
                    >

                        <p
                            className="
                                text-sm
                                text-[var(--color-text-muted)]
                            "
                        >
                            No recent activity yet.
                        </p>

                    </div>

                </section>

            </div>

        </div>

    );
};


export default TeacherDashboard;