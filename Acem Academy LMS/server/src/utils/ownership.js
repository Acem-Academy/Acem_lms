const ApiError = require("./ApiError");

const ROLES = require("../constants/roles");

const Course = require("../models/course.model");
const SubCourse = require("../models/subCourse.model");
const Chapter = require("../models/chapter.model");
const Topic = require("../models/topic.model");
const Lesson = require("../models/lesson.model");
const Enrollment = require("../models/enrollment.model");

const {
    ENROLLMENT_STATUS,
} = require("../constants/enrollment.constants");

const OWNERSHIP_DENIED_MESSAGE =
    "You are not allowed to perform this action on this resource.";

/*
|--------------------------------------------------------------------------
| Resolve Owning Course
|--------------------------------------------------------------------------
|
| Walks the curriculum chain up to the owning Course:
|
|   lesson -> topic -> chapter -> subCourse -> course
|
| type may be one of:
|   "course" | "subCourse" | "chapter" | "topic" | "lesson"
|
| Returns the Course document, or null when the chain cannot be resolved.
|
*/

const resolveOwningCourse = async (type, id) => {

    if (type === "course") {

        return await Course.findById(id);

    }

    if (type === "subCourse") {

        const subCourse = await SubCourse.findById(id);

        if (!subCourse) {
            return null;
        }

        return await Course.findById(subCourse.course);

    }

    if (type === "chapter") {

        const chapter = await Chapter.findById(id);

        if (!chapter) {
            return null;
        }

        const subCourse = await SubCourse.findById(
            chapter.subCourse
        );

        if (!subCourse) {
            return null;
        }

        return await Course.findById(subCourse.course);

    }

    if (type === "topic") {

        const topic = await Topic.findById(id);

        if (!topic) {
            return null;
        }

        const chapter = await Chapter.findById(
            topic.chapter
        );

        if (!chapter) {
            return null;
        }

        const subCourse = await SubCourse.findById(
            chapter.subCourse
        );

        if (!subCourse) {
            return null;
        }

        return await Course.findById(subCourse.course);

    }

    if (type === "lesson") {

        const lesson = await Lesson.findById(id);

        if (!lesson) {
            return null;
        }

        const topic = await Topic.findById(lesson.topic);

        if (!topic) {
            return null;
        }

        const chapter = await Chapter.findById(
            topic.chapter
        );

        if (!chapter) {
            return null;
        }

        const subCourse = await SubCourse.findById(
            chapter.subCourse
        );

        if (!subCourse) {
            return null;
        }

        return await Course.findById(subCourse.course);

    }

    return null;

};

/*
|--------------------------------------------------------------------------
| Assert Curriculum Ownership
|--------------------------------------------------------------------------
|
| Same rule as the existing Course service ownership check:
|
|   user.role === TEACHER && course.teacher !== user._id  ->  403
|
| Only teachers are restricted. Admin keeps its broader access and students
| keep the curriculum read access they already have.
|
| type is the resource (or its parent for create) whose owner must match:
|   "course" | "subCourse" | "chapter" | "topic" | "lesson"
|
*/

const assertCurriculumOwnership = async (
    type,
    id,
    user
) => {

    if (!user || user.role !== ROLES.TEACHER) {
        return;
    }

    const course = await resolveOwningCourse(type, id);

    if (!course) {
        throw new ApiError(
            404,
            "Course not found."
        );
    }

    const ownerId = course.teacher
        ? course.teacher.toString()
        : "";

    const actingUserId = user._id
        ? user._id.toString()
        : "";

    if (!ownerId || ownerId !== actingUserId) {
        throw new ApiError(
            403,
            OWNERSHIP_DENIED_MESSAGE
        );
    }

};

/*
|--------------------------------------------------------------------------
| Assert Lesson Read Access
|--------------------------------------------------------------------------
|
| Read rule for GET /lessons/:lessonId (and the quiz submit endpoint):
|
|   admin   -> always allowed
|   teacher -> same course ownership rule as the C3 write checks
|   student -> must hold an enrollment in the owning course whose
|              status is NOT cancelled
|
| Completed enrollments must keep access, so only cancelled is rejected.
| This mirrors getMyCourses, which lists every non-cancelled enrollment.
|
*/

const assertLessonReadAccess = async (
    type,
    id,
    user
) => {

    if (!user) {
        return;
    }

    if (user.role === ROLES.ADMIN) {
        return;
    }

    if (user.role === ROLES.TEACHER) {
        await assertCurriculumOwnership(
            type,
            id,
            user
        );
        return;
    }

    if (user.role !== ROLES.STUDENT) {
        return;
    }

    const course = await resolveOwningCourse(
        type,
        id
    );

    if (!course) {
        throw new ApiError(
            404,
            "Course not found."
        );
    }

    const enrollment = await Enrollment.findOne({
        student: user._id,
        course: course._id,
        status: {
            $ne: ENROLLMENT_STATUS.CANCELLED,
        },
    });

    if (!enrollment) {
        throw new ApiError(
            403,
            OWNERSHIP_DENIED_MESSAGE
        );
    }

};

module.exports = {
    assertCurriculumOwnership,
    assertLessonReadAccess,
    OWNERSHIP_DENIED_MESSAGE,
};
