const Enrollment = require("../models/enrollment.model");
const Course = require("../models/course.model");
const Lesson = require("../models/lesson.model");
const Topic = require("../models/topic.model");
const Chapter = require("../models/chapter.model");
const SubCourse = require("../models/subCourse.model");


const ApiError = require("../utils/ApiError");

const {
    COURSE_STATUS,
} = require("../constants/course.constants");

const {
    ENROLLMENT_STATUS,
} = require("../constants/enrollment.constants");

const {
    LESSON_STATUS,
} = require("../constants/lesson.constants");

/*
|--------------------------------------------------------------------------
| Enroll Student
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Enroll Student
|--------------------------------------------------------------------------
*/

const enrollStudent = async (
    enrollmentData,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Check Course Exists
    |--------------------------------------------------------------------------
    */

    const course = await Course.findOne({
        _id: enrollmentData.course,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(
            404,
            "Course not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Course Published
    |--------------------------------------------------------------------------
    */

    if (course.status !== COURSE_STATUS.PUBLISHED) {
        throw new ApiError(
            400,
            "This course is not available for enrollment."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Already Enrolled
    |--------------------------------------------------------------------------
    */

   const existingEnrollment = await Enrollment.findOne({
    student: user._id,
    course: course._id,
});

if (existingEnrollment) {

    // Student cancelled earlier, allow re-enrollment
    if (existingEnrollment.status === ENROLLMENT_STATUS.CANCELLED) {

        /*
        |----------------------------------------------------------------------
        | Restart The Course
        |----------------------------------------------------------------------
        |
        | Re-enrollment is an explicit restart (this branch already resets
        | enrolledAt/completedAt), so the previous attempt's progress must be
        | cleared as well; otherwise the current curriculum would immediately
        | re-derive 100% and the cancelled course would unexpectedly reopen
        | as completed. This is the only flow that resets completion state.
        |
        */

        existingEnrollment.status = ENROLLMENT_STATUS.ACTIVE;
        existingEnrollment.enrolledAt = new Date();
        existingEnrollment.completedAt = null;
        existingEnrollment.progress = 0;
        existingEnrollment.completedLessons = [];
        existingEnrollment.lastAccessedLesson = null;
        existingEnrollment.updatedBy = user._id;

        await existingEnrollment.save();

        return existingEnrollment;
    }

    throw new ApiError(
        409,
        "You are already enrolled in this course."
    );
}
    /*
    |--------------------------------------------------------------------------
    | Create Enrollment
    |--------------------------------------------------------------------------
    */

    const enrollment = await Enrollment.create({

        student: user._id,

        course: course._id,

        createdBy: user._id,

        updatedBy: user._id,

    });

    /*
    |--------------------------------------------------------------------------
    | Return Enrollment
    |--------------------------------------------------------------------------
    */

    return enrollment;

};

/*
|--------------------------------------------------------------------------
| Get My Courses
|--------------------------------------------------------------------------
*/

const getMyCourses = async (user) => {

    const enrollments = await Enrollment.find({
        student: user._id,
        status: {
            $ne: ENROLLMENT_STATUS.CANCELLED,
        },
    })
        .populate(
            "course",
            "title courseCode description thumbnail price duration teacher"
        )
        .sort({
            createdAt: -1,
        });

    /*
    |--------------------------------------------------------------------------
    | Re-derive Progress For Each Enrollment
    |--------------------------------------------------------------------------
    |
    | The curriculum may have changed (lessons added, published, removed)
    | since the last visit, so refresh the stored progress against the
    | current published lessons before returning it.
    |
    */

    for (const enrollment of enrollments) {

        const courseId = courseIdOf(enrollment);

        if (!courseId) {
            continue;
        }

        const snapshotUpdatedAt = enrollment.updatedAt;

        const publishedLessonIds =
            await getPublishedLessonIdsForCourse(courseId);

        if (
            syncEnrollmentProgress(
                enrollment,
                publishedLessonIds
            )
        ) {
            await persistEnrollmentSync(
                enrollment,
                snapshotUpdatedAt
            );
        }
    }

    return enrollments;
};

/*
|--------------------------------------------------------------------------
| Get Enrollment By Id
|--------------------------------------------------------------------------
*/

const getEnrollmentById = async (
    enrollmentId,
    user
) => {

    const enrollment = await Enrollment.findById(enrollmentId)
        .populate("course")
        .populate("student", "fullName email role");

    if (!enrollment) {
        throw new ApiError(
            404,
            "Enrollment not found."
        );
    }

    // Student can only access their own enrollment
    if (
        user.role !== "admin" &&
        enrollment.student._id.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to access this enrollment."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Re-derive Progress Against The Current Published Curriculum
    |--------------------------------------------------------------------------
    */

    const courseId = courseIdOf(enrollment);

    if (courseId) {

        const snapshotUpdatedAt = enrollment.updatedAt;

        const publishedLessonIds =
            await getPublishedLessonIdsForCourse(courseId);

        if (
            syncEnrollmentProgress(
                enrollment,
                publishedLessonIds
            )
        ) {
            await persistEnrollmentSync(
                enrollment,
                snapshotUpdatedAt
            );
        }
    }

    return enrollment;

};
/*
|--------------------------------------------------------------------------
| Get All Enrollments
|--------------------------------------------------------------------------
*/

const getAllEnrollments = async () => {

    const enrollments = await Enrollment.find()
        .populate(
            "student",
            "fullName email"
        )
        .populate(
            "course",
            "title courseCode thumbnail"
        )
        .sort({
            createdAt: -1,
        });

    return enrollments;

};

/*
|--------------------------------------------------------------------------
| Cancel Enrollment
|--------------------------------------------------------------------------
*/

const cancelEnrollment = async (
    enrollmentId,
    user
) => {

    const enrollment = await Enrollment.findById(
        enrollmentId
    );

    if (!enrollment) {
        throw new ApiError(
            404,
            "Enrollment not found."
        );
    }

    // Student can cancel only their own enrollment
    if (
        enrollment.student.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to cancel this enrollment."
        );
    }

    if (
        enrollment.status === ENROLLMENT_STATUS.CANCELLED
    ) {
        throw new ApiError(
            400,
            "Enrollment is already cancelled."
        );
    }

    enrollment.status = ENROLLMENT_STATUS.CANCELLED;

    enrollment.updatedBy = user._id;

    enrollment.completedAt = null;

    await enrollment.save();

    return enrollment;

};


/*
|--------------------------------------------------------------------------
| Progress Helpers
|--------------------------------------------------------------------------
|
| Enrollment progress is always derived from the CURRENT published
| curriculum, never trusted from a stale stored value: adding, publishing,
| unpublishing or removing lessons changes the denominator, so a course may
| need to be reopened or re-completed. Historical completedLessons entries
| are preserved untouched (nothing is ever deleted from history).
|
*/

const courseIdOf = (enrollment) =>
    enrollment.course && enrollment.course._id
        ? enrollment.course._id
        : enrollment.course;

const getPublishedLessonIdsForCourse = async (courseId) => {

    const subCourses = await SubCourse.find({
        course: courseId,
        isDeleted: false,
    }).select("_id");

    const chapters = await Chapter.find({
        subCourse: {
            $in: subCourses.map(
                (subCourse) => subCourse._id
            ),
        },
        isDeleted: false,
    }).select("_id");

    const topics = await Topic.find({
        chapter: {
            $in: chapters.map(
                (chapter) => chapter._id
            ),
        },
        isDeleted: false,
    }).select("_id");

    const lessons = await Lesson.find({
        topic: {
            $in: topics.map(
                (topic) => topic._id
            ),
        },
        status: LESSON_STATUS.PUBLISHED,
        isDeleted: false,
    }).select("_id");

    return lessons.map(
        (lesson) => lesson._id.toString()
    );
};

/*
|--------------------------------------------------------------------------
| Sync Enrollment Progress + Status
|--------------------------------------------------------------------------
|
| Mutates the enrollment in memory and reports whether anything changed so
| callers can avoid needless writes. Only completed lessons that are still
| part of the published curriculum count.
|
*/

const syncEnrollmentProgress = (
    enrollment,
    publishedLessonIds
) => {

    /*
    |--------------------------------------------------------------------------
    | Cancelled / Suspended Enrollments Are Frozen
    |--------------------------------------------------------------------------
    |
    | These statuses are terminal/managed outside the learning flow, so their
    | progress and completion metadata must not be re-derived. Touching them
    | could leave a row with e.g. progress < 100 while completedAt is still
    | set (inconsistent status/completion metadata), so leave them untouched.
    |
    */

    if (
        enrollment.status === ENROLLMENT_STATUS.CANCELLED ||
        enrollment.status === ENROLLMENT_STATUS.SUSPENDED
    ) {
        return false;
    }

    const publishedSet =
        publishedLessonIds instanceof Set
            ? publishedLessonIds
            : new Set(publishedLessonIds);

    const totalLessons = publishedSet.size;

    const completedLessons =
        enrollment.completedLessons.filter(
            (completedLesson) =>
                publishedSet.has(
                    completedLesson.toString()
                )
        ).length;

    const progress =
        totalLessons === 0
            ? 0
            : Math.round(
                (completedLessons / totalLessons) * 100
            );

    const previousProgress = enrollment.progress;
    const previousStatus = enrollment.status;
    const previousCompletedAt = enrollment.completedAt
        ? enrollment.completedAt.getTime()
        : null;

    enrollment.progress = progress;

    if (progress >= 100) {
        enrollment.status = ENROLLMENT_STATUS.COMPLETED;
        if (!enrollment.completedAt) {
            enrollment.completedAt = new Date();
        }
    } else {
        enrollment.status = ENROLLMENT_STATUS.ACTIVE;
        enrollment.completedAt = null;
    }

    const nextCompletedAt = enrollment.completedAt
        ? enrollment.completedAt.getTime()
        : null;

    return (
        enrollment.progress !== previousProgress ||
        enrollment.status !== previousStatus ||
        nextCompletedAt !== previousCompletedAt
    );
};

/*
|--------------------------------------------------------------------------
| Persist Synced Progress (Concurrency-Safe)
|--------------------------------------------------------------------------
|
| Read paths re-derive progress from a snapshot and write it back. A plain
| save() would let a snapshot taken before a concurrent completeLesson/start
| overwrite that newer write (lost update), reverting a just-finished lesson.
| Guard the write on the row's updatedAt so it only applies when the row has
| not changed since it was read. Returns whether the write was applied.
|
*/

const persistEnrollmentSync = async (
    enrollment,
    snapshotUpdatedAt
) => {

    const filter = {
        _id: enrollment._id,
    };

    if (snapshotUpdatedAt) {
        filter.updatedAt = snapshotUpdatedAt;
    }

    const result = await Enrollment.updateOne(
        filter,
        {
            $set: {
                progress: enrollment.progress,
                status: enrollment.status,
                completedAt: enrollment.completedAt,
            },
        }
    );

    return result.matchedCount === 1;
};

/*
|--------------------------------------------------------------------------
| Start Lesson
|--------------------------------------------------------------------------
*/

const startLesson = async (
    enrollmentId,
    lessonId,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Find Enrollment (active or previously completed)
    |--------------------------------------------------------------------------
    */

    const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        student: user._id,
        status: {
            $in: [
                ENROLLMENT_STATUS.ACTIVE,
                ENROLLMENT_STATUS.COMPLETED,
            ],
        },
    });

    if (!enrollment) {
        throw new ApiError(
            404,
            "Active enrollment not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Lesson
    |--------------------------------------------------------------------------
    */

    const lesson = await Lesson.findOne({
    _id: lessonId,
    isDeleted: false,
    status: LESSON_STATUS.PUBLISHED,
});

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Topic
    |--------------------------------------------------------------------------
    */

    const topic = await Topic.findOne({
        _id: lesson.topic,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Chapter
    |--------------------------------------------------------------------------
    */

    const chapter = await Chapter.findOne({
        _id: topic.chapter,
        isDeleted: false,
    });

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Sub Course
    |--------------------------------------------------------------------------
    */

    const subCourse = await SubCourse.findOne({
        _id: chapter.subCourse,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Course
    |--------------------------------------------------------------------------
    */

    if (
        subCourse.course.toString() !==
        enrollment.course.toString()
    ) {
        throw new ApiError(
            403,
            "This lesson does not belong to your enrolled course."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Re-derive Progress Against The Current Published Curriculum
    |--------------------------------------------------------------------------
    */

    const publishedLessonIds =
        await getPublishedLessonIdsForCourse(
            courseIdOf(enrollment)
        );

    syncEnrollmentProgress(
        enrollment,
        publishedLessonIds
    );

    /*
    |--------------------------------------------------------------------------
    | Update Last Accessed Lesson
    |--------------------------------------------------------------------------
    */

    enrollment.lastAccessedLesson = lesson._id;
    enrollment.updatedBy = user._id;

    await enrollment.save();

    return {
        lesson,
        enrollment,
    };
};


/*
|--------------------------------------------------------------------------
| Complete Lesson
|--------------------------------------------------------------------------
*/

const completeLesson = async (
    enrollmentId,
    lessonId,
    user
) => {

    /*
    |--------------------------------------------------------------------------
    | Find Active Enrollment
    |--------------------------------------------------------------------------
    */

    const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        student: user._id,
        status: {
            $in: [
                ENROLLMENT_STATUS.ACTIVE,
                ENROLLMENT_STATUS.COMPLETED,
            ],
        },
    });

    if (!enrollment) {
        throw new ApiError(
            404,
            "Active enrollment not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Lesson
    |--------------------------------------------------------------------------
    */

    const lesson = await Lesson.findOne({
        _id: lessonId,
        isDeleted: false,
        status: LESSON_STATUS.PUBLISHED,
    });

    if (!lesson) {
        throw new ApiError(
            404,
            "Lesson not found."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Lesson Belongs To Enrolled Course
    |--------------------------------------------------------------------------
    */

    const topic = await Topic.findOne({
        _id: lesson.topic,
        isDeleted: false,
    });

    if (!topic) {
        throw new ApiError(
            404,
            "Topic not found."
        );
    }

    const chapter = await Chapter.findOne({
        _id: topic.chapter,
        isDeleted: false,
    });

    if (!chapter) {
        throw new ApiError(
            404,
            "Chapter not found."
        );
    }

    const subCourse = await SubCourse.findOne({
        _id: chapter.subCourse,
        isDeleted: false,
    });

    if (!subCourse) {
        throw new ApiError(
            404,
            "Sub Course not found."
        );
    }

    if (
        subCourse.course.toString() !==
        enrollment.course.toString()
    ) {
        throw new ApiError(
            403,
            "This lesson does not belong to your enrolled course."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Add Lesson To Completed Lessons
    |--------------------------------------------------------------------------
    */

    const alreadyCompleted =
        enrollment.completedLessons.some(
            (completedLesson) =>
                completedLesson.toString() ===
                lesson._id.toString()
        );

    if (!alreadyCompleted) {
        enrollment.completedLessons.push(
            lesson._id
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Re-derive Progress Against The Current Published Curriculum
    |--------------------------------------------------------------------------
    |
    | Only completed lessons that are still part of the current published
    | curriculum count. Historical completions are preserved in
    | completedLessons (never deleted), but lessons that were later
    | unpublished/removed no longer count, so progress can never exceed
    | 100% and course completion is not blocked. This also reopens a
    | previously completed course when new lessons are published.
    |
    */

    const publishedLessonIds =
        await getPublishedLessonIdsForCourse(
            courseIdOf(enrollment)
        );

    syncEnrollmentProgress(
        enrollment,
        publishedLessonIds
    );

    enrollment.lastAccessedLesson = lesson._id;
    enrollment.updatedBy = user._id;

    await enrollment.save();

    return enrollment;
};


/*
|--------------------------------------------------------------------------
| Get Teacher Students
|--------------------------------------------------------------------------
|
| Returns students enrolled in courses created by the logged-in teacher.
|
| Only ACTIVE and COMPLETED enrollments are included.
|
*/

const getTeacherStudents = async (teacherId) => {

    /*
    |--------------------------------------------------------------------------
    | Find Courses Created By Teacher
    |--------------------------------------------------------------------------
    */

    const teacherCourses = await Course.find({
        teacher: teacherId,
        isDeleted: false,
    }).select("_id title courseCode thumbnail");

    if (!teacherCourses.length) {
        return [];
    }

    const courseIds = teacherCourses.map(
        (course) => course._id
    );

    /*
    |--------------------------------------------------------------------------
    | Find Active / Completed Enrollments
    |--------------------------------------------------------------------------
    */

    const enrollments = await Enrollment.find({
        course: {
            $in: courseIds,
        },

        status: {
            $in: [
                ENROLLMENT_STATUS.ACTIVE,
                ENROLLMENT_STATUS.COMPLETED,
            ],
        },
    })
        .populate(
            "student",
            "fullName email avatar status"
        )
        .populate(
            "course",
            "title courseCode thumbnail"
        )
        .sort({
            createdAt: -1,
        });

    /*
    |--------------------------------------------------------------------------
    | Group Enrollments By Student
    |--------------------------------------------------------------------------
    |
    | If one student is enrolled in multiple courses belonging to the
    | same teacher, the student appears only once.
    |
    */

    const studentsMap = new Map();

    /*
    |--------------------------------------------------------------------------
    | Refresh Progress Against The Current Published Curriculum
    |--------------------------------------------------------------------------
    |
    | Progress is otherwise only synced when the student reads their own
    | enrollment, so a teacher would see a stale value after the curriculum
    | changes (e.g. a new lesson published). Re-derive per course, caching the
    | published lesson ids so repeated courses in the same request are cheap.
    |
    */

    const publishedByCourse = new Map();

    for (const enrollment of enrollments) {

        if (!enrollment.student) {
            continue;
        }

        const courseId = courseIdOf(enrollment);

        if (courseId) {

            const cacheKey = String(courseId);

            if (!publishedByCourse.has(cacheKey)) {
                publishedByCourse.set(
                    cacheKey,
                    await getPublishedLessonIdsForCourse(courseId)
                );
            }

            const snapshotUpdatedAt = enrollment.updatedAt;

            if (
                syncEnrollmentProgress(
                    enrollment,
                    publishedByCourse.get(cacheKey)
                )
            ) {
                await persistEnrollmentSync(
                    enrollment,
                    snapshotUpdatedAt
                );
            }
        }

        const studentId =
            enrollment.student._id.toString();

        if (!studentsMap.has(studentId)) {

            studentsMap.set(studentId, {
                student: enrollment.student,
                courses: [],
                totalCourses: 0,
            });

        }

        const studentData =
            studentsMap.get(studentId);

        studentData.courses.push({
            enrollmentId: enrollment._id,
            course: enrollment.course,
            status: enrollment.status,
            progress: enrollment.progress,
            completedLessons:
                enrollment.completedLessons.length,
            lastAccessedLesson:
                enrollment.lastAccessedLesson,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
        });

        studentData.totalCourses =
            studentData.courses.length;
    }

    return Array.from(
        studentsMap.values()
    );
};

module.exports = {
    enrollStudent,
    getMyCourses,
    getEnrollmentById,
    getAllEnrollments,
    cancelEnrollment,
    startLesson,
    completeLesson,
    getTeacherStudents,
    persistEnrollmentSync,
};

