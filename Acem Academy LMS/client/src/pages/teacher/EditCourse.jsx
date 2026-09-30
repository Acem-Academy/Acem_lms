import { useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Image as ImageIcon,
    Save,
    Upload,
    X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getCourseById } from "@/api/course.api";
import axiosInstance from "@/api/axios";
import { updateCourse } from "@/api/teacher.api";

const EditCourse = () => {

    const { courseId } = useParams();
    const navigate = useNavigate();

    const isCreateMode = !courseId;

    const [loading, setLoading] = useState(!isCreateMode);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        courseCode: "",
        description: "",
        thumbnail: "",
        price: 0,
        duration: 0,
        teacher: "",
        visibility: "public",
    });

    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState("");
    const thumbnailInputRef = useRef(null);


    /* ========================================================= */
    /* Fetch Course */
    /* ========================================================= */

    useEffect(() => {
        if (isCreateMode) {
            setLoading(false);
            setFormData({
                title: "",
                courseCode: "",
                description: "",
                thumbnail: "",
                price: 0,
                duration: 0,
                teacher: "",
                visibility: "public",
            });
            setThumbnailPreview("");
            setThumbnailFile(null);
            return;
        }

        const fetchCourse = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getCourseById(courseId);
                const course = response.data;

                setFormData({
                    title: course.title || "",
                    courseCode: course.courseCode || "",
                    description: course.description || "",
                    thumbnail: course.thumbnail || "",
                    price: course.price || 0,
                    duration: course.duration || 0,
                    teacher:
                        course.teacher?._id ||
                        course.teacher ||
                        "",
                    visibility: course.visibility || "public",
                });

                setThumbnailPreview(course.thumbnail || "");
            } catch (error) {
                console.error(
                    "Failed to fetch course:",
                    error
                );

                setError(
                    "Unable to load course details."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, isCreateMode]);


    /* ========================================================= */
    /* Handle Input */
    /* ========================================================= */

    const handleChange = (event) => {

        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

    };


    /* ========================================================= */
    /* Thumbnail */
    /* ========================================================= */

    const handleThumbnailChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Thumbnail image must be 5 MB or smaller.");
            event.target.value = "";
            return;
        }

        setError("");
        setThumbnailFile(file);

        const previewUrl = URL.createObjectURL(file);
        setThumbnailPreview(previewUrl);
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(formData.thumbnail || "");

        if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = "";
        }
    };


    /* ========================================================= */
    /* Submit */
    /* ========================================================= */

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = new FormData();

            payload.append(
                "title",
                formData.title.trim()
            );
            payload.append(
                "courseCode",
                formData.courseCode.trim().toUpperCase()
            );
            payload.append(
                "description",
                formData.description.trim()
            );
            payload.append(
                "price",
                String(Number(formData.price) || 0)
            );
            payload.append(
                "duration",
                String(Number(formData.duration) || 0)
            );
            payload.append(
                "visibility",
                formData.visibility
            );

            if (formData.teacher) {
                payload.append(
                    "teacher",
                    formData.teacher
                );
            }

            if (thumbnailFile) {
                payload.append(
                    "thumbnail",
                    thumbnailFile
                );
            } else if (!isCreateMode && formData.thumbnail) {
                payload.append(
                    "thumbnailUrl",
                    formData.thumbnail
                );
            }

            let response;

            if (isCreateMode) {
                response = await axiosInstance.post(
                    "/courses",
                    payload
                );
            } else {
                response = await axiosInstance.patch(
                    `/courses/${courseId}`,
                    payload
                );
            }

            const savedCourse =
                response?.data?.data ||
                response?.data;

            const savedCourseId =
                savedCourse?._id || courseId;

            setSuccess(
                isCreateMode
                    ? "Course created successfully."
                    : "Course updated successfully."
            );

            setTimeout(() => {
                navigate(
                    `/teacher/courses/${savedCourseId}`
                );
            }, 700);
        } catch (error) {
            console.error(
                isCreateMode
                    ? "Failed to create course:"
                    : "Failed to update course:",
                error
            );

            setError(
                error?.response?.data?.message ||
                (isCreateMode
                    ? "Unable to create course."
                    : "Unable to update course.")
            );
        } finally {
            setSaving(false);
        }
    };


    /* ========================================================= */
    /* Loading */
    /* ========================================================= */

    if (loading) {

        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-black text-white">

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

                    Loading course...

                </div>

            </div>
        );

    }


    return (

        <div className="min-h-screen bg-black text-white">

            <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">

                {/* ================================================= */}
                {/* Back */}
                {/* ================================================= */}

                <Link
                    to={
                        isCreateMode
                            ? "/teacher/courses"
                            : `/teacher/courses/${courseId}`
                    }
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-medium
                        text-[var(--color-text-muted)]
                        transition
                        hover:text-[var(--color-primary)]
                    "
                >
                    <ArrowLeft size={17} />
                    Back to Course
                </Link>


                {/* ================================================= */}
                {/* Header */}
                {/* ================================================= */}

                <div className="mt-6">

                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                        Course Management
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                        {isCreateMode
                            ? "Create Course"
                            : "Edit Course"}
                    </h1>

                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        {isCreateMode
                            ? "Create a new course and start building its curriculum."
                            : "Update your course information."}
                    </p>

                </div>


                {/* ================================================= */}
                {/* Alerts */}
                {/* ================================================= */}

                {error && (

                    <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
                        {error}
                    </div>

                )}

                {success && (

                    <div className="mt-6 rounded-xl border border-green-900 bg-green-950/30 p-4 text-sm text-green-400">
                        {success}
                    </div>

                )}


                {/* ================================================= */}
                {/* Form */}
                {/* ================================================= */}

                <form
                    onSubmit={handleSubmit}
                    className="
                        mt-8
                        rounded-2xl
                        border
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        p-6
                        md:p-8
                    "
                >

                    <div className="grid gap-6 md:grid-cols-2">

                        {/* Title */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Course Title
                            </label>

                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    text-white
                                    outline-none
                                    transition
                                    focus:border-[var(--color-primary)]
                                "
                            />

                        </div>


                        {/* Course Code */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Course Code
                            </label>

                            <input
                                type="text"
                                name="courseCode"
                                value={formData.courseCode}
                                onChange={handleChange}
                                required
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    uppercase
                                    text-white
                                    outline-none
                                    focus:border-[var(--color-primary)]
                                "
                            />

                        </div>


                        {/* Price */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Price
                            </label>

                            <input
                                type="number"
                                name="price"
                                min="0"
                                value={formData.price}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    text-white
                                    outline-none
                                    focus:border-[var(--color-primary)]
                                "
                            />

                        </div>


                        {/* Duration */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Duration (Minutes)
                            </label>

                            <input
                                type="number"
                                name="duration"
                                min="0"
                                value={formData.duration}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    text-white
                                    outline-none
                                    focus:border-[var(--color-primary)]
                                "
                            />

                        </div>


                        {/* Visibility */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Visibility
                            </label>

                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    text-white
                                    outline-none
                                    focus:border-[var(--color-primary)]
                                "
                            >

                                <option value="public">
                                    Public
                                </option>

                                <option value="private">
                                    Private
                                </option>

                            </select>

                        </div>


                        {/* Thumbnail */}

                        <div className="md:col-span-2">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-sm font-semibold text-white">
                                    Course Thumbnail
                                </label>

                                <span className="text-xs text-[var(--color-text-muted)]">
                                    JPG, PNG or WEBP • Max 5 MB
                                </span>
                            </div>

                            <div
                                className="
                                    overflow-hidden rounded-2xl
                                    border border-[var(--color-border)]
                                    bg-black
                                "
                            >
                                {thumbnailPreview ? (
                                    <div className="relative">
                                        <img
                                            src={thumbnailPreview}
                                            alt="Course thumbnail preview"
                                            className="
                                                h-56 w-full object-cover
                                                sm:h-64
                                            "
                                        />

                                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white">
                                                    {thumbnailFile
                                                        ? thumbnailFile.name
                                                        : "Current course thumbnail"}
                                                </p>
                                                <p className="mt-1 text-xs text-white/60">
                                                    {thumbnailFile
                                                        ? "New image selected"
                                                        : "Existing image"}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        thumbnailInputRef.current?.click()
                                                    }
                                                    className="
                                                        inline-flex items-center
                                                        gap-2 rounded-lg
                                                        border border-white/20
                                                        bg-black/70 px-3 py-2
                                                        text-xs font-semibold
                                                        text-white transition
                                                        hover:bg-black
                                                    "
                                                >
                                                    <Upload size={14} />
                                                    Change
                                                </button>

                                                {thumbnailFile && (
                                                    <button
                                                        type="button"
                                                        onClick={removeThumbnail}
                                                        className="
                                                            flex h-9 w-9 items-center
                                                            justify-center rounded-lg
                                                            border border-red-400/30
                                                            bg-red-500/10 text-red-300
                                                            transition hover:bg-red-500/20
                                                        "
                                                        title="Remove selected image"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            thumbnailInputRef.current?.click()
                                        }
                                        className="
                                            flex min-h-56 w-full flex-col
                                            items-center justify-center
                                            px-6 py-10 text-center
                                            transition hover:bg-white/[0.02]
                                        "
                                    >
                                        <div
                                            className="
                                                flex h-14 w-14 items-center
                                                justify-center rounded-2xl
                                                bg-[var(--color-primary)]/10
                                                text-[var(--color-primary)]
                                            "
                                        >
                                            <ImageIcon size={25} />
                                        </div>

                                        <p className="mt-4 text-sm font-semibold text-white">
                                            Upload course thumbnail
                                        </p>

                                        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
                                            Choose an image that represents your
                                            course. Recommended landscape format.
                                        </p>

                                        <span
                                            className="
                                                mt-4 inline-flex items-center
                                                gap-2 rounded-lg border
                                                border-[var(--color-border)]
                                                bg-[var(--color-surface)]
                                                px-3.5 py-2 text-xs font-semibold
                                                text-white
                                            "
                                        >
                                            <Upload size={14} />
                                            Choose Image
                                        </span>
                                    </button>
                                )}

                                <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleThumbnailChange}
                                    className="hidden"
                                />
                            </div>
                        </div>


                        {/* Description */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Description
                            </label>

                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={6}
                                className="
                                    w-full
                                    resize-none
                                    rounded-xl
                                    border
                                    border-[var(--color-border)]
                                    bg-black
                                    px-4
                                    py-3
                                    text-sm
                                    leading-6
                                    text-white
                                    outline-none
                                    focus:border-[var(--color-primary)]
                                "
                            />

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* Submit */}
                    {/* ================================================= */}

                    <div className="mt-8 flex justify-end border-t border-[var(--color-border)] pt-6">

                        <button
                            type="submit"
                            disabled={saving}
                            className="
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
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >

                            <Save size={17} />

                            {saving
                                ? isCreateMode
                                    ? "Creating..."
                                    : "Saving..."
                                : isCreateMode
                                    ? "Create Course"
                                    : "Save Changes"}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
};

export default EditCourse;