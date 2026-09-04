import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getCourseById } from "@/api/course.api";
import { updateCourse } from "@/api/teacher.api";

const EditCourse = () => {

    const { courseId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
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


    /* ========================================================= */
    /* Fetch Course */
    /* ========================================================= */

    useEffect(() => {

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
                    teacher: course.teacher?._id || course.teacher || "",
                    visibility: course.visibility || "public",
                });

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

    }, [courseId]);


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
    /* Submit */
    /* ========================================================= */

    const handleSubmit = async (event) => {

        event.preventDefault();

        try {

            setSaving(true);
            setError("");
            setSuccess("");

            await updateCourse(courseId, {
                title: formData.title,
                courseCode: formData.courseCode,
                description: formData.description,
                thumbnail: formData.thumbnail,
                price: Number(formData.price),
                duration: Number(formData.duration),
                teacher: formData.teacher,
                visibility: formData.visibility,
            });

            setSuccess(
                "Course updated successfully."
            );

            setTimeout(() => {

                navigate(
                    `/teacher/courses/${courseId}`
                );

            }, 800);

        } catch (error) {

            console.error(
                "Failed to update course:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Unable to update course."
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
                    to={`/teacher/courses/${courseId}`}
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
                        Edit Course
                    </h1>

                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Update your course information.
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

                            <label className="mb-2 block text-sm font-semibold text-white">
                                Thumbnail URL
                            </label>

                            <input
                                type="text"
                                name="thumbnail"
                                value={formData.thumbnail}
                                onChange={handleChange}
                                placeholder="https://..."
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
                                ? "Saving..."
                                : "Save Changes"}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
};

export default EditCourse;