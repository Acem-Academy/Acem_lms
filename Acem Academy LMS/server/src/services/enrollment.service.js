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

        existingEnrollment.status = ENROLLMENT_STATUS.ACTIVE;
        existingEnrollment.enrolledAt = new Date();
        existingEnrollment.completedAt = null;
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

    return enrollments;
};

/*
|--------------------------------------------------------------------------
| Get Enrollment By Id
|--------------------------------------------------------------------------
*/

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
    | Find Active Enrollment
    |--------------------------------------------------------------------------
    */

    const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        student: user._id,
        status: ENROLLMENT_STATUS.ACTIVE,
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
        status: ENROLLMENT_STATUS.ACTIVE,
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
    | Get Total Published Lessons In Course
    |--------------------------------------------------------------------------
    */

    const subCourses = await SubCourse.find({
        course: enrollment.course,
        isDeleted: false,
    }).select("_id");

    const subCourseIds = subCourses.map(
        (subCourse) => subCourse._id
    );

    const chapters = await Chapter.find({
        subCourse: { $in: subCourseIds },
        isDeleted: false,
    }).select("_id");

    const chapterIds = chapters.map(
        (chapter) => chapter._id
    );

    const topics = await Topic.find({
        chapter: { $in: chapterIds },
        isDeleted: false,
    }).select("_id");

    const topicIds = topics.map(
        (topic) => topic._id
    );

    const totalLessons = await Lesson.countDocuments({
        topic: { $in: topicIds },
        status: LESSON_STATUS.PUBLISHED,
        isDeleted: false,
    });

    /*
    |--------------------------------------------------------------------------
    | Calculate Course Progress
    |--------------------------------------------------------------------------
    */

    const completedLessons =
        enrollment.completedLessons.length;

    enrollment.progress =
        totalLessons === 0
            ? 0
            : Math.round(
                (completedLessons / totalLessons) * 100
            );

    /*
    |--------------------------------------------------------------------------
    | Course Completed
    |--------------------------------------------------------------------------
    */

    if (enrollment.progress === 100) {

        enrollment.status =
            ENROLLMENT_STATUS.COMPLETED;

        enrollment.completedAt = new Date();
    }

    enrollment.lastAccessedLesson = lesson._id;
    enrollment.updatedBy = user._id;

    await enrollment.save();

    return enrollment;
};

module.exports = {
    enrollStudent,
    getMyCourses,
    getEnrollmentById,
    getAllEnrollments,
    cancelEnrollment,
    startLesson,
    completeLesson,
};

