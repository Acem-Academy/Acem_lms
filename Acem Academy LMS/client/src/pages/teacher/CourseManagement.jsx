import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Clock3, BookOpen, Trash2, Edit3, ArrowLeft } from "lucide-react";
import { getCourseById, deleteCourse } from "@/api/course.api";
import { updateCourseStatus } from "@/api/teacher.api";
import { getErrorMessage, showToastSuccess, showToastError } from "@/utils/errorHandler";
import { LoadingSpinner } from "@/components/common/Skeletons";
import ErrorAlert from "@/components/common/ErrorAlert";
import ConfirmModal from "@/components/common/ConfirmModal";

const CourseManagement = () => {
    const navigate = useNavigate();
    const { courseId } = useParams();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusLoading, setStatusLoading] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchCourse = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getCourseById(courseId);
            setCourse(response.data);
        } catch (err) {
            console.error("Failed to fetch course:", err);
            setError(getErrorMessage(err, "Unable to load this course."));
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    const handleStatusChange = async () => {
        try {
            setStatusLoading(true);
            const newStatus = course.status === "published" ? "draft" : "published";
            const response = await updateCourseStatus(courseId, newStatus);
            setCourse(response.data);
            showToastSuccess(
                newStatus === "published"
                    ? "Course published successfully."
                    : "Course moved back to draft."
            );
        } catch (err) {
            console.error("Failed to update course status:", err);
            showToastError(err, "Unable to update course status.");
        } finally {
            setStatusLoading(false);
        }
    };

    const confirmDelete = async () => {
        try {
            setDeleteLoading(true);
            await deleteCourse(courseId);
            showToastSuccess("Course deleted successfully.");
            setDeleteModalOpen(false);
            navigate("/teacher/courses");
        } catch (err) {
            console.error("Failed to delete course:", err);
            showToastError(err, "Unable to delete course.");
        } finally {
            setDeleteLoading(false);
        }
    };

    /* Loading */
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <LoadingSpinner text="Loading course details..." />
            </div>
        );
    }

    /* Error */
    if (error || !course) {
        return (
            <div className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">
                    <Link
                        to="/teacher/courses"
                        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Courses
                    </Link>
                    <ErrorAlert message={error || "Course not found."} onRetry={fetchCourse} />
                </div>
            </div>
        );
    }

    const durationInHours = Math.round((course.duration || 0) / 60);

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-8">
                {/* Header */}
                <section>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/teacher/courses"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] hover:underline"
                        >
                            <ArrowLeft size={14} />
                            My Courses
                        </Link>
                        <span className="text-xs text-[var(--color-text-muted)]">/</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                            Management
                        </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                                {course.title}
                            </h1>
                            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                Manage your course content and settings.
                            </p>
                        </div>

                        <span
                            className={`
                                w-fit
                                rounded-full
                                px-3
                                py-1.5
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
                </section>

                {/* Course Overview */}
                <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    {/* Course Information */}
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="aspect-[16/7] overflow-hidden bg-black">
                            {course.thumbnail ? (
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <BookOpen
                                        size={48}
                                        className="text-[var(--color-primary)]"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-black">
                                    {course.courseCode}
                                </span>

                                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                                    {course.visibility}
                                </span>
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-white">
                                Course Overview
                            </h2>

                            <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
                                {course.description}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-6">
                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Duration
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                                        <Clock3
                                            size={15}
                                            className="text-[var(--color-primary)]"
                                        />
                                        {durationInHours} hours
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        Price
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {course.price === 0
                                            ? "Free"
                                            : `₹${course.price}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Management Actions */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                        <h2 className="text-lg font-bold text-white">
                            Manage Course
                        </h2>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                            Course management options and quick controls.
                        </p>

                        <div className="mt-6 space-y-3">
                            {/* Edit Course */}
                            <Link
                                to={`/teacher/courses/${courseId}/edit`}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-[var(--color-primary)]
                                    px-4
                                    py-3
                                    text-center
                                    text-sm
                                    font-semibold
                                    text-[var(--color-primary)]
                                    transition
                                    hover:bg-[var(--color-primary)]
                                    hover:text-black
                                "
                            >
                                <Edit3 size={16} />
                                Edit Course Details
                            </Link>

                            {/* Publish / Draft */}
                            <button
                                type="button"
                                onClick={handleStatusChange}
                                disabled={statusLoading}
                                className="
                                    w-full
                                    rounded-xl
                                    bg-[var(--color-primary)]
                                    px-4
                                    py-3
                                    text-sm
                                    font-bold
                                    text-black
                                    transition
                                    hover:bg-[var(--color-primary-dark)]
                                    disabled:opacity-50
                                "
                            >
                                {statusLoading
                                    ? "Updating..."
                                    : course.status === "published"
                                        ? "Move to Draft"
                                        : "Publish Course"}
                            </button>

                            {/* Manage Curriculum */}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/teacher/courses/${course._id}/curriculum`)
                                }
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:border-[var(--color-primary)]
                                    hover:text-[var(--color-primary)]
                                "
                            >
                                Manage Curriculum
                            </button>

                            {/* Delete Course */}
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(true)}
                                disabled={deleteLoading}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-red-900/60
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-red-400
                                    transition
                                    hover:bg-red-950/40
                                    disabled:opacity-50
                                "
                            >
                                <Trash2 size={16} />
                                Delete Course
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Course"
                message={`Are you sure you want to delete "${course.title}"? This will permanently remove the course and all associated lessons and materials.`}
                confirmLabel="Delete Course"
                danger={true}
                isLoading={deleteLoading}
            />
        </div>
    );
};

export default CourseManagement;
