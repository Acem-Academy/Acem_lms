import { Link } from "react-router-dom";
import {
    ArrowRight,
    Clock3,
    User,
    CheckCircle2,
} from "lucide-react";

const CourseCard = ({
    course,
    isEnrolled = false,
}) => {

    const durationInHours =
        Math.round(
            Number(course.duration || 0) / 60
        );

    return (

        <article
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


            {/* ====================================================== */}
            {/* Image */}
            {/* ====================================================== */}

            <Link
                to={`/student/courses/${course._id}`}
                className="block"
            >

                <div className="relative aspect-[16/9] overflow-hidden bg-[#151515]">

                    {course.thumbnail ? (

                        <img
                            src={course.thumbnail}
                            alt={course.title}
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
                                    text-2xl
                                    font-bold
                                    text-[var(--color-primary)]
                                "
                            >
                                {course.title}
                            </span>

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* Enrollment Badge */}
                    {/* ================================================= */}

                    {isEnrolled && (

                        <div
                            className="
                                absolute
                                right-3
                                top-3
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

                            Already Enrolled

                        </div>

                    )}

                </div>

            </Link>


            {/* ====================================================== */}
            {/* Content */}
            {/* ====================================================== */}

            <div className="p-5">


                {/* Course Code + Price */}

                <div className="mb-3 flex items-center justify-between gap-3">

                    <span
                        className="
                            rounded-full
                            border
                            border-[var(--color-primary)]/30
                            bg-[var(--color-primary)]/10
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-[var(--color-primary)]
                        "
                    >
                        {course.courseCode}
                    </span>


                    {isEnrolled ? (

                        <span className="text-sm font-semibold text-[var(--color-primary)]">
                            Enrolled
                        </span>

                    ) : (

                        <span
                            className={`
                                text-sm
                                font-semibold
                                ${
                                    course.price === 0
                                        ? "text-green-400"
                                        : "text-white"
                                }
                            `}
                        >
                            {course.price === 0
                                ? "Free"
                                : `₹${course.price}`}
                        </span>

                    )}

                </div>


                {/* Title */}

                <Link
                    to={`/student/courses/${course._id}`}
                >

                    <h3
                        className="
                            line-clamp-1
                            text-xl
                            font-bold
                            text-white
                            transition
                            group-hover:text-[var(--color-primary)]
                        "
                    >
                        {course.title}
                    </h3>

                </Link>


                {/* Description */}

                <p
                    className="
                        mt-2
                        line-clamp-2
                        text-sm
                        leading-6
                        text-[var(--color-text-muted)]
                    "
                >
                    {course.description}
                </p>


                {/* ================================================== */}
                {/* Course Meta */}
                {/* ================================================== */}

                <div
                    className="
                        mt-4
                        flex
                        flex-wrap
                        items-center
                        gap-4
                        text-xs
                        text-[var(--color-text-muted)]
                    "
                >

                    <span className="flex items-center gap-1.5">

                        <User
                            size={14}
                            className="text-[var(--color-primary)]"
                        />

                        {course.teacher?.fullName ||
                            "Instructor"}

                    </span>


                    <span className="flex items-center gap-1.5">

                        <Clock3
                            size={14}
                            className="text-[var(--color-primary)]"
                        />

                        {durationInHours}h

                    </span>

                </div>


                {/* ================================================== */}
                {/* Action */}
                {/* ================================================== */}

                <div
                    className="
                        mt-5
                        border-t
                        border-[var(--color-border)]
                        pt-4
                    "
                >

                    <Link
                        to={
                            isEnrolled
                                ? `/student/my-learning`
                                : `/student/courses/${course._id}`
                        }
                        className="
                            flex
                            items-center
                            justify-between
                            text-sm
                            font-semibold
                            text-[var(--color-primary)]
                            transition
                            hover:text-[var(--color-primary-dark)]
                        "
                    >

                        {isEnrolled
                            ? "Continue Learning"
                            : "View Course"}

                        <ArrowRight size={17} />

                    </Link>

                </div>

            </div>

        </article>

    );

};

export default CourseCard;