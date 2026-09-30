import React, { useEffect, useMemo, useState } from "react";
import { getTeacherStudents } from "../../api/enrollment.api.js";

/*
|--------------------------------------------------------------------------
| Get Students
|--------------------------------------------------------------------------
|
| Teacher Students Page
|
| Shows only students enrolled in courses belonging to the
| currently authenticated teacher.
|
|--------------------------------------------------------------------------
*/

const GetStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("all");

    const [selectedStudent, setSelectedStudent] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Fetch Students
    |--------------------------------------------------------------------------
    */

    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getTeacherStudents();

            const studentData =
                response?.data?.data ||
                response?.data ||
                [];

            setStudents(
                Array.isArray(studentData)
                    ? studentData
                    : []
            );
        } catch (err) {
            console.error(
                "Failed to fetch teacher students:",
                err
            );

            setError(
                err?.response?.data?.message ||
                    "Failed to load students."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Courses For Filter
    |--------------------------------------------------------------------------
    */

    const courses = useMemo(() => {
        const courseMap = new Map();

        students.forEach((studentData) => {
            studentData?.courses?.forEach((item) => {
                const course = item?.course;

                if (
                    course?._id &&
                    !courseMap.has(course._id)
                ) {
                    courseMap.set(
                        course._id,
                        course
                    );
                }
            });
        });

        return Array.from(courseMap.values());
    }, [students]);

    /*
    |--------------------------------------------------------------------------
    | Filter Students
    |--------------------------------------------------------------------------
    */

    const filteredStudents = useMemo(() => {
        const searchValue =
            search.trim().toLowerCase();

        return students.filter(
            (studentData) => {
                const student =
                    studentData?.student;

                const matchesSearch =
                    !searchValue ||
                    student?.fullName
                        ?.toLowerCase()
                        .includes(searchValue) ||
                    student?.email
                        ?.toLowerCase()
                        .includes(searchValue);

                const matchesCourse =
                    courseFilter === "all" ||
                    studentData?.courses?.some(
                        (item) =>
                            item?.course?._id ===
                            courseFilter
                    );

                return (
                    matchesSearch &&
                    matchesCourse
                );
            }
        );
    }, [
        students,
        search,
        courseFilter,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    const getInitials = (name = "") => {
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) =>
                word.charAt(0).toUpperCase()
            )
            .join("");
    };

    const getAverageProgress = (courses = []) => {
        if (!courses.length) {
            return 0;
        }

        const total = courses.reduce(
            (sum, course) =>
                sum +
                Number(course?.progress || 0),
            0
        );

        return Math.round(
            total / courses.length
        );
    };

    const getStatusClasses = (status) => {
        if (
            String(status).toLowerCase() ===
            "completed"
        ) {
            return "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]";
        }

        return "border-[#FFE36E]/30 bg-[#FFE36E]/10 text-[#FFE36E]";
    };

    /*
    |--------------------------------------------------------------------------
    | Loading State
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div
                className="min-h-screen p-6"
                style={{
                    backgroundColor:
                        "var(--color-background)",
                    color:
                        "var(--color-text-secondary)",
                }}
            >
                <div className="mx-auto max-w-7xl">

                    <div className="mb-8">
                        <div
                            className="h-8 w-48 animate-pulse rounded-lg"
                            style={{
                                backgroundColor:
                                    "var(--color-surface)",
                            }}
                        />

                        <div
                            className="mt-3 h-4 w-72 animate-pulse rounded"
                            style={{
                                backgroundColor:
                                    "var(--color-surface)",
                            }}
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                        {[1, 2, 3, 4, 5, 6].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="animate-pulse rounded-2xl p-5"
                                    style={{
                                        backgroundColor:
                                            "var(--color-surface)",
                                        border:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    <div className="flex items-center gap-4">

                                        <div
                                            className="h-12 w-12 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    "var(--color-border)",
                                            }}
                                        />

                                        <div className="flex-1">
                                            <div
                                                className="h-4 w-32 rounded"
                                                style={{
                                                    backgroundColor:
                                                        "var(--color-border)",
                                                }}
                                            />

                                            <div
                                                className="mt-2 h-3 w-44 rounded"
                                                style={{
                                                    backgroundColor:
                                                        "var(--color-border)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div
                                        className="mt-6 h-3 w-full rounded"
                                        style={{
                                            backgroundColor:
                                                "var(--color-border)",
                                        }}
                                    />

                                    <div
                                        className="mt-3 h-3 w-3/4 rounded"
                                        style={{
                                            backgroundColor:
                                                "var(--color-border)",
                                        }}
                                    />
                                </div>
                            )
                        )}

                    </div>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Main UI
    |--------------------------------------------------------------------------
    */

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor:
                    "var(--color-background)",
                color:
                    "var(--color-text-secondary)",
            }}
        >
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">

                {/* ==========================================================
                    Header
                ========================================================== */}

                <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

                    <div>

                        <p
                            className="mb-2 text-sm font-semibold"
                            style={{
                                color:
                                    "var(--color-primary)",
                            }}
                        >
                            Teacher Dashboard
                        </p>

                        <h1
                            className="text-3xl font-bold tracking-tight"
                            style={{
                                color:
                                    "var(--color-text-secondary)",
                            }}
                        >
                            Students
                        </h1>

                        <p
                            className="mt-2 max-w-2xl text-sm"
                            style={{
                                color:
                                    "var(--color-text-muted)",
                            }}
                        >
                            View and manage students enrolled
                            in your courses.
                        </p>

                    </div>

                    {/* Total Students */}

                    <div
                        className="rounded-2xl px-5 py-4"
                        style={{
                            backgroundColor:
                                "var(--color-surface)",
                            border:
                                "1px solid var(--color-border)",
                        }}
                    >
                        <p
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{
                                color:
                                    "var(--color-text-muted)",
                            }}
                        >
                            Total Students
                        </p>

                        <p
                            className="mt-1 text-2xl font-bold"
                            style={{
                                color:
                                    "var(--color-primary)",
                            }}
                        >
                            {students.length}
                        </p>
                    </div>

                </div>

                {/* ==========================================================
                    Error
                ========================================================== */}

                {error && (
                    <div
                        className="mb-6 flex items-center justify-between rounded-xl px-4 py-3"
                        style={{
                            backgroundColor:
                                "rgba(239, 68, 68, 0.08)",
                            border:
                                "1px solid rgba(239, 68, 68, 0.3)",
                        }}
                    >
                        <p
                            className="text-sm font-medium"
                            style={{
                                color:
                                    "var(--color-danger)",
                            }}
                        >
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={fetchStudents}
                            className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-80"
                            style={{
                                backgroundColor:
                                    "var(--color-danger)",
                                color: "#FFFFFF",
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* ==========================================================
                    Filters
                ========================================================== */}

                <div
                    className="mb-6 rounded-2xl p-4"
                    style={{
                        backgroundColor:
                            "var(--color-surface)",
                        border:
                            "1px solid var(--color-border)",
                    }}
                >
                    <div className="grid gap-4 md:grid-cols-[1fr_260px]">

                        {/* Search */}

                        <div className="relative">

                            <svg
                                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                                style={{
                                    color:
                                        "var(--color-text-muted)",
                                }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                                />
                            </svg>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search students by name or email..."
                                className="w-full rounded-xl py-3 pl-12 pr-4 text-sm outline-none transition"
                                style={{
                                    backgroundColor:
                                        "var(--color-background)",
                                    color:
                                        "var(--color-text-secondary)",
                                    border:
                                        "1px solid var(--color-border)",
                                }}
                            />

                        </div>

                        {/* Course Filter */}

                        <select
                            value={courseFilter}
                            onChange={(e) =>
                                setCourseFilter(
                                    e.target.value
                                )
                            }
                            className="rounded-xl px-4 py-3 text-sm font-medium outline-none transition"
                            style={{
                                backgroundColor:
                                    "var(--color-background)",
                                color:
                                    "var(--color-text-secondary)",
                                border:
                                    "1px solid var(--color-border)",
                            }}
                        >
                            <option value="all">
                                All Courses
                            </option>

                            {courses.map((course) => (
                                <option
                                    key={course._id}
                                    value={course._id}
                                >
                                    {course.title}
                                </option>
                            ))}
                        </select>

                    </div>
                </div>

                {/* ==========================================================
                    Empty State
                ========================================================== */}

                {filteredStudents.length === 0 ? (
                    <div
                        className="rounded-2xl px-6 py-16 text-center"
                        style={{
                            backgroundColor:
                                "var(--color-surface)",
                            border:
                                "1px dashed var(--color-border)",
                        }}
                    >
                        <div
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                            style={{
                                backgroundColor:
                                    "rgba(255, 227, 110, 0.08)",
                                color:
                                    "var(--color-primary)",
                            }}
                        >
                            <svg
                                className="h-8 w-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    d="M15 19a4 4 0 0 0-8 0m4-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 8a4 4 0 0 0-4-4m2-4a3 3 0 1 0 0-6"
                                />
                            </svg>
                        </div>

                        <h3
                            className="mt-5 text-lg font-semibold"
                            style={{
                                color:
                                    "var(--color-text-secondary)",
                            }}
                        >
                            No students found
                        </h3>

                        <p
                            className="mx-auto mt-2 max-w-md text-sm"
                            style={{
                                color:
                                    "var(--color-text-muted)",
                            }}
                        >
                            {search ||
                            courseFilter !== "all"
                                ? "Try changing your search or course filter."
                                : "Students enrolled in your courses will appear here."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ==================================================
                            Results Count
                        ================================================== */}

                        <div className="mb-4 flex items-center justify-between">

                            <p
                                className="text-sm"
                                style={{
                                    color:
                                        "var(--color-text-muted)",
                                }}
                            >
                                Showing{" "}
                                <span
                                    className="font-semibold"
                                    style={{
                                        color:
                                            "var(--color-primary)",
                                    }}
                                >
                                    {filteredStudents.length}
                                </span>{" "}
                                student
                                {filteredStudents.length !==
                                1
                                    ? "s"
                                    : ""}
                            </p>

                        </div>

                        {/* ==================================================
                            Students Grid
                        ================================================== */}

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                            {filteredStudents.map(
                                (studentData) => {

                                    const student =
                                        studentData?.student;

                                    const studentCourses =
                                        studentData?.courses ||
                                        [];

                                    const averageProgress =
                                        getAverageProgress(
                                            studentCourses
                                        );

                                    return (
                                        <div
                                            key={
                                                student?._id
                                            }
                                            className="group overflow-hidden rounded-2xl transition duration-200 hover:-translate-y-0.5"
                                            style={{
                                                backgroundColor:
                                                    "var(--color-surface)",
                                                border:
                                                    "1px solid var(--color-border)",
                                            }}
                                        >

                                            <div className="p-5">

                                                {/* Student */}

                                                <div className="flex items-start justify-between gap-4">

                                                    <div className="flex min-w-0 items-center gap-4">

                                                        {student
                                                            ?.avatar
                                                            ?.url ? (
                                                            <img
                                                                src={
                                                                    student
                                                                        .avatar
                                                                        .url
                                                                }
                                                                alt={
                                                                    student?.fullName ||
                                                                    "Student"
                                                                }
                                                                className="h-12 w-12 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                                                                style={{
                                                                    backgroundColor:
                                                                        "rgba(255, 227, 110, 0.12)",
                                                                    color:
                                                                        "var(--color-primary)",
                                                                    border:
                                                                        "1px solid rgba(255, 227, 110, 0.2)",
                                                                }}
                                                            >
                                                                {getInitials(
                                                                    student?.fullName
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="min-w-0">

                                                            <h3
                                                                className="truncate font-semibold"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {student?.fullName ||
                                                                    "Unknown Student"}
                                                            </h3>

                                                            <p
                                                                className="mt-1 truncate text-sm"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-muted)",
                                                                }}
                                                            >
                                                                {student?.email ||
                                                                    "No email"}
                                                            </p>

                                                        </div>

                                                    </div>

                                                    <span
                                                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold"
                                                        style={{
                                                            backgroundColor:
                                                                "rgba(255, 227, 110, 0.08)",
                                                            color:
                                                                "var(--color-primary)",
                                                            border:
                                                                "1px solid rgba(255, 227, 110, 0.2)",
                                                        }}
                                                    >
                                                        {
                                                            studentData?.totalCourses
                                                        }{" "}
                                                        course
                                                        {studentData?.totalCourses !==
                                                        1
                                                            ? "s"
                                                            : ""}
                                                    </span>

                                                </div>

                                                {/* Overall Progress */}

                                                <div className="mt-6">

                                                    <div className="mb-2 flex items-center justify-between">

                                                        <span
                                                            className="text-xs font-medium"
                                                            style={{
                                                                color:
                                                                    "var(--color-text-muted)",
                                                            }}
                                                        >
                                                            Overall
                                                            Progress
                                                        </span>

                                                        <span
                                                            className="text-sm font-bold"
                                                            style={{
                                                                color:
                                                                    "var(--color-primary)",
                                                            }}
                                                        >
                                                            {
                                                                averageProgress
                                                            }
                                                            %
                                                        </span>

                                                    </div>

                                                    <div
                                                        className="h-2 overflow-hidden rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                "var(--color-border)",
                                                        }}
                                                    >
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min(
                                                                    Math.max(
                                                                        averageProgress,
                                                                        0
                                                                    ),
                                                                    100
                                                                )}%`,
                                                                backgroundColor:
                                                                    "var(--color-primary)",
                                                            }}
                                                        />
                                                    </div>

                                                </div>

                                                {/* Courses */}

                                                <div className="mt-6 space-y-3">

                                                    {studentCourses
                                                        .slice(
                                                            0,
                                                            3
                                                        )
                                                        .map(
                                                            (
                                                                item
                                                            ) => {

                                                                const progress =
                                                                    Number(
                                                                        item?.progress ||
                                                                            0
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={
                                                                            item?.enrollmentId ||
                                                                            item
                                                                                ?.course
                                                                                ?._id
                                                                        }
                                                                        className="rounded-xl p-3"
                                                                        style={{
                                                                            backgroundColor:
                                                                                "var(--color-background)",
                                                                            border:
                                                                                "1px solid var(--color-border)",
                                                                        }}
                                                                    >

                                                                        <div className="flex items-start justify-between gap-3">

                                                                            <div className="min-w-0">

                                                                                <p
                                                                                    className="truncate text-sm font-semibold"
                                                                                    style={{
                                                                                        color:
                                                                                            "var(--color-text-secondary)",
                                                                                    }}
                                                                                >
                                                                                    {item
                                                                                        ?.course
                                                                                        ?.title ||
                                                                                        "Unknown Course"}
                                                                                </p>

                                                                                <p
                                                                                    className="mt-1 text-xs"
                                                                                    style={{
                                                                                        color:
                                                                                            "var(--color-text-muted)",
                                                                                    }}
                                                                                >
                                                                                    {item
                                                                                        ?.course
                                                                                        ?.courseCode ||
                                                                                        "No course code"}
                                                                                </p>

                                                                            </div>

                                                                            <span
                                                                                className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(
                                                                                    item?.status
                                                                                )}`}
                                                                            >
                                                                                {
                                                                                    item?.status
                                                                                }
                                                                            </span>

                                                                        </div>

                                                                        <div className="mt-3 flex items-center gap-3">

                                                                            <div
                                                                                className="h-1.5 flex-1 overflow-hidden rounded-full"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        "var(--color-border)",
                                                                                }}
                                                                            >
                                                                                <div
                                                                                    className="h-full rounded-full"
                                                                                    style={{
                                                                                        width: `${Math.min(
                                                                                            Math.max(
                                                                                                progress,
                                                                                                0
                                                                                            ),
                                                                                            100
                                                                                        )}%`,
                                                                                        backgroundColor:
                                                                                            "var(--color-primary)",
                                                                                    }}
                                                                                />
                                                                            </div>

                                                                            <span
                                                                                className="text-xs font-semibold"
                                                                                style={{
                                                                                    color:
                                                                                        "var(--color-text-muted)",
                                                                                }}
                                                                            >
                                                                                {
                                                                                    progress
                                                                                }
                                                                                %
                                                                            </span>

                                                                        </div>

                                                                    </div>
                                                                );
                                                            }
                                                        )}

                                                    {studentCourses.length >
                                                        3 && (
                                                        <p
                                                            className="text-center text-xs font-medium"
                                                            style={{
                                                                color:
                                                                    "var(--color-text-muted)",
                                                            }}
                                                        >
                                                            +
                                                            {studentCourses.length -
                                                                3}{" "}
                                                            more
                                                            course
                                                            {studentCourses.length -
                                                                3 !==
                                                            1
                                                                ? "s"
                                                                : ""}
                                                        </p>
                                                    )}

                                                </div>

                                            </div>

                                            {/* Footer */}

                                            <div
                                                className="px-5 py-3"
                                                style={{
                                                    borderTop:
                                                        "1px solid var(--color-border)",
                                                    backgroundColor:
                                                        "rgba(255,255,255,0.015)",
                                                }}
                                            >

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedStudent(
                                                            studentData
                                                        )
                                                    }
                                                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                                                    style={{
                                                        backgroundColor:
                                                            "var(--color-primary)",
                                                        color:
                                                            "#000000",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor =
                                                            "var(--color-primary-dark)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor =
                                                            "var(--color-primary)";
                                                    }}
                                                >
                                                    View Student
                                                    Details
                                                </button>

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    </>
                )}

            </div>

            {/* ==============================================================
                Student Details Modal
            ============================================================== */}

            {selectedStudent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    style={{
                        backgroundColor:
                            "rgba(0, 0, 0, 0.78)",
                    }}
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setSelectedStudent(null);
                        }
                    }}
                >

                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
                        style={{
                            backgroundColor:
                                "var(--color-surface)",
                            border:
                                "1px solid var(--color-border)",
                        }}
                    >

                        {/* Modal Header */}

                        <div
                            className="flex items-center justify-between px-6 py-5"
                            style={{
                                borderBottom:
                                    "1px solid var(--color-border)",
                            }}
                        >

                            <div>

                                <h2
                                    className="text-xl font-bold"
                                    style={{
                                        color:
                                            "var(--color-text-secondary)",
                                    }}
                                >
                                    Student Details
                                </h2>

                                <p
                                    className="mt-1 text-sm"
                                    style={{
                                        color:
                                            "var(--color-text-muted)",
                                    }}
                                >
                                    Enrollment information
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedStudent(
                                        null
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg transition"
                                style={{
                                    color:
                                        "var(--color-text-muted)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(255, 227, 110, 0.08)";
                                    e.currentTarget.style.color =
                                        "var(--color-primary)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    e.currentTarget.style.color =
                                        "var(--color-text-muted)";
                                }}
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18 18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>

                        </div>

                        {/* Modal Body */}

                        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">

                            {/* Student Info */}

                            <div
                                className="flex items-center gap-4 rounded-2xl p-5"
                                style={{
                                    backgroundColor:
                                        "var(--color-background)",
                                    border:
                                        "1px solid var(--color-border)",
                                }}
                            >

                                {selectedStudent
                                    ?.student
                                    ?.avatar?.url ? (
                                    <img
                                        src={
                                            selectedStudent
                                                .student
                                                .avatar
                                                .url
                                        }
                                        alt={
                                            selectedStudent
                                                ?.student
                                                ?.fullName ||
                                            "Student"
                                        }
                                        className="h-16 w-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
                                        style={{
                                            backgroundColor:
                                                "rgba(255, 227, 110, 0.12)",
                                            color:
                                                "var(--color-primary)",
                                            border:
                                                "1px solid rgba(255, 227, 110, 0.2)",
                                        }}
                                    >
                                        {getInitials(
                                            selectedStudent
                                                ?.student
                                                ?.fullName
                                        )}
                                    </div>
                                )}

                                <div>

                                    <h3
                                        className="text-lg font-bold"
                                        style={{
                                            color:
                                                "var(--color-text-secondary)",
                                        }}
                                    >
                                        {
                                            selectedStudent
                                                ?.student
                                                ?.fullName
                                        }
                                    </h3>

                                    <p
                                        className="mt-1 text-sm"
                                        style={{
                                            color:
                                                "var(--color-text-muted)",
                                        }}
                                    >
                                        {
                                            selectedStudent
                                                ?.student
                                                ?.email
                                        }
                                    </p>

                                </div>

                            </div>

                            {/* Courses */}

                            <div className="mt-6">

                                <div className="mb-4 flex items-center justify-between">

                                    <h3
                                        className="font-semibold"
                                        style={{
                                            color:
                                                "var(--color-text-secondary)",
                                        }}
                                    >
                                        Enrolled Courses
                                    </h3>

                                    <span
                                        className="rounded-lg px-3 py-1 text-xs font-semibold"
                                        style={{
                                            backgroundColor:
                                                "rgba(255, 227, 110, 0.1)",
                                            color:
                                                "var(--color-primary)",
                                            border:
                                                "1px solid rgba(255, 227, 110, 0.2)",
                                        }}
                                    >
                                        {
                                            selectedStudent?.totalCourses
                                        }{" "}
                                        course
                                        {selectedStudent?.totalCourses !==
                                        1
                                            ? "s"
                                            : ""}
                                    </span>

                                </div>

                                <div className="space-y-3">

                                    {selectedStudent?.courses?.map(
                                        (item) => {

                                            const progress =
                                                Number(
                                                    item?.progress ||
                                                        0
                                                );

                                            return (
                                                <div
                                                    key={
                                                        item?.enrollmentId
                                                    }
                                                    className="rounded-xl p-4"
                                                    style={{
                                                        backgroundColor:
                                                            "var(--color-background)",
                                                        border:
                                                            "1px solid var(--color-border)",
                                                    }}
                                                >

                                                    <div className="flex items-start justify-between gap-4">

                                                        <div>

                                                            <h4
                                                                className="font-semibold"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {item
                                                                    ?.course
                                                                    ?.title ||
                                                                    "Unknown Course"}
                                                            </h4>

                                                            <p
                                                                className="mt-1 text-xs"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-muted)",
                                                                }}
                                                            >
                                                                {item
                                                                    ?.course
                                                                    ?.courseCode ||
                                                                    "No course code"}
                                                            </p>

                                                        </div>

                                                        <span
                                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(
                                                                item?.status
                                                            )}`}
                                                        >
                                                            {
                                                                item?.status
                                                            }
                                                        </span>

                                                    </div>

                                                    {/* Progress */}

                                                    <div className="mt-4">

                                                        <div className="mb-2 flex items-center justify-between">

                                                            <span
                                                                className="text-xs"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-muted)",
                                                                }}
                                                            >
                                                                Progress
                                                            </span>

                                                            <span
                                                                className="text-sm font-bold"
                                                                style={{
                                                                    color:
                                                                        "var(--color-primary)",
                                                                }}
                                                            >
                                                                {
                                                                    progress
                                                                }
                                                                %
                                                            </span>

                                                        </div>

                                                        <div
                                                            className="h-2 overflow-hidden rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    "var(--color-border)",
                                                            }}
                                                        >
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        Math.max(
                                                                            progress,
                                                                            0
                                                                        ),
                                                                        100
                                                                    )}%`,
                                                                    backgroundColor:
                                                                        "var(--color-primary)",
                                                                }}
                                                            />
                                                        </div>

                                                    </div>

                                                    {/* Stats */}

                                                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">

                                                        <div
                                                            className="rounded-lg p-3"
                                                            style={{
                                                                backgroundColor:
                                                                    "var(--color-surface)",
                                                                border:
                                                                    "1px solid var(--color-border)",
                                                            }}
                                                        >

                                                            <p
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-muted)",
                                                                }}
                                                            >
                                                                Completed
                                                                Lessons
                                                            </p>

                                                            <p
                                                                className="mt-1 font-semibold"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {item?.completedLessons ??
                                                                    0}
                                                            </p>

                                                        </div>

                                                        <div
                                                            className="rounded-lg p-3"
                                                            style={{
                                                                backgroundColor:
                                                                    "var(--color-surface)",
                                                                border:
                                                                    "1px solid var(--color-border)",
                                                            }}
                                                        >

                                                            <p
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-muted)",
                                                                }}
                                                            >
                                                                Enrolled
                                                            </p>

                                                            <p
                                                                className="mt-1 font-semibold"
                                                                style={{
                                                                    color:
                                                                        "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {item?.enrolledAt
                                                                    ? new Date(
                                                                          item.enrolledAt
                                                                      ).toLocaleDateString()
                                                                    : "N/A"}
                                                            </p>

                                                        </div>

                                                    </div>

                                                </div>
                                            );
                                        }
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default GetStudents;