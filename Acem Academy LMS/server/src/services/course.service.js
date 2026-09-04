const Course = require("../models/course.model");
const ApiError = require("../utils/ApiError");
const STATUS = require("../constants/status");
const ROLES = require("../constants/roles");

const {
    COURSE_STATUS,
} = require("../constants/course.constants");

/* -------------------------------------------------------------------------- */
/*                              Create Course                                 */
/* -------------------------------------------------------------------------- */

const createCourse = async (courseData, user) => {

    const existingCourse = await Course.findOne({
        courseCode: courseData.courseCode,
        isDeleted: false,
    });

    if (existingCourse) {
        throw new ApiError(409, "Course code already exists");
    }

    const course = await Course.create({
        ...courseData,
        createdBy: user._id,
        updatedBy: user._id,
    });

    return course;

};

/* -------------------------------------------------------------------------- */
/*                               Get Courses                                  */
/* -------------------------------------------------------------------------- */

const getCourses = async () => {

    return await Course.find({
        isDeleted: false,
    })
        .populate("teacher", "fullName email")
        .sort({ createdAt: -1 });

};


/* -------------------------------------------------------------------------- */
/*                            Get My Courses                                  */
/* -------------------------------------------------------------------------- */

const getMyCourses = async (teacherId) => {

    return await Course.find({
        teacher: teacherId,
        isDeleted: false,
    })
        .populate("teacher", "fullName email")
        .sort({ createdAt: -1 });

};


/* -------------------------------------------------------------------------- */
/*                             Get Course By Id                               */
/* -------------------------------------------------------------------------- */

const getCourseById = async (courseId) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    }).populate("teacher", "fullName email");

    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    return course;

};

/* -------------------------------------------------------------------------- */
/*                               Update Course                                */
/* -------------------------------------------------------------------------- */

const updateCourse = async (courseId, body, user) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to update this course"
        );
    }

    if (
        body.courseCode &&
        body.courseCode !== course.courseCode
    ) {

        const existingCourse = await Course.findOne({
            courseCode: body.courseCode,
            isDeleted: false,
            _id: { $ne: courseId },
        });

        if (existingCourse) {
            throw new ApiError(409, "Course code already exists");
        }

    }

    await Course.findByIdAndUpdate(
        courseId,
        {
            ...body,
            updatedBy: user._id,
        },
        {
            new: true,
        }
    );

    return await Course.findById(courseId)
        .populate("teacher", "fullName email");

};

/* -------------------------------------------------------------------------- */
/*                               Delete Course                                */
/* -------------------------------------------------------------------------- */

const deleteCourse = async (courseId, user) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to delete this course"
        );
    }

    await Course.findByIdAndUpdate(courseId, {
        isDeleted: true,
        updatedBy: user._id,
    });

};

/* -------------------------------------------------------------------------- */
/*                              Publish Course                                */
/* -------------------------------------------------------------------------- */

const publishCourse = async (courseId, body, user) => {

    const course = await Course.findOne({
        _id: courseId,
        isDeleted: false,
    });

    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    if (
        user.role === ROLES.TEACHER &&
        course.teacher.toString() !== user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to publish this course"
        );
    }

    course.status = body.status || COURSE_STATUS.PUBLISHED;
    course.updatedBy = user._id;

    await course.save();

    return course;

};

module.exports = {
    createCourse,
    getCourses,
     getMyCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    publishCourse,
};